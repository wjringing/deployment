import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useUser } from '../../contexts/UserContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { toast } from 'sonner';
import { MapPin, Plus, Search, Edit2, Trash2, CheckCircle, XCircle, Store, Settings } from 'lucide-react';

export default function LocationManagement() {
  const { currentUser } = useUser();
  const [locations, setLocations] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [loading, setLoading] = useState(false);

  const [newLocation, setNewLocation] = useState({
    location_code: '',
    location_name: '',
    brand: 'KFC',
    address: '',
    city: '',
    postcode: '',
    region: '',
    timezone: 'Europe/London',
    operating_status: 'active'
  });

  useEffect(() => {
    loadLocations();
  }, []);

  async function loadLocations() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .order('location_name');

      if (error) throw error;

      const locationsWithCounts = await Promise.all(
        (data || []).map(async (location) => {
          const { count: staffCount } = await supabase
            .from('staff')
            .select('*', { count: 'exact', head: true })
            .eq('location_id', location.id);

          const { count: userCount } = await supabase
            .from('user_locations')
            .select('*', { count: 'exact', head: true })
            .eq('location_id', location.id);

          return {
            ...location,
            staff_count: staffCount || 0,
            user_count: userCount || 0
          };
        })
      );

      setLocations(locationsWithCounts);
    } catch (error) {
      console.error('Error loading locations:', error);
      toast.error('Failed to load locations');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateLocation() {
    if (!newLocation.location_code || !newLocation.location_name) {
      toast.error('Location code and name are required');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('locations')
        .insert(newLocation)
        .select()
        .single();

      if (error) throw error;

      const { error: settingsError } = await supabase
        .from('store_settings')
        .insert({
          location_id: data.id,
          operating_hours: {
            monday: { open: '10:00', close: '22:00' },
            tuesday: { open: '10:00', close: '22:00' },
            wednesday: { open: '10:00', close: '22:00' },
            thursday: { open: '10:00', close: '22:00' },
            friday: { open: '10:00', close: '23:00' },
            saturday: { open: '10:00', close: '23:00' },
            sunday: { open: '10:00', close: '22:00' }
          },
          break_policies: {
            rest_break_minutes: 15,
            meal_break_minutes: 30,
            min_hours_for_break: 4,
            min_hours_for_meal: 6
          },
          performance_targets: {
            labor_percent_target: 12.5,
            daily_sales_target: 5000,
            customer_satisfaction_target: 90
          },
          feature_flags: {
            training_tracking: true,
            break_scheduler: true,
            performance_scorecard: true,
            staff_location_board: true
          }
        });

      const { error: auditError } = await supabase.from('audit_logs').insert({
        user_id: currentUser.id,
        action_type: 'location_created',
        action_details: {
          location_id: data.id,
          location_code: newLocation.location_code,
          location_name: newLocation.location_name
        },
        affected_table: 'locations',
        affected_record_id: data.id
      });

      toast.success('Location created successfully');
      setShowCreateModal(false);
      setNewLocation({
        location_code: '',
        location_name: '',
        brand: 'KFC',
        address: '',
        city: '',
        postcode: '',
        region: '',
        timezone: 'Europe/London',
        operating_status: 'active'
      });
      loadLocations();
    } catch (error) {
      console.error('Error creating location:', error);
      toast.error(error.message || 'Failed to create location');
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteLocation(locationId) {
    if (!confirm('Are you sure you want to delete this location? All associated data will be permanently deleted.')) {
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('locations')
        .delete()
        .eq('id', locationId);

      if (error) throw error;

      const { error: auditError } = await supabase.from('audit_logs').insert({
        user_id: currentUser.id,
        action_type: 'location_deleted',
        action_details: { location_id: locationId },
        affected_table: 'locations',
        affected_record_id: locationId
      });

      toast.success('Location deleted successfully');
      loadLocations();
    } catch (error) {
      console.error('Error deleting location:', error);
      toast.error('Failed to delete location');
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateStatus(locationId, newStatus) {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('locations')
        .update({ operating_status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', locationId);

      if (error) throw error;

      toast.success('Location status updated');
      loadLocations();
    } catch (error) {
      console.error('Error updating location:', error);
      toast.error('Failed to update location status');
    } finally {
      setLoading(false);
    }
  }

  const filteredLocations = locations.filter(location =>
    location.location_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    location.location_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    location.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    location.region?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const statusColors = {
    active: 'bg-green-100 text-green-700',
    inactive: 'bg-gray-100 text-gray-700',
    onboarding: 'bg-blue-100 text-blue-700',
    maintenance: 'bg-yellow-100 text-yellow-700',
    archived: 'bg-red-100 text-red-700'
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-6 h-6" />
                Location Management
              </CardTitle>
              <CardDescription>Manage store locations and their configurations</CardDescription>
            </div>
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Location
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search locations by name, code, city, or region..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {loading && !showCreateModal ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredLocations.map((location) => (
                <Card key={location.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Store className="w-5 h-5 text-gray-600" />
                          <CardTitle className="text-lg">{location.location_name}</CardTitle>
                        </div>
                        <CardDescription>{location.location_code}</CardDescription>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded-full ${statusColors[location.operating_status]}`}>
                        {location.operating_status}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm text-gray-600">
                      {location.address && <div>{location.address}</div>}
                      {location.city && location.postcode && (
                        <div>{location.city}, {location.postcode}</div>
                      )}
                      {location.region && <div>Region: {location.region}</div>}

                      <div className="pt-3 border-t flex justify-between text-sm">
                        <span>{location.staff_count} Staff</span>
                        <span>{location.user_count} Users</span>
                      </div>

                      <div className="pt-3 flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => setSelectedLocation(location)}
                        >
                          <Settings className="w-4 h-4 mr-1" />
                          Configure
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteLocation(location.id)}
                          disabled={location.staff_count > 0 || location.user_count > 0}
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>

                      {location.operating_status !== 'active' && (
                        <Button
                          variant="default"
                          size="sm"
                          className="w-full"
                          onClick={() => handleUpdateStatus(location.id, 'active')}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Activate Location
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}

              {filteredLocations.length === 0 && (
                <div className="col-span-full text-center py-8 text-gray-500">
                  No locations found matching your search.
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-2xl font-bold mb-4">Add New Location</h2>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="location_code">Location Code *</Label>
                  <Input
                    id="location_code"
                    value={newLocation.location_code}
                    onChange={(e) => setNewLocation({ ...newLocation, location_code: e.target.value.toUpperCase() })}
                    placeholder="KFC002"
                  />
                </div>

                <div>
                  <Label htmlFor="brand">Brand</Label>
                  <Input
                    id="brand"
                    value={newLocation.brand}
                    onChange={(e) => setNewLocation({ ...newLocation, brand: e.target.value })}
                    placeholder="KFC"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="location_name">Location Name *</Label>
                <Input
                  id="location_name"
                  value={newLocation.location_name}
                  onChange={(e) => setNewLocation({ ...newLocation, location_name: e.target.value })}
                  placeholder="KFC Manchester City Centre"
                />
              </div>

              <div>
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={newLocation.address}
                  onChange={(e) => setNewLocation({ ...newLocation, address: e.target.value })}
                  placeholder="123 High Street"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={newLocation.city}
                    onChange={(e) => setNewLocation({ ...newLocation, city: e.target.value })}
                    placeholder="Manchester"
                  />
                </div>

                <div>
                  <Label htmlFor="postcode">Postcode</Label>
                  <Input
                    id="postcode"
                    value={newLocation.postcode}
                    onChange={(e) => setNewLocation({ ...newLocation, postcode: e.target.value.toUpperCase() })}
                    placeholder="M1 1AA"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="region">Region</Label>
                  <Input
                    id="region"
                    value={newLocation.region}
                    onChange={(e) => setNewLocation({ ...newLocation, region: e.target.value })}
                    placeholder="North West"
                  />
                </div>

                <div>
                  <Label htmlFor="timezone">Timezone</Label>
                  <select
                    id="timezone"
                    value={newLocation.timezone}
                    onChange={(e) => setNewLocation({ ...newLocation, timezone: e.target.value })}
                    className="w-full border rounded-md p-2"
                  >
                    <option value="Europe/London">Europe/London (GMT)</option>
                    <option value="Europe/Dublin">Europe/Dublin (GMT)</option>
                  </select>
                </div>
              </div>

              <div>
                <Label htmlFor="operating_status">Initial Status</Label>
                <select
                  id="operating_status"
                  value={newLocation.operating_status}
                  onChange={(e) => setNewLocation({ ...newLocation, operating_status: e.target.value })}
                  className="w-full border rounded-md p-2"
                >
                  <option value="active">Active</option>
                  <option value="onboarding">Onboarding</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button
                variant="outline"
                onClick={() => setShowCreateModal(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button onClick={handleCreateLocation} disabled={loading}>
                {loading ? 'Creating...' : 'Create Location'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
