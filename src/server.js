const express = require('express');
const { JSDOM } = require('jsdom');
const app = express();
const port = 3000;

app.use(express.json());

let expenses = [];
const dom = new JSDOM(`<!DOCTYPE html><body><div id="expenses"></div></body>`);
const document = dom.window.document;
app.post('/expenses', (req, res) => {
    const { name, amount } = req.body;
    if (!name || !amount) {
        return res.status(400).json({ error: 'Name and amount required' });
    }
    const expense = { id: expenses.length + 1, name, amount };
    expenses.push(expense);
    const div = document.createElement('div');
    div.textContent = `${expense.name}: $${expense.amount}`;
    document.getElementById('expenses').appendChild(div);

    res.status(201).json(expense);
});
app.get('/expenses', (req, res) => {
    res.json(expenses);
});
app.get('/expenses/html', (req, res) => {
    res.send(document.getElementById('expenses').outerHTML);
});
app.get('/expenses/total', (req, res) => {
    const total = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
    res.json({ total });
});

app.listen(port, () => {
    console.log(`shu ssilkada ishlayapti http://localhost:${port}`);
});
