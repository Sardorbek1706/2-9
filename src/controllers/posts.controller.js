import { db } from "../helpers/index.js"
import { slugify } from "../helpers/index.js"
import { v4 as uuidv4 } from 'uuid'
import { postfile, userfile } from "../helpers/index.js"

// POSTS
/*
  0. ID - string (unique)
  1. CATEGORIES - array of strings required
  2. CREATED_AT - date required
  3. UPDATED_AT - date 
  4. AUTHOR_ID - string (user id) required
  5. VIEWS - number  || 0
  6. LIKES - number || 0
  7. LIKED_BY - array of user ids || []
  8. SUMMARY - string (max 200 chars), required
  9. CONTENT - string required
  10. TITLE - string required 
  11. SLUG - string (unique) 
  12. STATUS - string (draft, published, archived)

  title = Nega biznesga juniorlar kerak: nega aynan siz ekaningizni qanday isbotlash mumkin?
  slug = nega-biznesga-juniorlar-kerak-nega-aynan-siz-ekanligingizni-qanday-isbotlash-mumkin
  https://mohirdev.uz/blog/nega-biznesga-juniorlar-kerak/
*/

//example post object
/*
{
  "id": "1",
  "categories": ["business", "career"],
  "created_at": "2023-10-01T10:00:00Z",
  "updated_at": "2023-10-01T10:00:00Z",
  "author_id": "user1",
  "views": 150,
  "likes": 10,
  "liked_by": ["user2", "user3"],
  "summary": "This is a brief summary of the post, not exceeding 200 characters.",
  "content": "This is the full content of the post. It can be quite long and detailed.",
  "title": "Why Businesses Need Juniors: How to Prove You're the One?",
  "slug": "why-businesses-need-juniors-how-to-prove-youre-the-one",
  "status": "published"
}
*/

export const postsController = {
  create: async function (req, res, next) {
    try {
      const { title, content, summary, author_id, categories } = req.body;
      if (!title || !content || !summary || !author_id || !categories) {
        return res.status(400).send({ message: "Title, content, summary, author_id and categories are required!" });
      }
      if (summary.length > 200) {
        return res.status(400).send({ message: "Summary max length is 200 characters!" });
      }
      const slug = slugify(title);
      const posts = await db.read(postfile);
      if (posts.find(post => post.slug === slug)) {
        return res.status(409).send({ message: "Slug already exists!" });
      }
      const users = await db.read(userfile);
      if (!users.find(user => user.id === author_id)) {
        return res.status(400).send({ message: "Author not found!" });
      }
      const newPost = {
        id: uuidv4(),
        title,
        content,
        summary,
        author_id,
        categories,
        slug,
        created_at: new Date(),
        updated_at: new Date(),
        views: 0,
        likes: 0,
        liked_by: [],
        status: "draft"
      };
      posts.push(newPost);
      await db.write(postfile, posts);
      res.status(201).send(newPost);
    } catch (error) {
      next(error);
    }
  },
  update: async function (req, res, next) {
    try {
      const { id } = req.params;
      const body = req.body;
      const posts = await db.read(postfile);
      const postIndex = posts.findIndex(post => post.id === id || post.slug === id);
      if (postIndex === -1) {
        return res.status(404).send({ message: "Post not found!" });
      }
      if (body.title) {
        const newSlug = slugify(body.title);
        if (posts.find(post => post.slug === newSlug && post.id !== posts[postIndex].id)) {
          return res.status(409).send({ message: "Slug already exists!" });
        }
        body.slug = newSlug;
      }
      if (body.summary && body.summary.length > 200) {
        return res.status(400).send({ message: "Summary max length is 200 characters!" });
      }
      posts[postIndex] = {
        ...posts[postIndex],
        ...body,
        updated_at: new Date()
      };
      await db.write(postfile, posts);
      res.send(posts[postIndex]);
    } catch (error) {
      next(error);
    }
  },
  delete: async function (req, res, next) {
    try {
      const { id } = req.params;
      const posts = await db.read(postfile);
      const postIndex = posts.findIndex(post => post.id === id || post.slug === id);
      if (postIndex === -1) {
        return res.status(404).send({ message: "Post not found!" });
      }
      posts.splice(postIndex, 1);
      await db.write(postfile, posts);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },
  find: async function (req, res, next) {
    try {
      const { search, sortBy, sortOrder = "asc", page = 1, limit = 10 } = req.query;
      let posts = await db.read(postfile);

      if (search) {
        posts = posts.filter(post =>
          post.title.toLowerCase().includes(search.toLowerCase()) ||
          post.content.toLowerCase().includes(search.toLowerCase()) ||
          post.summary.toLowerCase().includes(search.toLowerCase()) ||
          post.categories.some(category => category.toLowerCase().includes(search.toLowerCase()))
        );
      }

      if (sortBy) {
        posts = posts.sort((a, b) => {
          if (sortOrder === "desc") {
            return b[sortBy] > a[sortBy] ? 1 : -1;
          }
          return a[sortBy] > b[sortBy] ? 1 : -1;
        });
      }

      const total = posts.length;
      const start = (page - 1) * limit;
      const end = start + Number(limit);
      const paginatedPosts = posts.slice(start, end);

      res.send({
        posts: paginatedPosts,
        total,
        page: Number(page),
        limit: Number(limit)
      });
    } catch (error) {
      next(error);
    }
  },
  findOne: async function (req, res, next) {
    try {
      const { id } = req.params;
      const posts = await db.read(postfile);
      const post = posts.find(post => post.id === id || post.slug === id);
      if (!post) {
        return res.status(404).send({ message: "Post not found!" });
      }
      post.views = (post.views || 0) + 1;
      await db.write(postfile, posts);
      res.send(post);
    } catch (error) {
      next(error);
    }
  },
  liked_by: async function (req, res, next) {
    try {
      const { id, userId } = req.params;
      const posts = await db.read(postfile);
      const users = await db.read(userfile);
      const post = posts.find(post => post.id === id || post.slug === id);
      if (!post) {
        return res.status(404).send({ message: "Post not found!" });
      }
      const user = users.find(u => u.id === userId);
      if (!user) {
        return res.status(404).send({ message: "User not found!" });
      }
      if (!post.liked_by) post.liked_by = [];
      if (!post.likes) post.likes = 0;
      const alreadyLiked = post.liked_by.includes(userId);
      if (alreadyLiked) {
        post.liked_by = post.liked_by.filter(uid => uid !== userId);
        post.likes = Math.max(0, post.likes - 1);
        await db.write(postfile, posts);
        return res.send({ message: "Unliked", post });
      } else {
        post.liked_by.push(userId);
        post.likes += 1;
        await db.write(postfile, posts);
        return res.send({ message: "Liked", post });
      }
    } catch (error) {
      next(error);
    }
  }
};