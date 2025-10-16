import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { MapPin, Plus, Edit2, Trash2, X, Building2, Users, BarChart3 } from 'lucide-react';
import { toast } from '../lib/toast';

export default function RegionalManagement() {
  const [regions, setRegions] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRegion, setEditingRegion] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    manager_name: '',
    manager_email: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      const { data: locationsData, error: locationsError } = await supabase
        .from('locations')
        .select('*')
        .order('region');

      if (locationsError) throw locationsError;
      setLocations(locationsData || []);

      const regionGroups = {};
      locationsData?.forEach(loc => {
        if (loc.region) {
          if (!regionGroups[loc.region]) {
            regionGroups[loc.region] = {
              name: loc.region,
              locations: [],
              activeCount: 0,
              totalStaff: 0
            };
          }
          regionGroups[loc.region].locations.push(loc);
          if (loc.status === 'active') {
            regionGroups[loc.region].activeCount++;
          }
        }
      });

      setRegions(Object.values(regionGroups));
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load regional data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    toast.info('Regional management is a simplified view. Use Location Management to assign regions to locations.');
    setShowModal(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading regional data...</p>
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
              <MapPin className="w-7 h-7 text-primary" />
              Regional Management
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              View and manage locations by region
            </p>
          </div>
        </div>

        {regions.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <MapPin className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium">No regions found</p>
            <p className="text-sm mt-1">Add locations with region assignments to see them here</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {regions.map((region) => (
              <div
                key={region.name}
                className="border-2 border-gray-100 rounded-lg p-5 hover:shadow-md transition-shadow bg-white"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-primary" />
                      {region.name}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {region.locations.length} location{region.locations.length !== 1 ? 's' : ''}
                      {region.activeCount > 0 && ` • ${region.activeCount} active`}
                    </p>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  {region.locations.map((location) => (
                    <div
                      key={location.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100"
                    >
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-gray-500" />
                        <div>
                          <p className="font-medium text-gray-900 text-sm">{location.location_name}</p>
                          <p className="text-xs text-gray-600">{location.location_code}</p>
                        </div>
                      </div>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        location.status === 'active'
                          ? 'bg-success/10 text-success'
                          : location.status === 'onboarding'
                          ? 'bg-warning/10 text-warning'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {location.status}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-3 gap-3 pt-3 border-t border-gray-100">
                  <div className="text-center">
                    <div className="text-lg font-bold text-gray-900">
                      {region.locations.length}
                    </div>
                    <div className="text-xs text-gray-600">Locations</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-success">
                      {region.activeCount}
                    </div>
                    <div className="text-xs text-gray-600">Active</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-info">
                      {region.locations.filter(l => l.status === 'onboarding').length}
                    </div>
                    <div className="text-xs text-gray-600">Onboarding</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 p-4 bg-info/10 border border-info/20 rounded-lg">
          <p className="text-sm text-gray-700">
            <strong>Note:</strong> To manage regions, use the Location Management page to assign regions to individual locations.
            This page provides a read-only overview of your regional structure.
          </p>
        </div>
      </div>
    </div>
  );
}
