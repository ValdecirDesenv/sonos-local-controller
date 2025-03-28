"use strict";

var express = require('express');
var router = express.Router();

// GET /products
router.get('/', function (req, res) {
  res.json({
    message: 'List of products'
  });
});

// POST /products
router.post('/', function (req, res) {
  res.json({
    message: 'Create a new product'
  });
});
module.exports = router;