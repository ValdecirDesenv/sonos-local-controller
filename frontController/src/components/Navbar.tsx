import React from 'react';
import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import SpotifyLoginButton from './SpotifyLoginButton';

interface Coordinator {
  roomName: string;
}

interface Group {
  data: { nameRoom: string; coordinator: Coordinator }[];
  devices: {
    uuid: string;
    roomName: string;
    state: string;
    volume: number;
    mute: boolean;
  }[];
}

const Navbar: React.FC<{ group?: Group }> = ({ group }) => {
  const [devices, setDevices] = useState<{ uuid: string; roomName: string }[]>([]);

  useEffect(() => {
    if (group?.devices) {
      const deviceArray = group.devices.map((device) => ({
        uuid: device.uuid,
        roomName: device.roomName,
      }));
      setDevices(deviceArray);
    }
  }, [group?.devices]);

  return (
    <nav className="nav flex-column">
      <div className="container">
        <SpotifyLoginButton />
        <p />
        <Link className="navbar-brand" to="/">
          Sonos upcoming settings
        </Link>
        <ul className="nav flex-column">
          <li className="nav-item">
            <Link className="nav-link" to="/devices">
              Group Devices
            </Link>
          </li>
          <li className="nav-item">
            <Link className="nav-link" to="/spotifyWeekList">
              Play List Settings
            </Link>
            {group && (
              <ul className="nav flex-column">
                {devices
                  .sort((a, b) => a.roomName.localeCompare(b.roomName))
                  .map((device, index) => (
                    <li className="listDevices" key={index}>
                      <Link to={`/devices/${device.roomName}`} className="listDevices">
                        {device.roomName}
                      </Link>
                    </li>
                  ))}
              </ul>
            )}
          </li>
        </ul>
      </div>
    </nav>
  );
};

export default Navbar;
