import { Routes, Route } from 'react-router-dom';
import AuthBootstrap from './components/auth/AuthBootstrap';
import HomePage from './pages/HomePage';
import ExplorePage from './pages/ExplorePage';
import TripDetailPage from './pages/TripDetailPage';
import LoginPage from './pages/LoginPage';
import CreateTripPage from './pages/CreateTripPage';
import AIAssistant from './components/ai/AIAssistant';

function App() {
  return (
    <>
      <AuthBootstrap />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/giris" element={<LoginPage />} />
        <Route path="/kesfet" element={<ExplorePage />} />
        <Route path="/yeni-gezi" element={<CreateTripPage />} />
        <Route path="/gezi/:id" element={<TripDetailPage />} />
      </Routes>
      <AIAssistant />
    </>
  );
}

export default App;
