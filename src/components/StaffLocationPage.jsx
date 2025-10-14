import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { toast } from 'sonner';
import {
  MapPin, Users, Clock, AlertTriangle, RefreshCw, Coffee,
  ChefHat, Store, UserCheck, X, CheckCircle, Navigation
} from 'lucide-react';

export default function StaffLocationPage() {
  const [locations, setLocations] = useState([]);
  const [deployments, setDeployments] = useState([]);
  const [staff, setStaff] = useState([]);
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedShift, setSelectedShift] = useState('Day Shift');
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    loadData();
    const interval = autoRefresh ? setInterval(loadData, 30000) : null;
    return () => interval && clearInterval(interval);
  }, [selectedDate, selectedShift, autoRefresh]);

  const loadData = async () => {
    try {
      const [locationsRes, deploymentsRes, staffRes, positionsRes] = await Promise.all([
        supabase
          .from('staff_current_locations')
          .select(`
            *,
            staff:staff_id(id, name, is_under_18),
            deployment:deployment_id(id, position, start_time, end_time)
          `),
        supabase
          .from('deployments')
          .select(`
            *,
            staff:staff_id(id, name, is_under_18)
          `)
          .eq('date', selectedDate)
          .eq('shift_type', selectedShift),
        supabase.from('staff').select('*').order('name'),
        supabase.from('positions').select('*').order('display_order')
      ]);

      if (locationsRes.error) throw locationsRes.error;
      if (deploymentsRes.error) throw deploymentsRes.error;
      if (staffRes.error) throw staffRes.error;
      if (positionsRes.error) throw positionsRes.error;

      setLocations(locationsRes.data || []);
      setDeployments(deploymentsRes.data || []);
      setStaff(staffRes.data || []);
      setPositions(positionsRes.data || []);
      setLoading(false);
    } catch (error) {
      toast.error('Failed to load data: ' + error.message);
      setLoading(false);
    }
  };

  const handleSetStaffLocation = async (staffId, deploymentId, position, area) => {
    try {
      const existingLocation = locations.find(l => l.staff_id === staffId);

      if (existingLocation) {
        await supabase
          .from('staff_location_history')
          .insert([{
            staff_id: staffId,
            deployment_id: existingLocation.deployment_id,
            position: existingLocation.current_position,
            started_at: existingLocation.started_at,
            ended_at: new Date().toISOString()
          }]);

        const { error } = await supabase
          .from('staff_current_locations')
          .update({
            deployment_id: deploymentId,
            current_position: position,
            assigned_area: area,
            status: 'working',
            started_at: new Date().toISOString(),
            last_updated: new Date().toISOString()
          })
          .eq('id', existingLocation.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('staff_current_locations')
          .insert([{
            staff_id: staffId,
            deployment_id: deploymentId,
            current_position: position,
            assigned_area: area,
            status: 'working'
          }]);

        if (error) throw error;
      }

      toast.success('Location updated');
      await loadData();
    } catch (error) {
      toast.error('Failed to update: ' + error.message);
    }
  };

  const handleSetBreakStatus = async (staffId, onBreak) => {
    try {
      const location = locations.find(l => l.staff_id === staffId);
      if (!location) return;

      const { error } = await supabase
        .from('staff_current_locations')
        .update({
          status: onBreak ? 'on_break' : 'working',
          last_updated: new Date().toISOString()
        })
        .eq('id', location.id);

      if (error) throw error;

      toast.success(onBreak ? 'Staff on break' : 'Staff back from break');
      await loadData();
    } catch (error) {
      toast.error('Failed to update: ' + error.message);
    }
  };

  const handleRemoveLocation = async (locationId) => {
    try {
      const location = locations.find(l => l.id === locationId);
      if (location) {
        await supabase
          .from('staff_location_history')
          .insert([{
            staff_id: location.staff_id,
            deployment_id: location.deployment_id,
            position: location.current_position,
            started_at: location.started_at,
            ended_at: new Date().toISOString()
          }]);
      }

      const { error } = await supabase
        .from('staff_current_locations')
        .delete()
        .eq('id', locationId);

      if (error) throw error;

      toast.success('Staff removed from board');
      await loadData();
    } catch (error) {
      toast.error('Failed to remove: ' + error.message);
    }
  };

  const handleSyncFromDeployments = async () => {
    if (!confirm(`Sync all ${deployments.length} deployments to location board?`)) return;

    try {
      for (const deployment of deployments) {
        const existingLocation = locations.find(l => l.staff_id === deployment.staff_id);

        if (!existingLocation) {
          await supabase
            .from('staff_current_locations')
            .insert([{
              staff_id: deployment.staff_id,
              deployment_id: deployment.id,
              current_position: deployment.position,
              assigned_area: deployment.area || '',
              status: 'working'
            }]);
        }
      }

      toast.success('Location board synced');
      await loadData();
    } catch (error) {
      toast.error('Failed to sync: ' + error.message);
    }
  };

  const getAreaIcon = (area) => {
    if (area.includes('Kitchen') || area.includes('Cook')) return <ChefHat className="w-4 h-4" />;
    if (area.includes('Front') || area.includes('DT')) return <Store className="w-4 h-4" />;
    if (area.includes('Pack')) return <UserCheck className="w-4 h-4" />;
    return <MapPin className="w-4 h-4" />;
  };

  const groupByArea = () => {
    const grouped = {};
    locations.forEach(loc => {
      const area = loc.assigned_area || 'Unassigned';
      if (!grouped[area]) grouped[area] = [];
      grouped[area].push(loc);
    });
    return grouped;
  };

  const getUncoveredPositions = () => {
    const coveredPositions = new Set(locations.map(l => l.current_position));
    return deployments.filter(d => !coveredPositions.has(d.position));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  const groupedLocations = groupByArea();
  const uncoveredPositions = getUncoveredPositions();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Staff Location Board</h2>
          <p className="text-gray-600">Real-time tracking of staff positions</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={autoRefresh ? 'bg-green-50 text-green-700' : ''}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
            {autoRefresh ? 'Auto-Refresh' : 'Manual'}
          </Button>
          <Button onClick={loadData}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={handleSyncFromDeployments} className="bg-blue-600 hover:bg-blue-700">
            <CheckCircle className="w-4 h-4 mr-2" />
            Sync from Deployments
          </Button>
        </div>
      </div>

      <Card className="p-4">
        <div className="flex gap-4 items-center">
          <div>
            <label className="block text-sm font-medium mb-1">Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="border rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Shift</label>
            <select
              value={selectedShift}
              onChange={(e) => setSelectedShift(e.target.value)}
              className="border rounded px-3 py-2"
            >
              <option value="Day Shift">Day Shift</option>
              <option value="Night Shift">Night Shift</option>
            </select>
          </div>
          <div className="flex-1" />
          <div className="flex gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-green-500"></div>
              <span>Working ({locations.filter(l => l.status === 'working').length})</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-orange-500"></div>
              <span>On Break ({locations.filter(l => l.status === 'on_break').length})</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-gray-400"></div>
              <span>Offline ({locations.filter(l => l.status === 'offline').length})</span>
            </div>
          </div>
        </div>
      </Card>

      {uncoveredPositions.length > 0 && (
        <Card className="p-4 bg-red-50 border-red-200">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-bold text-red-900 mb-2">
                Coverage Gaps ({uncoveredPositions.length})
              </h3>
              <div className="flex flex-wrap gap-2">
                {uncoveredPositions.map((dep) => (
                  <button
                    key={dep.id}
                    onClick={() => handleSetStaffLocation(dep.staff_id, dep.id, dep.position, dep.area)}
                    className="px-3 py-1 bg-white border-2 border-red-600 rounded text-sm hover:bg-red-50"
                  >
                    {dep.staff?.name} → {dep.position}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.entries(groupedLocations).map(([area, areaLocations]) => (
          <Card key={area} className="p-4">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b">
              {getAreaIcon(area)}
              <h3 className="font-bold text-lg">{area}</h3>
              <span className="ml-auto text-sm text-gray-500">{areaLocations.length} staff</span>
            </div>
            <div className="space-y-2">
              {areaLocations.map((location) => (
                <div
                  key={location.id}
                  className={`p-3 rounded-lg border-2 ${
                    location.status === 'working'
                      ? 'bg-green-50 border-green-600'
                      : location.status === 'on_break'
                      ? 'bg-orange-50 border-orange-600'
                      : 'bg-gray-50 border-gray-400'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="font-bold">{location.staff?.name}</div>
                      <div className="text-sm font-medium text-gray-700">{location.current_position}</div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRemoveLocation(location.id)}
                      className="text-red-600"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-gray-600 mb-2">
                    <Clock className="w-3 h-3" />
                    <span>Since {new Date(location.started_at).toLocaleTimeString()}</span>
                  </div>

                  <div className="flex gap-2 mt-2">
                    {location.status === 'working' ? (
                      <Button
                        size="sm"
                        onClick={() => handleSetBreakStatus(location.staff_id, true)}
                        className="flex-1 bg-orange-600 hover:bg-orange-700"
                      >
                        <Coffee className="w-3 h-3 mr-1" />
                        Break
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => handleSetBreakStatus(location.staff_id, false)}
                        className="flex-1 bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Return
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>

      {locations.length === 0 && (
        <Card className="p-12 text-center">
          <Users className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-bold text-gray-600 mb-2">No Staff on Board</h3>
          <p className="text-gray-500 mb-4">
            Click "Sync from Deployments" to populate the board
          </p>
          <Button onClick={handleSyncFromDeployments}>
            <CheckCircle className="w-4 h-4 mr-2" />
            Sync from Deployments
          </Button>
        </Card>
      )}
    </div>
  );
}
