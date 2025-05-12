// const fs = require('fs');
// const path = require('path');
// const axios = require('axios');

// const TOKEN_PATH = path.resolve(__dirname, '../data/spotifyToken.json');
// let tokenData = null;

// // Save token data to the JSON file
// function saveTokenToFile(token) {
//   fs.writeFileSync(TOKEN_PATH, JSON.stringify(token, null, 2));
// }

// // Load token data from the JSON file
// function loadTokenFromFile() {
//   if (fs.existsSync(TOKEN_PATH)) {
//     const tokenFromFile = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf-8'));

//     // Convert old-style 'expires_in' to 'expires_at' if needed
//     if (tokenFromFile.expires_in && !tokenFromFile.expires_at) {
//       tokenFromFile.expires_at = Date.now() + tokenFromFile.expires_in * 1000;
//       delete tokenFromFile.expires_in;
//       saveTokenToFile(tokenFromFile); // Save updated format
//     }

//     return tokenFromFile;
//   }
//   return null;
// }

// // Check if the token is expired
// function isTokenExpired(token) {
//   if (!token || !token.expires_at) {
//     return true; // No token or missing expiration info
//   }
//   return Date.now() >= token.expires_at;
// }

// // Get the current token (checks expiration and refreshes if needed)
// async function getToken() {
//   if (!tokenData) {
//     tokenData = loadTokenFromFile();
//   }

//   if (isTokenExpired(tokenData)) {
//     console.warn('⚠️ Token expired. Attempting to refresh...');
//     const refreshedToken = await refreshToken();
//     if (refreshedToken) {
//       return refreshedToken.access_token;
//     }
//     return null; // Failed to refresh
//   }

//   return tokenData.access_token;
// }

// // Set a new token (updates both memory and file)
// function setToken(newToken) {
//   tokenData = newToken;
//   saveTokenToFile(newToken);
// }

// // Refresh the token if expired
// async function refreshToken() {
//   if (!tokenData || !tokenData.refresh_token) {
//     console.error('❌ No refresh token available to refresh the access token.');
//     return null;
//   }

//   try {
//     const response = await axios.post(
//       'https://accounts.spotify.com/api/token',
//       new URLSearchParams({
//         grant_type: 'refresh_token',
//         refresh_token: tokenData.refresh_token,
//       }),
//       {
//         headers: {
//           Authorization: `Basic ${Buffer.from(process.env.SPOTIFY_CLIENT_ID + ':' + process.env.SPOTIFY_CLIENT_SECRET).toString('base64')}`,
//           'Content-Type': 'application/x-www-form-urlencoded',
//         },
//       }
//     );

//     const newTokenData = {
//       access_token: response.data.access_token,
//       refresh_token: tokenData.refresh_token, // Usually doesn't change
//       expires_at: Date.now() + response.data.expires_in * 1000, // Convert to timestamp
//     };

//     setToken(newTokenData); // Save and update memory
//     console.log('✅ Token refreshed successfully.');
//     return newTokenData;
//   } catch (error) {
//     console.error('❌ Error refreshing token:', error.response?.data || error.message);
//     return null;
//   }
// }

// // Set the entire token JSON object
// function setFullToken(newToken) {
//   setToken(newToken);
// }

// module.exports = {
//   getToken, // Get the access token (refreshes if needed)
//   setToken, // Set a new token (access token only)
// };
