// api/index.js
const express = require('express');
const router = express.Router();

const todos = require('./todos');

router.use('/', todos); // exposes /todos

module.exports = router;
