"use strict";

var express = require('express');
var router = express.Router();

// GET /users
router.get('/', function (req, res) {
  res.json({
    message: 'List of users'
  });
});

// POST /users
router.post('/', function (req, res) {
  res.json({
    message: 'Create a new user'
  });
});
module.exports = router;