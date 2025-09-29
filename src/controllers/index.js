import { usersController } from "./users.controller.js";
import { postsController } from "./posts.controller.js";

export { usersController, postsController };
export const add = {
	user: usersController.create,
	post: postsController.create
};
export const edit = {
	user: usersController.update,
	post: postsController.update
};
export const update = edit;
export const deleteAction = {
	user: usersController.delete,
	post: postsController.delete
};
export const done = {
};
