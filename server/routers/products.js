const express = require('express');
const router = express.Router();

// GET /products
router.get('/', (req, res) => {
  res.json({ message: 'List of products' });
});

// POST /products
router.post('/', (req, res) => {
  res.json({ message: 'Create a new product' });
});

module.exports = router;
