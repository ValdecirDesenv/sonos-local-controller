const axios = require('axios');
const fs = require('fs');
const querystring = require('querystring');
const path = require('path');
const { setToken, getToken } = require('../services/tokenStore');
const dotenv = require('dotenv');

const result = dotenv.config({ path: path.join(__dirname, '.env') });

const clientId = process.env.SPOTIFY_CLIENT_ID;
const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
console.log('Loaded env:', {
  SPOTIFY_CLIENT_ID: process.env.SPOTIFY_CLIENT_ID,
  SPOTIFY_CLIENT_SECRET: process.env.SPOTIFY_CLIENT_SECRET,
});

function loadTokens() {
  const filePath = path.join(__dirname, '..', 'data', 'spotifyToken.json');
  if (fs.existsSync(filePath)) {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return data;
  }
  return null;
}

async function refreshSpotifyToken() {
  const tokens = loadTokens();
  if (!tokens || !tokens.refresh_token) {
    throw new Error('No refresh token available');
  }

  try {
    const res = await axios.post(
      'https://accounts.spotify.com/api/token',
      querystring.stringify({
        grant_type: 'refresh_token',
        refresh_token: tokens.refresh_token,
      }),
      {
        headers: {
          Authorization: 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    const { access_token, expires_in } = res.data;

    const tokenData = {
      access_token,
      refresh_token: tokens.refresh_token, // keep the same refresh token
      expires_in,
      fetched_at: new Date().toISOString(),
    };

    const savePath = path.join(__dirname, '..', 'data', 'spotifyToken.json');
    fs.writeFileSync(savePath, JSON.stringify(tokenData, null, 2));

    console.log('New Spotify tokens saved to:', savePath);

    setToken(tokenData);

    return tokenData;
  } catch (err) {
    console.error('Error refreshing Spotify token:', err.response?.data || err.message);
    throw new Error('Failed to refresh access token');
  }
}

function isTokenExpired() {
  const token = getToken();
  if (!token) {
    console.warn('No token found. Assuming token is expired.');
    return true;
  }

  const { expires_in, fetched_at } = token;

  const fetchedTime = new Date(fetched_at).getTime();
  const expirationTime = fetchedTime + expires_in * 1000;

  console.log('Fetched at (UTC):', new Date(fetchedTime).toISOString());
  console.log('Expires at (UTC):', new Date(expirationTime).toISOString());
  console.log(
    'Expires at (Local):',
    new Date(expirationTime).toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  );

  const isExpired = Date.now() >= expirationTime;
  console.log('Is token expired?', isExpired);

  return isExpired;
}

async function ensureValidSpotifyToken(ws) {
  const isExpired = isTokenExpired();
  if (isExpired) {
    try {
      token = await refreshSpotifyToken();
      console.log('Spotify token refreshed.');
      return true;
    } catch (err) {
      console.error('Failed to refresh token:', err.message);
      if (ws && ws.send) {
        ws.send(
          JSON.stringify({
            type: 'error',
            message: 'Spotify token is expired and could not be refreshed. Please log in again.',
          })
        );
      }
      return false;
    }
  }
  return true;
}

function readSavedSpotifyToken() {
  const tokenPath = path.join(__dirname, '..', 'data', 'spotifyToken.json');
  if (!fs.existsSync(tokenPath)) return null;

  try {
    const raw = fs.readFileSync(tokenPath, 'utf-8');
    const data = JSON.parse(raw);
    return data;
  } catch (err) {
    console.error('Error reading Spotify token:', err.message);
    return null;
  }
}

// // Function to get playlist metadata
// async function getPlaylistMeta(playlistId) {
//   try {
//     // Ensure the token is valid
//     const isValid = await ensureValidSpotifyToken();
//     if (!isValid) throw new Error('Failed to ensure a valid Spotify token');

//     // Get the valid token
//     const token = getToken();
//     if (!token) throw new Error('No valid Spotify token found');

//     // Make the API request
//     const res = await axios.get(`${playlistId}`, {
//       headers: {
//         Authorization: `Bearer ${token.access_token}`,
//       },
//     });

//     const html = res.data;
//     const nameMatch = html.match(/<title>(.*?) - playlist by/);
//     const name = nameMatch ? nameMatch[1] : 'Unknown';

//     const imageMatch = html.match(/<link rel="icon" sizes="32x32" type="image\/png" href="(.*?)"/);
//     const images = imageMatch ? [{ url: imageMatch[1] }] : [];

//     const externalUrlMatch = html.match(/<meta property="og:url" content="(.*?)"/);
//     const external_urls = { spotify: externalUrlMatch ? externalUrlMatch[1] : '' };

//     return {
//       id: playlistId,
//       name,
//       image: images?.[0]?.url || '',
//       url: external_urls?.spotify || '',
//     };
//   } catch (err) {
//     console.error(`Failed to fetch playlist ${playlistId}:`, err.message);
//     return null;
//   }
// }

async function getPlaylistFromAPI(playlistId, token) {
  try {
    const res = await axios.get(`https://api.spotify.com/v1/playlists/${playlistId}`, {
      headers: {
        Authorization: `Bearer ${token.access_token}`,
      },
    });

    const { name, images, external_urls } = res.data;

    return {
      id: playlistId,
      name,
      image: images?.[0]?.url || '',
      url: external_urls?.spotify || '',
    };
  } catch (err) {
    if (err.response && err.response.status === 404) {
      console.warn(`Playlist ${playlistId} not available via API, falling back to HTML scraping.`);
      return null;
    } else {
      throw err;
    }
  }
}

async function getPlaylistFromHTML(playlistUrl) {
  try {
    const res = await axios.get(playlistUrl);
    const html = res.data;

    const nameMatch = html.match(/<title>(.*?) - playlist by/);
    const name = nameMatch ? nameMatch[1].trim() : 'Unknown';

    const imageMatch = html.match(/<link rel="icon" sizes="32x32" type="image\/png" href="(.*?)"/);
    const imageUrl = imageMatch ? imageMatch[1] : '';

    const urlMatch = html.match(/<meta property="og:url" content="(.*?)"/);
    const url = urlMatch ? urlMatch[1] : playlistUrl;

    return {
      id: url.split('/').pop().split('?')[0],
      name,
      image: imageUrl,
      url,
    };
  } catch (err) {
    console.error(`Failed to scrape playlist HTML:`, err.message);
    return null;
  }
}

async function getPlaylistMeta(playlistIdOrUrl) {
  let playlistId = playlistIdOrUrl;

  if (playlistId.startsWith('http')) {
    playlistId = playlistId.split('/').pop().split('?')[0];
  }

  try {
    await ensureValidSpotifyToken();
    const token = getToken();
    if (!token) throw new Error('No valid Spotify token');

    const apiResult = await getPlaylistFromAPI(playlistId, token);
    if (apiResult) return apiResult;

    return await getPlaylistFromHTML(`https://open.spotify.com/playlist/${playlistId}`);
  } catch (err) {
    console.error(`Failed to get playlist metadata:`, err.message);
    return null;
  }
}
module.exports = { getPlaylistMeta, refreshSpotifyToken, readSavedSpotifyToken, isTokenExpired, ensureValidSpotifyToken };
