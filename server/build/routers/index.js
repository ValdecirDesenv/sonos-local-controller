"use strict";

var express = require('express');
var usersRouter = require('./users');
var productsRouter = require('./products');
var router = express.Router();
module.exports = router;

// Root route
router.get('/', function (req, res) {
  res.json({
    message: 'Welcome to the server!'
  });
});

// Status route
router.get('/status', function (req, res) {
  res.json({
    message: 'Server is running smoothly.'
  });
});

// Use specific routers
router.use('/users', usersRouter);
router.use('/products', productsRouter);
module.exports = router;