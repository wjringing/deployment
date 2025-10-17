import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import {
  Building2, Users, MapPin, TrendingUp, Activity, Shield,
  ChevronRight, AlertCircle, CheckCircle, Clock, Plus
} from 'lucide-react';
import { toast } from '../lib/toast';

const SuperAdminDashboard = ({ onNavigateToUsers, onNavigateToLocations, onNavigateToOnboarding }) => {
  const { isSuperAdmin } = useAuth();
  const [stats, setStats] = useState({
    totalLocations: 0,
    activeLocations: 0,
    onboardingLocations: 0,
    totalUsers: 0,
    totalStaff: 0,
    totalDeployments: 0
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isSuperAdmin()) {
      loadDashboardData();
    }
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      const [locationsRes, usersRes, staffRes, deploymentsRes] = await Promise.all([
        supabase.from('locations').select('*'),
        supabase.from('user_profiles').select('id'),
        supabase.from('staff').select('id'),
        supabase.from('deployments').select('id')
      ]);

      if (locationsRes.error) throw locationsRes.error;
      if (usersRes.error) throw usersRes.error;
      if (staffRes.error) throw staffRes.error;
      if (deploymentsRes.error) throw deploymentsRes.error;

      const locationData = locationsRes.data || [];
      setLocations(locationData);

      setStats({
        totalLocations: locationData.length,
        activeLocations: locationData.filter(l => l.active === true).length,
        onboardingLocations: 0,
        totalUsers: usersRes.data?.length || 0,
        totalStaff: staffRes.data?.length || 0,
        totalDeployments: deploymentsRes.data?.length || 0
      });

      setRecentActivity([]);
    } catch (error) {
      console.error('Error loading dashboard:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (!isSuperAdmin()) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Access Denied</h2>
          <p className="text-gray-500">This area is restricted to super administrators only.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Super Admin Dashboard</h1>
          <p className="text-gray-600 mt-1">System-wide overview and management</p>
        </div>
        <button
          onClick={onNavigateToOnboarding}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add New Location
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard
          icon={Building2}
          title="Total Locations"
          value={stats.totalLocations}
          subtitle={`${stats.activeLocations} active, ${stats.onboardingLocations} onboarding`}
          color="blue"
          onClick={onNavigateToLocations}
        />
        <StatCard
          icon={Users}
          title="System Users"
          value={stats.totalUsers}
          subtitle="Across all locations"
          color="green"
          onClick={onNavigateToUsers}
        />
        <StatCard
          icon={Activity}
          title="Total Staff"
          value={stats.totalStaff}
          subtitle="All locations combined"
          color="purple"
        />
        <StatCard
          icon={TrendingUp}
          title="Total Deployments"
          value={stats.totalDeployments}
          subtitle="System-wide"
          color="orange"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Locations Overview</h2>
            <button
              onClick={onNavigateToLocations}
              className="text-red-600 hover:text-red-700 text-sm font-medium flex items-center gap-1"
            >
              View All
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {locations.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <MapPin className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No locations yet</p>
              </div>
            ) : (
              locations.map((location) => (
                <LocationCard key={location.id} location={location} />
              ))
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {recentActivity.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No recent activity</p>
              </div>
            ) : (
              recentActivity.map((activity) => (
                <ActivityItem key={activity.id} activity={activity} />
              ))
            )}
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-lg p-6 border border-red-200">
        <div className="flex items-start gap-4">
          <div className="bg-red-100 rounded-lg p-3">
            <Shield className="w-6 h-6 text-red-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Quick Actions</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <QuickActionButton
                onClick={onNavigateToUsers}
                icon={Users}
                label="Manage Users"
              />
              <QuickActionButton
                onClick={onNavigateToLocations}
                icon={Building2}
                label="Manage Locations"
              />
              <QuickActionButton
                onClick={onNavigateToOnboarding}
                icon={Plus}
                label="Add Location"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ icon: Icon, title, value, subtitle, color, onClick }) => {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    orange: 'bg-orange-100 text-orange-600',
  };

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-lg shadow-md p-6 ${onClick ? 'cursor-pointer hover:shadow-lg transition-shadow' : ''}`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className={`rounded-lg p-3 ${colorClasses[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
      <h3 className="text-2xl font-bold text-gray-900 mb-1">{value}</h3>
      <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
      <p className="text-xs text-gray-500">{subtitle}</p>
    </div>
  );
};

const LocationCard = ({ location }) => {
  const statusConfig = {
    active: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50', label: 'Active' },
    onboarding: { icon: Clock, color: 'text-orange-600', bg: 'bg-orange-50', label: 'Onboarding' },
    inactive: { icon: AlertCircle, color: 'text-gray-600', bg: 'bg-gray-50', label: 'Inactive' },
  };

  const config = statusConfig[location.status] || statusConfig.inactive;
  const StatusIcon = config.icon;

  return (
    <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
      <div className="flex items-center gap-3">
        <MapPin className="w-5 h-5 text-gray-400" />
        <div>
          <p className="font-medium text-gray-900">{location.location_name}</p>
          <p className="text-sm text-gray-500">
            Code: {location.location_code} • {location.city}
          </p>
        </div>
      </div>
      <div className={`flex items-center gap-1 px-2 py-1 rounded-full ${config.bg}`}>
        <StatusIcon className={`w-4 h-4 ${config.color}`} />
        <span className={`text-xs font-medium ${config.color}`}>{config.label}</span>
      </div>
    </div>
  );
};

const ActivityItem = ({ activity }) => {
  return (
    <div className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg">
      <Activity className="w-5 h-5 text-gray-400 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-900">
          {activity.action}
          {activity.table_name && <span className="text-gray-500"> on {activity.table_name}</span>}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          {new Date(activity.created_at).toLocaleString()}
        </p>
      </div>
    </div>
  );
};

const QuickActionButton = ({ onClick, icon: Icon, label }) => {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-4 py-3 bg-white rounded-lg border border-gray-200 hover:border-red-300 hover:bg-red-50 transition-all"
    >
      <Icon className="w-5 h-5 text-red-600" />
      <span className="text-sm font-medium text-gray-700">{label}</span>
    </button>
  );
};

export default SuperAdminDashboard;
