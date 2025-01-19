import 'bootstrap/dist/css/bootstrap.min.css';
import { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css'; // Import the custom CSS file

function App() {
  const [data, setData] = useState(null);

  const fetchApi = async () => {
    try {
      const response = await axios.get('http://localhost:3000/api');
      setData(response.data);
    } catch (error) {
      console.error('Error fetching API data', error);
    }
  };

  useEffect(() => {
    fetchApi();
  }, []);

  if (!data) {
    return <div className="text-center mt-5">Loading...</div>;
  }

  return (
    <div className="container mt-5">
      <div className="row">
        {Object.keys(data).map((key) => {
          const group = data[key];
          const { coordinator, members } = group;

          return (
            <div className="col-md-6 mb-4" key={key}>
              <div className="card h-100">
                <div className="card-body">
                  {/* Coordinator Details */}
                  <h5 className="card-title">Group: {coordinator.roomName}</h5>
                  <p>
                    <strong>Volume:</strong> {coordinator.state.volume}
                  </p>
                  <p>
                    <strong>Mute:</strong> {coordinator.state.mute ? 'Yes' : 'No'}
                  </p>
                  <p>
                    <strong>Playback State:</strong> {coordinator.state.playbackState}
                  </p>

                  {/* Members Table */}
                  <h6 className="mt-4">Members</h6>
                  <table className="table table-bordered">
                    <thead>
                      <tr>
                        <th>Room</th>
                        <th>Volume</th>
                        <th>Mute</th>
                        <th>Playback</th>
                      </tr>
                    </thead>
                    <tbody>
                      {members.map((member, index) => (
                        <tr key={index}>
                          <td>{member.roomName}</td>
                          <td>{member.state.volume}</td>
                          <td>{member.state.mute ? 'Yes' : 'No'}</td>
                          <td>{member.state.playbackState}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default App;
