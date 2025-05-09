const express = require('express');
const router = express.Router();

const spotifyRoutes = require('./spotifyRoutes');

router.use('/spotify', spotifyRoutes);

// Example API route
router.get('/data', (req, res) => {
  res.json({ message: 'API data response' });
});

// Add more API routes as needed
router.post('/submit', (req, res) => {
  // Handle POST requests
  res.json({ message: 'Data submitted successfully!' });
});

module.exports = router;
