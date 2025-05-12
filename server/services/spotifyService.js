const axios = require('axios');
const fs = require('fs');
const querystring = require('querystring');
const path = require('path');
let tokenMemory = null;

const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '.env') });

function setToken(token) {
  tokenMemory = token;
}

function getToken() {
  return tokenMemory;
}
const clientId = process.env.SPOTIFY_CLIENT_ID;
const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
const tokenFilePath = path.join(__dirname, '..', 'data', 'spotifyToken.json');

// Load token from file on server startup
async function initializeToken() {
  tokenMemory = await readSavedSpotifyToken();
  if (tokenMemory) {
    setToken(tokenMemory); // Use the refreshed token for your watchdog task
  } else {
    console.error('Failed to retrieve a valid token');
  }
}

initializeToken().catch((err) => {
  console.error('Error during token initialization:', err.message);
});

function readSavedSpotifyToken() {
  if (!fs.existsSync(tokenFilePath)) return null;

  try {
    const raw = fs.readFileSync(tokenFilePath, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading Spotify token:', err.message);
    return null;
  }
}

function loadTokens() {
  // Prefer memory token if available
  return getToken() || readSavedSpotifyToken();
}

async function refreshSpotifyToken(token) {
  if (!token) {
    token = loadTokens();
  }

  try {
    const res = await axios.post(
      'https://accounts.spotify.com/api/token',
      querystring.stringify({
        grant_type: 'refresh_token',
        refresh_token: token.refresh_token,
      }),
      {
        headers: {
          Authorization: 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    const { access_token, expires_in, refresh_token: new_refresh_token } = res.data;

    const tokenData = {
      access_token,
      refresh_token: new_refresh_token || token.refresh_token, // Spotify may not return a new one
      expires_in,
      fetched_at: new Date().toISOString(),
    };

    fs.writeFileSync(tokenFilePath, JSON.stringify(tokenData, null, 2));
    setToken(tokenData);
    console.log('New Spotify token saved and updated in memory.');

    return tokenData;
  } catch (err) {
    console.error('Error refreshing Spotify token:', err.response?.data || err.message);
    throw new Error('Failed to refresh access token');
  }
}

function isTokenExpired(token = null) {
  if (!token) {
    token = loadTokens();
  }
  const { expires_in, fetched_at } = token;
  const fetchedTime = new Date(fetched_at).getTime();
  const expirationTime = fetchedTime + expires_in * 1000;
  const expirationDate = new Date(expirationTime);
  const formattedDate = expirationDate.toLocaleString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  console.log('Token expiration time:', formattedDate);
  return token;
}

async function ensureValidSpotifyToken(ws = null, token = null) {
  if (isTokenExpired(token)) {
    try {
      const token = await refreshSpotifyToken();
      return token;
    } catch (err) {
      console.error('Failed to refresh token:', err.message);
      if (ws?.send) {
        ws.send(
          JSON.stringify({
            type: 'error',
            message: 'Spotify token expired and could not be refreshed. Please log in again.',
          })
        );
      }
      return null;
    }
  }

  return loadTokens();
}

async function getClientCredentialsToken() {
  const res = await axios.post('https://accounts.spotify.com/api/token', new URLSearchParams({ grant_type: 'client_credentials' }), {
    headers: {
      Authorization: 'Basic ' + Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });

  return res.data.access_token;
}

async function getPublicPlaylistMetadata(playlistId) {
  const token = await getClientCredentialsToken();
  try {
    const res = await axios.get(`https://api.spotify.com/v1/playlists/${playlistId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
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
    console.error('Error fetching playlist:', err.response?.data || err.message);
    return null;
  }
}

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
    const token = getToken();
    await ensureValidSpotifyToken(null, token);
    if (!token) throw new Error('No valid Spotify token');

    //const apiResult = await getPlaylistFromAPI(playlistId, token);
    const apiResult = await getPublicPlaylistMetadata(playlistId, token);

    if (apiResult) return apiResult;

    return await getPlaylistFromHTML(`https://open.spotify.com/playlist/${playlistId}`);
  } catch (err) {
    console.error(`Failed to get playlist metadata:`, err.message);
    return null;
  }
}
module.exports = { getPublicPlaylistMetadata, loadTokens, ensureValidSpotifyToken, refreshSpotifyToken, readSavedSpotifyToken, isTokenExpired, getPlaylistMeta, setToken, getToken };
