import { Routes, Route, Navigate } from 'react-router-dom';
import Auth from './pages/Auth';
import ProtectedRoute from './components/ProtectedRoute';
import DeploymentManagementSystem from './components/DeploymentManagementSystem';

function App() {
  return (
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
  );
}

export default App;
