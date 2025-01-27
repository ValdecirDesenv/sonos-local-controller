const express = require('express');
const usersRouter = require('./users');
const productsRouter = require('./products');
const router = express.Router();
module.exports = router;

// Root route
router.get('/', (req, res) => {
  res.json({ message: 'Welcome to the server!' });
});

// Status route
router.get('/status', (req, res) => {
  res.json({ message: 'Server is running smoothly.' });
});

// Use specific routers
router.use('/users', usersRouter);
router.use('/products', productsRouter);

module.exports = router;
