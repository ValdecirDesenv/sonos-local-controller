const express = require('express');
const router = express.Router();

// GET /users
router.get('/', (req, res) => {
  res.json({ message: 'List of users' });
});

// POST /users
router.post('/', (req, res) => {
  res.json({ message: 'Create a new user' });
});

module.exports = router;
