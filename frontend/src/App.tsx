import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

// Pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import DashboardPage from './pages/DashboardPage';
import InterviewPage from './pages/InterviewPage';
import InterviewResultPage from './pages/InterviewResultPage';
import PricingPage from './pages/PricingPage';
import ProfilePage from './pages/ProfilePage';

// Components
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

function App() {
  const { user } = useAuth();

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={!user ? <LoginPage /> : <Navigate to="/dashboard" />} />
      <Route path="/signup" element={!user ? <SignupPage /> : <Navigate to="/dashboard" />} />
      <Route path="/pricing" element={<PricingPage />} />

      {/* Protected routes */}
      <Route
        path="/dashboard/*"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="schedule" element={<DashboardPage tab="schedule" />} />
        <Route path="practice" element={<DashboardPage tab="practice" />} />
        <Route path="results" element={<DashboardPage tab="results" />} />
      </Route>
      <Route
        path="/interview/:id"
        element={
          <ProtectedRoute>
            <InterviewPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/interview/result/:id"
        element={
          <ProtectedRoute>
            <InterviewResultPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        }
      />

      {/* 404 */}
      <Route path="*" element={<Navigate to="/login" />} />
    </Routes>
  );
}

export default App;