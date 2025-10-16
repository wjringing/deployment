import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { LocationProvider } from './contexts/LocationContext';
import Auth from './pages/Auth';
import ProtectedRoute from './components/ProtectedRoute';
import DeploymentManagementSystem from './components/DeploymentManagementSystem';

function App() {
  return (
    <AuthProvider>
      <LocationProvider>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <DeploymentManagementSystem />
              </ProtectedRoute>
            }
          />
        </Routes>
      </LocationProvider>
    </AuthProvider>
  );
}

export default App;
