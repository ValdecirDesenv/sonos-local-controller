"use strict";

var express = require('express');
var router = express.Router();

// Example API route
router.get('/data', function (req, res) {
  res.json({
    message: 'API data response'
  });
});

// Add more API routes as needed
router.post('/submit', function (req, res) {
  // Handle POST requests
  res.json({
    message: 'Data submitted successfully!'
  });
});
module.exports = router;