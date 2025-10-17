import { Routes, Route, Navigate } from 'react-router-dom';
import Auth from './pages/Auth';
import ProtectedRoute from './components/ProtectedRoute';
import DeploymentManagementSystem from './components/DeploymentManagementSystem';
import SuperAdminPortal from './components/SuperAdminPortal';
import { useUser } from './contexts/UserContext';

function App() {
  const { loading, isSuperAdmin } = useUser();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/auth" element={<Auth />} />
      <Route
        path="/admin/*"
        element={
          <ProtectedRoute>
            <SuperAdminPortal />
          </ProtectedRoute>
        }
      />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <DeploymentManagementSystem />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default App;
