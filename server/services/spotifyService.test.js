jest.mock('fs');
jest.mock('axios');

const fs = require('fs');
const axios = require('axios');

fs.existsSync.mockReturnValue(false);
process.env.SPOTIFY_CLIENT_ID = 'test-client-id';
process.env.SPOTIFY_CLIENT_SECRET = 'test-client-secret';

const { isTokenExpired, refreshSpotifyToken } = require('./spotifyService');

describe('isTokenExpired', () => {
  it('is expired when no token is available anywhere', () => {
    expect(isTokenExpired(null)).toBe(true);
  });

  it('is not expired for a token still within its window', () => {
    const token = { fetched_at: new Date().toISOString(), expires_in: 3600 };
    expect(isTokenExpired(token)).toBe(false);
  });

  it('is expired once past fetched_at + expires_in', () => {
    const token = { fetched_at: new Date(Date.now() - 7200 * 1000).toISOString(), expires_in: 3600 };
    expect(isTokenExpired(token)).toBe(true);
  });
});

describe('refreshSpotifyToken', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fs.writeFileSync.mockImplementation(() => {});
  });

  it('exchanges the refresh token and persists the new one', async () => {
    axios.post.mockResolvedValue({
      data: { access_token: 'new-access-token', expires_in: 3600 },
    });

    const result = await refreshSpotifyToken({ refresh_token: 'old-refresh-token' });

    expect(axios.post).toHaveBeenCalledWith(
      'https://accounts.spotify.com/api/token',
      expect.any(String),
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: expect.stringContaining('Basic') }) })
    );
    expect(result.access_token).toBe('new-access-token');
    // Spotify doesn't always return a new refresh_token; the old one must be preserved.
    expect(result.refresh_token).toBe('old-refresh-token');
    expect(fs.writeFileSync).toHaveBeenCalled();
  });

  it('rejects when the Spotify token endpoint fails', async () => {
    axios.post.mockRejectedValue(new Error('network down'));

    await expect(refreshSpotifyToken({ refresh_token: 'x' })).rejects.toThrow('Failed to refresh access token');
  });
});
