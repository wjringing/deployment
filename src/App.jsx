import { Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import { AuthProvider } from './contexts/AuthContext';
import { LocationProvider } from './contexts/LocationContext';
import { antdTheme } from './theme/antdTheme';
import Auth from './pages/Auth';
import ProtectedRoute from './components/ProtectedRoute';
import AppLayout from './components/AppLayout';
import MainRouter from './components/MainRouter';
import SuperAdminDashboard from './components/SuperAdminDashboard';
import UserManagement from './components/UserManagement';
import LocationManagement from './components/LocationManagement';
import LocationOnboardingWizard from './components/LocationOnboardingWizard';
import RegionalManagement from './components/RegionalManagement';
import AuditLogViewer from './components/AuditLogViewer';

function App() {
  return (
    <ConfigProvider theme={antdTheme}>
      <AuthProvider>
        <LocationProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route
              path="/admin/dashboard"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <SuperAdminDashboard />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/users"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <UserManagement />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/locations"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <LocationManagement />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/onboarding"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <LocationOnboardingWizard />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/regions"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <RegionalManagement />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/audit"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <AuditLogViewer />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <MainRouter />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
          </Routes>
        </LocationProvider>
      </AuthProvider>
    </ConfigProvider>
  );
}

export default App;
