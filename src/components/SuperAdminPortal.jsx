import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Users, MapPin, Shield, BarChart3, Settings, FileText, ChevronRight, LayoutDashboard } from 'lucide-react';
import UserManagement from './admin/UserManagement';
import LocationManagement from './admin/LocationManagement';
import PermissionManagement from './admin/PermissionManagement';
import SystemSettings from './admin/SystemSettings';
import AuditLogs from './admin/AuditLogs';

export default function SuperAdminPortal() {
  const { isSuperAdmin, userLocations } = useUser();
  const navigate = useNavigate();
  const [activePage, setActivePage] = useState('dashboard');

  if (!isSuperAdmin) {
    return (
      <div className="p-8">
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              You do not have permission to access the Super Admin Portal.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const renderPage = () => {
    switch (activePage) {
      case 'users':
        return <UserManagement />;
      case 'locations':
        return <LocationManagement />;
      case 'permissions':
        return <PermissionManagement />;
      case 'settings':
        return <SystemSettings />;
      case 'audit':
        return <AuditLogs />;
      default:
        return <Dashboard onNavigate={setActivePage} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="border-b bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Super Admin Portal</h1>
              <p className="text-sm text-gray-500">System-wide management and control</p>
            </div>
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                onClick={() => navigate('/')}
                className="flex items-center gap-2"
              >
                <LayoutDashboard className="w-4 h-4" />
                View Deployment System
              </Button>
              <div className="text-right">
                <p className="text-sm font-medium text-gray-700">
                  {userLocations.length} {userLocations.length === 1 ? 'Location' : 'Locations'}
                </p>
                <p className="text-xs text-gray-500">Total managed</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-4 mb-6">
          <Button
            variant={activePage === 'dashboard' ? 'default' : 'outline'}
            onClick={() => setActivePage('dashboard')}
          >
            Dashboard
          </Button>
          <Button
            variant={activePage === 'users' ? 'default' : 'outline'}
            onClick={() => setActivePage('users')}
          >
            <Users className="w-4 h-4 mr-2" />
            Users
          </Button>
          <Button
            variant={activePage === 'locations' ? 'default' : 'outline'}
            onClick={() => setActivePage('locations')}
          >
            <MapPin className="w-4 h-4 mr-2" />
            Locations
          </Button>
          <Button
            variant={activePage === 'permissions' ? 'default' : 'outline'}
            onClick={() => setActivePage('permissions')}
          >
            <Shield className="w-4 h-4 mr-2" />
            Permissions
          </Button>
          <Button
            variant={activePage === 'audit' ? 'default' : 'outline'}
            onClick={() => setActivePage('audit')}
          >
            <FileText className="w-4 h-4 mr-2" />
            Audit Logs
          </Button>
          <Button
            variant={activePage === 'settings' ? 'default' : 'outline'}
            onClick={() => setActivePage('settings')}
          >
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </Button>
        </div>

        {renderPage()}
      </div>
    </div>
  );
}

function Dashboard({ onNavigate }) {
  const { userLocations } = useUser();
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeLocations: 0,
    totalStaff: 0,
    recentActivity: []
  });

  const menuItems = [
    {
      id: 'users',
      title: 'User Management',
      description: 'Create and manage user accounts, assign roles and permissions',
      icon: Users,
      color: 'blue'
    },
    {
      id: 'locations',
      title: 'Location Management',
      description: 'Create locations, configure settings, manage store operations',
      icon: MapPin,
      color: 'green'
    },
    {
      id: 'permissions',
      title: 'Permission Management',
      description: 'Configure role permissions and access control policies',
      icon: Shield,
      color: 'purple'
    },
    {
      id: 'audit',
      title: 'Audit Logs',
      description: 'View system activity, user actions, and security events',
      icon: FileText,
      color: 'orange'
    },
    {
      id: 'settings',
      title: 'System Settings',
      description: 'Configure global settings and system parameters',
      icon: Settings,
      color: 'gray'
    }
  ];

  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    orange: 'bg-orange-100 text-orange-600',
    gray: 'bg-gray-100 text-gray-600'
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Total Locations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-blue-600">{userLocations.length}</div>
            <p className="text-sm text-gray-500 mt-2">
              {userLocations.filter(l => l.operating_status === 'active').length} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">System Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-lg font-semibold">Operational</span>
            </div>
            <p className="text-sm text-gray-500 mt-2">All systems running normally</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
                onClick={() => onNavigate('users')}
              >
                <Users className="w-4 h-4 mr-2" />
                Create New User
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
                onClick={() => onNavigate('locations')}
              >
                <MapPin className="w-4 h-4 mr-2" />
                Add Location
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <Card
              key={item.id}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => onNavigate(item.id)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-lg ${colorClasses[item.color]}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{item.title}</CardTitle>
                      <CardDescription className="mt-1">{item.description}</CardDescription>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
              </CardHeader>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
