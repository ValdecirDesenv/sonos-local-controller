import { Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell.js';
import { DevicesPage } from './pages/DevicesPage.js';
import { HomePage } from './pages/HomePage.js';
import { NotFoundPage } from './pages/NotFoundPage.js';
import { SpotifyWeekListPage } from './pages/SpotifyWeekListPage.js';

export function App() {
  return (
    <Router>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/devices" element={<DevicesPage />} />
          <Route path="/spotifyWeekList" element={<SpotifyWeekListPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </Router>
  );
}
