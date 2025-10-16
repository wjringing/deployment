import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { LocationProvider } from './contexts/LocationContext';
import Auth from './pages/Auth';
import ProtectedRoute from './components/ProtectedRoute';
import DeploymentManagementSystem from './components/DeploymentManagementSystem';
import SuperAdminDashboard from './components/SuperAdminDashboard';
import UserManagement from './components/UserManagement';
import LocationManagement from './components/LocationManagement';
import LocationOnboardingWizard from './components/LocationOnboardingWizard';
import RegionalManagement from './components/RegionalManagement';
import AuditLogViewer from './components/AuditLogViewer';

function App() {
  return (
    <AuthProvider>
      <LocationProvider>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute>
                <SuperAdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute>
                <UserManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/locations"
            element={
              <ProtectedRoute>
                <LocationManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/onboarding"
            element={
              <ProtectedRoute>
                <LocationOnboardingWizard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/regions"
            element={
              <ProtectedRoute>
                <RegionalManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/audit"
            element={
              <ProtectedRoute>
                <AuditLogViewer />
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
      </LocationProvider>
    </AuthProvider>
  );
}

export default App;
