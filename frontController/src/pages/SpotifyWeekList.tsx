// import React, { useState } from 'react';
// import { Table, Button, Input, FormGroup, Label } from 'reactstrap';
// import '../css/styles.css';

// const SpotifyWeekList = () => {
//   const [uri, setUri] = useState('');
//   const [day, setDay] = useState('Monday');
//   const [playlistByDay, setPlaylistByDay] = useState({
//     Monday: 'https://open.spotify.com/playlist/3ri9dQZF1E4A7OlobLeqTt',
//     Tuesday: 'https://open.spotify.com/playlist/3jrMLNdV14UAKtTt6q9dJr',
//     Wednesday: 'https://open.spotify.com/playlist/1XVX2X8TRM8jLw6oYwq5mt',
//     Thursday: 'https://open.spotify.com/playlist/3jrMLNdV14UAKtTt6q9dJr',
//     Friday: 'https://open.spotify.com/playlist/3tLXsPheKXWPFtJ6nWRt05',
//     Saturday: 'https://open.spotify.com/playlist/3tLXsPheKXWPFtJ6nWRt05',
//     Sunday: 'https://open.spotify.com/playlist/3tLXsPheKXWPFtJ6nWRt05',
//   });

//   const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

//   const handleSave = () => {
//     setPlaylistByDay((prev) => ({
//       ...prev,
//       [day]: uri,
//     }));
//     setUri('');
//   };

//   const handlePlayNow = () => {
//     const now = new Date();
//     const today = days[now.getDay() === 0 ? 6 : now.getDay() - 1]; // JS Date: Sunday = 0
//     const playlist = playlistByDay[today];
//     window.open(playlist, '_blank');
//   };

//   return (
//     <div className="container my-4">
//       <div className="custom-card p-4 rounded-lg shadow-md">
//         <h3 className="text-center mb-4 custom-text-4">Spotify Play - Week List</h3>

//         <FormGroup>
//           <Label className="custom-text-5" for="spotifyUri">
//             Add new List
//           </Label>
//           <Input className="custom-bg-5" id="spotifyUri" type="text" placeholder="https://open.spotify.com/playlist/..." value={uri} onChange={(e) => setUri(e.target.value)} />
//         </FormGroup>

//         <FormGroup className="d-flex align-items-center gap-2">
//           <Label for="daySelect" className="custom-text-5">
//             Day of the week to be played:
//           </Label>
//           <Input className="custom-bg-5 form-select-custom" type="select" id="daySelect" value={day} onChange={(e) => setDay(e.target.value)}>
//             {days.map((d) => (
//               <option key={d}>{d}</option>
//             ))}
//           </Input>
//           <Button color="primary" onClick={handleSave}>
//             Save
//           </Button>
//         </FormGroup>

//         <Table className="custom-bg-5" bordered responsive>
//           <thead>
//             <tr>
//               <th>Day</th>
//               <th>URI Spotify</th>
//             </tr>
//           </thead>
//           <tbody>
//             {days.map((d) => (
//               <tr key={d}>
//                 <td>{d}</td>
//                 <td>{playlistByDay[d]}</td>
//               </tr>
//             ))}
//           </tbody>
//         </Table>

//         <div className="text-center mt-3">
//           <Button color="success" onClick={handlePlayNow}>
//             Play now
//           </Button>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default SpotifyWeekList;
import React, { useState } from 'react';
import { Card, CardBody, Button, Input, Label, Row, Col } from 'reactstrap';
import '../css/styles.css';

const SpotifyWeekList = () => {
  const [uri, setUri] = useState('');
  const [day, setDay] = useState('Monday');
  const [playlistByDay, setPlaylistByDay] = useState({
    Monday: 'https://open.spotify.com/playlist/3ri9dQZF1E4A7OlobLeqTt',
    Tuesday: 'https://open.spotify.com/playlist/3jrMLNdV14UAKtTt6q9dJr',
    Wednesday: 'https://open.spotify.com/playlist/1XVX2X8TRM8jLw6oYwq5mt',
    Thursday: 'https://open.spotify.com/playlist/3jrMLNdV14UAKtTt6q9dJr',
    Friday: 'https://open.spotify.com/playlist/3tLXsPheKXWPFtJ6nWRt05',
    Saturday: 'https://open.spotify.com/playlist/3tLXsPheKXWPFtJ6nWRt05',
    Sunday: 'https://open.spotify.com/playlist/3tLXsPheKXWPFtJ6nWRt05',
  });

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const handleSave = () => {
    setPlaylistByDay((prev) => ({
      ...prev,
      [day]: uri,
    }));
    setUri('');
  };

  const getPlaylistId = (url) => {
    const match = url.match(/playlist\/([a-zA-Z0-9]+)/);
    return match ? match[1] : null;
  };

  const getPlaylistImage = (url) => {
    const id = getPlaylistId(url);
    return id ? `https://i.scdn.co/image/${id}` : null; // This won't always work, placeholder only
  };

  const today = days[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1];

  return (
    <div className="container my-4">
      <h2 className="text-center custom-text-4 mb-4">Spotify Weekly Playlist</h2>

      <div className="d-flex gap-3 mb-4 flex-wrap justify-content-center">
        <Input type="url" value={uri} onChange={(e) => setUri(e.target.value)} placeholder="Spotify Playlist URL" className="w-50 custom-bg-5" />
        <Input type="select" value={day} onChange={(e) => setDay(e.target.value)} className="form-select-custom">
          {days.map((d) => (
            <option key={d}>{d}</option>
          ))}
        </Input>
        <Button color="primary" onClick={handleSave}>
          Save
        </Button>
      </div>

      <Row>
        {days.map((d) => {
          const url = playlistByDay[d];
          const image = getPlaylistImage(url);
          return (
            <Col md="4" className="mb-4" key={d}>
              <Card className={`custom-card text-center ${d === today ? 'border-success border-3' : ''}`}>
                {image ? <img src={image} alt={d} className="img-fluid rounded-top" /> : <div className="p-5 text-white bg-secondary">No Image</div>}
                <CardBody>
                  <h5 className="custom-text-5">{d}</h5>
                  <p className="text-truncate text-light" title={url}>
                    {url}
                  </p>
                  <Button color="success" onClick={() => window.open(url, '_blank')}>
                    Play
                  </Button>
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
