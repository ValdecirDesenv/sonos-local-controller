import React, { useState, useEffect } from 'react';
import { Card, CardBody, Button, Input, Row, Col } from 'reactstrap';
import '../css/styles.css';
import { useWebSocketContext } from '../hooks/WebSocketProvider';

const SpotifyWeekList = () => {
  const { messages, sendMessage } = useWebSocketContext();
  const [playlistByDay, setPlaylistByDay] = useState({});
  const [uri, setUri] = useState('');
  const [day, setDay] = useState('Monday');

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  useEffect(() => {
    sendMessage({ type: 'spotifyPlaylist' });
  }, []);

  useEffect(() => {
    const spotifyPayload = messages.find((msg) => msg.type === 'spotifyPlaylists');
    if (spotifyPayload && spotifyPayload.data) {
      setPlaylistByDay(spotifyPayload.data); // <-- direct assign
    }
  }, [messages]);

  const handleSave = () => {
    if (!uri || !day) return;
    sendMessage({
      type: 'saveSpotifyPlaylist',
      data: {
        day,
        url: uri,
      },
    });
    setUri(''); // clear input after saving
  };

  const handleUpdate = () => {
    sendMessage({ type: 'requestSpotifyUpdate' });
  };

  return (
    <div className="container my-4">
      <h2 className="text-center custom-text-4 mb-4">Spotify Weekly Playlist</h2>

      {/* Input Section */}
      <div className="d-flex gap-3 mb-4 flex-wrap justify-content-center">
        <Input type="url" value={uri} onChange={(e) => setUri(e.target.value)} placeholder="Spotify Playlist URL" className="w-50 custom-bg-5" />
        <Input type="select" value={day} onChange={(e) => setDay(e.target.value)} className="form-select-custom">
          {days.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </Input>
        <Button color="primary" onClick={handleSave}>
          Save
        </Button>
        <Button color="warning" onClick={handleUpdate}>
          Update
        </Button>
      </div>

      {/* Playlists Section */}
      <Row>
        {days.map((d) => {
          const playlist = playlistByDay[d] || {};
          const hasPlaylist = playlist.url && playlist.url.trim() !== '';

          return (
            <Col md="4" className="mb-4" key={d}>
              <Card className={`custom-card text-center ${d === today ? 'border-success border-3' : ''}`}>
                {playlist.image ? <img src={playlist.image} alt={playlist.name} className="img-fluid rounded-top" /> : <div className="p-5 text-white bg-secondary">No Image</div>}
                <CardBody>
                  <h5 className="custom-text-5">{d}</h5>
                  <p className="text-truncate text-light" title={playlist?.name}>
                    {playlist?.name || 'No Playlist'}
                  </p>
                  {hasPlaylist && (
                    <Button
                      color="success"
                      onClick={() => {
                        sendMessage({
                          type: 'spotifyStartPlaylist',
                          data: {
                            day: d,
                            url: playlist.url,
                          },
                        });
                      }}
                    >
                      Play
                    </Button>
                  )}
                </CardBody>
              </Card>
            </Col>
          );
        })}
      </Row>
    </div>
  );
};

export default SpotifyWeekList;
