import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useUser } from '../../contexts/UserContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { toast } from 'sonner';
import { Users, Plus, Search, Edit2, Trash2, Shield, MapPin, CheckCircle, XCircle, Mail } from 'lucide-react';

export default function UserManagement() {
  const { currentUser, userLocations } = useUser();
  const [users, setUsers] = useState([]);
  const [locations, setLocations] = useState([]);
  const [roles, setRoles] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [loading, setLoading] = useState(false);

  const [newUser, setNewUser] = useState({
    email: '',
    full_name: '',
    phone: '',
    employee_id: '',
    password: '',
    role: 'location_user',
    location_ids: [],
    is_super_admin: false
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [usersRes, locationsRes, rolesRes] = await Promise.all([
        supabase.from('users').select('*, super_admins(id)').order('created_at', { ascending: false }),
        supabase.from('locations').select('*').order('location_name'),
        supabase.from('user_roles').select('*').order('role_level')
      ]);

      if (usersRes.data) {
        const usersWithLocations = await Promise.all(
          usersRes.data.map(async (user) => {
            const { data: userLocs } = await supabase
              .from('user_locations')
              .select('location_id, role_name, locations(location_name)')
              .eq('user_id', user.id);

            return {
              ...user,
              user_locations: userLocs || [],
              is_super_admin: !!user.super_admins
            };
          })
        );
        setUsers(usersWithLocations);
      }

      setLocations(locationsRes.data || []);
      setRoles(rolesRes.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateUser() {
    if (!newUser.email || !newUser.full_name || !newUser.password) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (newUser.password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    if (!newUser.is_super_admin && newUser.location_ids.length === 0) {
      toast.error('Please assign at least one location');
      return;
    }

    setLoading(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newUser.email,
        password: newUser.password,
        options: {
          data: {
            full_name: newUser.full_name
          }
        }
      });

      if (authError) throw authError;

      const userId = authData.user.id;

      const { error: userError } = await supabase.from('users').insert({
        id: userId,
        email: newUser.email,
        full_name: newUser.full_name,
        phone: newUser.phone,
        employee_id: newUser.employee_id,
        status: 'active',
        created_by_admin_id: currentUser.id
      });

      if (userError) throw userError;

      if (newUser.is_super_admin) {
        const { error: superAdminError } = await supabase.from('super_admins').insert({
          user_id: userId,
          full_name: newUser.full_name,
          email: newUser.email
        });

        if (superAdminError) throw superAdminError;
      } else {
        const userLocationMappings = newUser.location_ids.map(locationId => ({
          user_id: userId,
          location_id: locationId,
          role_name: newUser.role,
          assigned_by: currentUser.id
        }));

        const { error: mappingError } = await supabase
          .from('user_locations')
          .insert(userLocationMappings);

        if (mappingError) throw mappingError;
      }

      const { error: auditError } = await supabase.from('audit_logs').insert({
        user_id: currentUser.id,
        action_type: 'user_created',
        action_details: {
          created_user_id: userId,
          email: newUser.email,
          full_name: newUser.full_name,
          role: newUser.role,
          is_super_admin: newUser.is_super_admin
        },
        affected_table: 'users',
        affected_record_id: userId
      });

      toast.success('User created successfully');
      setShowCreateModal(false);
      setNewUser({
        email: '',
        full_name: '',
        phone: '',
        employee_id: '',
        password: '',
        role: 'location_user',
        location_ids: [],
        is_super_admin: false
      });
      loadData();
    } catch (error) {
      console.error('Error creating user:', error);
      toast.error(error.message || 'Failed to create user');
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteUser(userId) {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.admin.deleteUser(userId);

      if (error) throw error;

      const { error: auditError } = await supabase.from('audit_logs').insert({
        user_id: currentUser.id,
        action_type: 'user_deleted',
        action_details: { deleted_user_id: userId },
        affected_table: 'users',
        affected_record_id: userId
      });

      toast.success('User deleted successfully');
      loadData();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Failed to delete user');
    } finally {
      setLoading(false);
    }
  }

  const filteredUsers = users.filter(user =>
    user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.employee_id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-6 h-6" />
                User Management
              </CardTitle>
              <CardDescription>Create and manage user accounts with role assignments</CardDescription>
            </div>
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create User
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search users by name, email, or employee ID..."
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
            <div className="space-y-2">
              {filteredUsers.map((user) => (
                <div
                  key={user.id}
                  className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-lg">{user.full_name}</h3>
                        {user.is_super_admin && (
                          <span className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded-full flex items-center gap-1">
                            <Shield className="w-3 h-3" />
                            Super Admin
                          </span>
                        )}
                        {user.status === 'active' ? (
                          <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            Active
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded-full flex items-center gap-1">
                            <XCircle className="w-3 h-3" />
                            Inactive
                          </span>
                        )}
                      </div>
                      <div className="mt-2 space-y-1 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4" />
                          {user.email}
                        </div>
                        {user.employee_id && (
                          <div>Employee ID: {user.employee_id}</div>
                        )}
                        {user.user_locations && user.user_locations.length > 0 && (
                          <div className="flex items-center gap-2 flex-wrap mt-2">
                            <MapPin className="w-4 h-4" />
                            {user.user_locations.map((ul, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded"
                              >
                                {ul.locations?.location_name} ({ul.role_name})
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedUser(user)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteUser(user.id)}
                        disabled={user.id === currentUser.id}
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}

              {filteredUsers.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No users found matching your search.
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-2xl font-bold mb-4">Create New User</h2>

            <div className="space-y-4">
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  placeholder="user@example.com"
                />
              </div>

              <div>
                <Label htmlFor="full_name">Full Name *</Label>
                <Input
                  id="full_name"
                  value={newUser.full_name}
                  onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                  placeholder="John Doe"
                />
              </div>

              <div>
                <Label htmlFor="password">Temporary Password *</Label>
                <Input
                  id="password"
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  placeholder="Minimum 12 characters"
                />
                <p className="text-xs text-gray-500 mt-1">
                  User will be prompted to change this password on first login
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={newUser.phone}
                    onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                    placeholder="+44 7XXX XXXXXX"
                  />
                </div>

                <div>
                  <Label htmlFor="employee_id">Employee ID</Label>
                  <Input
                    id="employee_id"
                    value={newUser.employee_id}
                    onChange={(e) => setNewUser({ ...newUser, employee_id: e.target.value })}
                    placeholder="EMP001"
                  />
                </div>
              </div>

              <div className="border-t pt-4">
                <Label className="flex items-center gap-2 mb-3">
                  <input
                    type="checkbox"
                    checked={newUser.is_super_admin}
                    onChange={(e) => setNewUser({ ...newUser, is_super_admin: e.target.checked })}
                    className="rounded"
                  />
                  Make this user a Super Admin
                </Label>

                {!newUser.is_super_admin && (
                  <>
                    <div className="mb-3">
                      <Label htmlFor="role">Role</Label>
                      <select
                        id="role"
                        value={newUser.role}
                        onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                        className="w-full border rounded-md p-2"
                      >
                        {roles.filter(r => r.role_name !== 'super_admin').map(role => (
                          <option key={role.role_name} value={role.role_name}>
                            {role.role_name.replace('_', ' ').toUpperCase()}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <Label>Assign Locations *</Label>
                      <div className="border rounded-md p-3 max-h-40 overflow-y-auto space-y-2">
                        {locations.map(location => (
                          <Label key={location.id} className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={newUser.location_ids.includes(location.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setNewUser({
                                    ...newUser,
                                    location_ids: [...newUser.location_ids, location.id]
                                  });
                                } else {
                                  setNewUser({
                                    ...newUser,
                                    location_ids: newUser.location_ids.filter(id => id !== location.id)
                                  });
                                }
                              }}
                              className="rounded"
                            />
                            {location.location_name}
                          </Label>
                        ))}
                      </div>
                    </div>
                  </>
                )}
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
              <Button onClick={handleCreateUser} disabled={loading}>
                {loading ? 'Creating...' : 'Create User'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
