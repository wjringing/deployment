import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Building2, Plus, Edit2, Trash2, X, Check, MapPin, Search, AlertCircle, Users, Briefcase, Calendar } from 'lucide-react';
import { toast } from 'sonner';

export default function LocationManagement() {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingLocation, setEditingLocation] = useState(null);
  const [formData, setFormData] = useState({
    location_code: '',
    location_name: '',
    address: '',
    city: '',
    postcode: '',
    region: '',
    area: '',
    timezone: 'Europe/London',
    status: 'onboarding',
    target_labor_percentage: 15.0,
    max_staff_per_shift: 20
  });

  useEffect(() => {
    loadLocations();
  }, []);

  const loadLocations = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('locations')
        .select(`
          *,
          user_locations(count),
          staff(count),
          deployments(count)
        `)
        .order('location_name');

      if (error) throw error;
      setLocations(data || []);
    } catch (error) {
      console.error('Error loading locations:', error);
      toast.error('Failed to load locations');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingLocation) {
        const { error } = await supabase
          .from('locations')
          .update(formData)
          .eq('id', editingLocation.id);

        if (error) throw error;
        toast.success('Location updated successfully');
      } else {
        const { error } = await supabase
          .from('locations')
          .insert([formData]);

        if (error) throw error;
        toast.success('Location created successfully');
      }

      setShowModal(false);
      setEditingLocation(null);
      resetForm();
      loadLocations();
    } catch (error) {
      console.error('Error saving location:', error);
      toast.error(error.message || 'Failed to save location');
    }
  };

  const handleEdit = (location) => {
    setEditingLocation(location);
    setFormData({
      location_code: location.location_code || '',
      location_name: location.location_name || '',
      address: location.address || '',
      city: location.city || '',
      postcode: location.postcode || '',
      region: location.region || '',
      area: location.area || '',
      timezone: location.timezone || 'Europe/London',
      status: location.status || 'onboarding',
      target_labor_percentage: location.target_labor_percentage || 15.0,
      max_staff_per_shift: location.max_staff_per_shift || 20
    });
    setShowModal(true);
  };

  const handleDelete = async (locationId) => {
    if (!confirm('Are you sure you want to delete this location? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('locations')
        .delete()
        .eq('id', locationId);

      if (error) throw error;
      toast.success('Location deleted successfully');
      loadLocations();
    } catch (error) {
      console.error('Error deleting location:', error);
      toast.error('Failed to delete location. It may have associated data.');
    }
  };

  const handleStatusChange = async (locationId, newStatus) => {
    try {
      const { error } = await supabase
        .from('locations')
        .update({ status: newStatus })
        .eq('id', locationId);

      if (error) throw error;
      toast.success(`Location status updated to ${newStatus}`);
      loadLocations();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  const resetForm = () => {
    setFormData({
      location_code: '',
      location_name: '',
      address: '',
      city: '',
      postcode: '',
      region: '',
      area: '',
      timezone: 'Europe/London',
      status: 'onboarding',
      target_labor_percentage: 15.0,
      max_staff_per_shift: 20
    });
  };

  const filteredLocations = locations.filter(loc => {
    const matchesSearch =
      loc.location_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      loc.location_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      loc.city?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || loc.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status) => {
    const styles = {
      active: 'bg-success/10 text-success border-success/20',
      onboarding: 'bg-warning/10 text-warning border-warning/20',
      inactive: 'bg-gray-100 text-gray-600 border-gray-200'
    };
    return styles[status] || styles.inactive;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading locations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6 border border-gray-100">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Building2 className="w-7 h-7 text-primary" />
              Location Management
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Manage all locations across your organization
            </p>
          </div>
          <button
            onClick={() => {
              resetForm();
              setEditingLocation(null);
              setShowModal(true);
            }}
            className="bg-primary hover:bg-primary-hover text-white px-6 py-3 rounded-lg flex items-center gap-2 font-semibold shadow-md hover:shadow-lg transition-all active:scale-95"
          >
            <Plus className="w-5 h-5" />
            Add Location
          </button>
        </div>

        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search locations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="onboarding">Onboarding</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        {filteredLocations.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Building2 className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium">No locations found</p>
            <p className="text-sm mt-1">Add your first location to get started</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredLocations.map((location) => (
              <div
                key={location.id}
                className="border-2 border-gray-100 rounded-lg p-5 hover:shadow-md transition-shadow bg-white"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-bold text-gray-900">
                        {location.location_name}
                      </h3>
                      <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border ${getStatusBadge(location.status)}`}>
                        {location.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 font-medium">Code: {location.location_code}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(location)}
                      className="p-2 text-info hover:bg-info/10 rounded-lg transition-colors"
                      title="Edit location"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(location.id)}
                      className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                      title="Delete location"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2 text-sm mb-4">
                  {location.address && (
                    <div className="flex items-start gap-2 text-gray-700">
                      <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <div>
                        <p>{location.address}</p>
                        <p>{location.city} {location.postcode}</p>
                      </div>
                    </div>
                  )}
                  {location.region && (
                    <p className="text-gray-600">
                      <span className="font-medium">Region:</span> {location.region}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-3 pt-3 border-t border-gray-100">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-info mb-1">
                      <Users className="w-4 h-4" />
                    </div>
                    <div className="text-lg font-bold text-gray-900">
                      {location.staff?.[0]?.count || 0}
                    </div>
                    <div className="text-xs text-gray-600">Staff</div>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-success mb-1">
                      <Briefcase className="w-4 h-4" />
                    </div>
                    <div className="text-lg font-bold text-gray-900">
                      {location.user_locations?.[0]?.count || 0}
                    </div>
                    <div className="text-xs text-gray-600">Users</div>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-warning mb-1">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div className="text-lg font-bold text-gray-900">
                      {location.deployments?.[0]?.count || 0}
                    </div>
                    <div className="text-xs text-gray-600">Deployments</div>
                  </div>
                </div>

                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => handleStatusChange(location.id, 'active')}
                    disabled={location.status === 'active'}
                    className="flex-1 px-3 py-2 text-xs font-semibold bg-success/10 text-success hover:bg-success/20 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                  >
                    Activate
                  </button>
                  <button
                    onClick={() => handleStatusChange(location.id, 'inactive')}
                    disabled={location.status === 'inactive'}
                    className="flex-1 px-3 py-2 text-xs font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                  >
                    Deactivate
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Building2 className="w-6 h-6 text-primary" />
                {editingLocation ? 'Edit Location' : 'Add New Location'}
              </h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingLocation(null);
                  resetForm();
                }}
                className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Location Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.location_code}
                    onChange={(e) => setFormData({ ...formData, location_code: e.target.value })}
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                    placeholder="e.g., 3017"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Location Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.location_name}
                    onChange={(e) => setFormData({ ...formData, location_name: e.target.value })}
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                    placeholder="e.g., KFC Manchester"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Address
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                  placeholder="Street address"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                    placeholder="City"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Postcode
                  </label>
                  <input
                    type="text"
                    value={formData.postcode}
                    onChange={(e) => setFormData({ ...formData, postcode: e.target.value })}
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                    placeholder="Postcode"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Region
                  </label>
                  <input
                    type="text"
                    value={formData.region}
                    onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                    placeholder="e.g., North West"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Area
                  </label>
                  <input
                    type="text"
                    value={formData.area}
                    onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                    placeholder="e.g., Manchester Area"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                  >
                    <option value="onboarding">Onboarding</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Labor Target (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.target_labor_percentage}
                    onChange={(e) => setFormData({ ...formData, target_labor_percentage: parseFloat(e.target.value) })}
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Max Staff/Shift
                  </label>
                  <input
                    type="number"
                    value={formData.max_staff_per_shift}
                    onChange={(e) => setFormData({ ...formData, max_staff_per_shift: parseInt(e.target.value) })}
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-100">
                <button
                  type="submit"
                  className="flex-1 bg-primary hover:bg-primary-hover text-white px-6 py-3 rounded-lg flex items-center justify-center gap-2 font-semibold shadow-md transition-all active:scale-95"
                >
                  <Check className="w-5 h-5" />
                  {editingLocation ? 'Update Location' : 'Create Location'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingLocation(null);
                    resetForm();
                  }}
                  className="px-6 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50 font-semibold transition-all active:scale-95"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
