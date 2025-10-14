import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, RefreshCw, Link2, Shield } from 'lucide-react';
import { supabase } from '../lib/supabase';

const PositionRelationshipsManager = () => {
  const [positions, setPositions] = useState([]);
  const [secondaryMappings, setSecondaryMappings] = useState([]);
  const [closingRequirements, setClosingRequirements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('secondary');

  const [newMapping, setNewMapping] = useState({
    primary_position_id: '',
    secondary_position_id: '',
    priority: 1,
    shift_type: 'Both',
    auto_deploy: true
  });

  const [newClosingReq, setNewClosingReq] = useState({
    position_id: '',
    requires_closing_training: true,
    shift_type: 'Night Shift',
    minimum_trained_staff: 1,
    closing_start_time: '22:00'
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);

      const { data: positionsData } = await supabase
        .from('positions')
        .select('*')
        .order('name');

      const { data: mappingsData } = await supabase
        .from('position_secondary_mappings')
        .select(`
          *,
          primary_position:primary_position_id (id, name, type),
          secondary_position:secondary_position_id (id, name, type)
        `)
        .order('priority');

      const { data: closingData } = await supabase
        .from('closing_station_requirements')
        .select(`
          *,
          position:position_id (id, name, type)
        `)
        .order('closing_start_time');

      setPositions(positionsData || []);
      setSecondaryMappings(mappingsData || []);
      setClosingRequirements(closingData || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function addSecondaryMapping() {
    try {
      if (!newMapping.primary_position_id || !newMapping.secondary_position_id) {
        alert('Please select both primary and secondary positions');
        return;
      }

      const { error } = await supabase
        .from('position_secondary_mappings')
        .insert({
          primary_position_id: newMapping.primary_position_id,
          secondary_position_id: newMapping.secondary_position_id,
          priority: newMapping.priority,
          shift_type: newMapping.shift_type,
          auto_deploy: newMapping.auto_deploy,
          is_enabled: true
        });

      if (error) throw error;

      setNewMapping({
        primary_position_id: '',
        secondary_position_id: '',
        priority: 1,
        shift_type: 'Both',
        auto_deploy: true
      });

      await loadData();
    } catch (error) {
      console.error('Error adding secondary mapping:', error);
      alert('Error adding mapping: ' + error.message);
    }
  }

  async function removeSecondaryMapping(id) {
    try {
      const { error } = await supabase
        .from('position_secondary_mappings')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await loadData();
    } catch (error) {
      console.error('Error removing mapping:', error);
      alert('Error removing mapping: ' + error.message);
    }
  }

  async function toggleMappingEnabled(id, currentValue) {
    try {
      const { error } = await supabase
        .from('position_secondary_mappings')
        .update({ is_enabled: !currentValue })
        .eq('id', id);

      if (error) throw error;
      await loadData();
    } catch (error) {
      console.error('Error toggling mapping:', error);
    }
  }

  async function addClosingRequirement() {
    try {
      if (!newClosingReq.position_id) {
        alert('Please select a position');
        return;
      }

      const { error } = await supabase
        .from('closing_station_requirements')
        .insert({
          position_id: newClosingReq.position_id,
          requires_closing_training: newClosingReq.requires_closing_training,
          shift_type: newClosingReq.shift_type,
          minimum_trained_staff: newClosingReq.minimum_trained_staff,
          closing_start_time: newClosingReq.closing_start_time,
          is_active: true
        });

      if (error) throw error;

      setNewClosingReq({
        position_id: '',
        requires_closing_training: true,
        shift_type: 'Night Shift',
        minimum_trained_staff: 1,
        closing_start_time: '22:00'
      });

      await loadData();
    } catch (error) {
      console.error('Error adding closing requirement:', error);
      alert('Error adding requirement: ' + error.message);
    }
  }

  async function removeClosingRequirement(id) {
    try {
      const { error } = await supabase
        .from('closing_station_requirements')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await loadData();
    } catch (error) {
      console.error('Error removing requirement:', error);
      alert('Error removing requirement: ' + error.message);
    }
  }

  async function toggleClosingActive(id, currentValue) {
    try {
      const { error } = await supabase
        .from('closing_station_requirements')
        .update({ is_active: !currentValue })
        .eq('id', id);

      if (error) throw error;
      await loadData();
    } catch (error) {
      console.error('Error toggling requirement:', error);
    }
  }

  const primaryPositions = positions.filter(p => p.type === 'position');
  const secondaryPositions = positions.filter(p => p.type === 'position' || p.type === 'pack_position');

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Link2 className="w-8 h-8 text-purple-600" />
        <h2 className="text-3xl font-bold text-gray-900">Position Relationships</h2>
      </div>

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('secondary')}
            className={`${
              activeTab === 'secondary'
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
          >
            <Link2 className="w-4 h-4" />
            Secondary Positions
          </button>
          <button
            onClick={() => setActiveTab('closing')}
            className={`${
              activeTab === 'closing'
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
          >
            <Shield className="w-4 h-4" />
            Closing Requirements
          </button>
        </nav>
      </div>

      {activeTab === 'secondary' ? (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Secondary Position Mappings</h3>
          <p className="text-sm text-gray-600 mb-6">
            Define which secondary positions are automatically assigned when a primary position is deployed.
          </p>

          <div className="mb-6 p-4 bg-purple-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-3">Add New Mapping</h4>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <select
                value={newMapping.primary_position_id}
                onChange={(e) => setNewMapping({ ...newMapping, primary_position_id: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              >
                <option value="">Primary Position</option>
                {primaryPositions.map(pos => (
                  <option key={pos.id} value={pos.id}>{pos.name}</option>
                ))}
              </select>

              <select
                value={newMapping.secondary_position_id}
                onChange={(e) => setNewMapping({ ...newMapping, secondary_position_id: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              >
                <option value="">Secondary Position</option>
                {secondaryPositions.map(pos => (
                  <option key={pos.id} value={pos.id}>{pos.name} ({pos.type})</option>
                ))}
              </select>

              <input
                type="number"
                min="1"
                value={newMapping.priority}
                onChange={(e) => setNewMapping({ ...newMapping, priority: parseInt(e.target.value) || 1 })}
                placeholder="Priority"
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              />

              <select
                value={newMapping.shift_type}
                onChange={(e) => setNewMapping({ ...newMapping, shift_type: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              >
                <option value="Both">Both Shifts</option>
                <option value="Day Shift">Day Shift</option>
                <option value="Night Shift">Night Shift</option>
              </select>

              <button
                onClick={addSecondaryMapping}
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add
              </button>
            </div>

            <label className="flex items-center gap-2 mt-3">
              <input
                type="checkbox"
                checked={newMapping.auto_deploy}
                onChange={(e) => setNewMapping({ ...newMapping, auto_deploy: e.target.checked })}
                className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <span className="text-sm text-gray-700">Auto-deploy this secondary position</span>
            </label>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {secondaryMappings.map((mapping) => (
              <div key={mapping.id} className={`flex items-center justify-between p-3 rounded-lg ${
                mapping.is_enabled ? 'bg-gray-50' : 'bg-gray-100 opacity-60'
              }`}>
                <div className="flex items-center gap-4 flex-1">
                  <span className="font-medium text-gray-900">
                    {mapping.primary_position?.name || 'Unknown'}
                  </span>
                  <span className="text-gray-400">→</span>
                  <span className="font-medium text-purple-600">
                    {mapping.secondary_position?.name || 'Unknown'}
                  </span>
                  <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">
                    Priority: {mapping.priority}
                  </span>
                  <span className="text-xs text-gray-500 bg-blue-100 px-2 py-1 rounded">
                    {mapping.shift_type}
                  </span>
                  {mapping.auto_deploy && (
                    <span className="text-xs text-green-700 bg-green-100 px-2 py-1 rounded">
                      Auto-deploy
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleMappingEnabled(mapping.id, mapping.is_enabled)}
                    className={`px-3 py-1 rounded text-xs font-medium ${
                      mapping.is_enabled
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {mapping.is_enabled ? 'Enabled' : 'Disabled'}
                  </button>
                  <button
                    onClick={() => removeSecondaryMapping(mapping.id)}
                    className="text-red-600 hover:text-red-800 p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Closing Station Requirements</h3>
          <p className="text-sm text-gray-600 mb-6">
            Define which positions require closing training for night shifts.
          </p>

          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-3">Add New Requirement</h4>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <select
                value={newClosingReq.position_id}
                onChange={(e) => setNewClosingReq({ ...newClosingReq, position_id: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Position</option>
                {primaryPositions.map(pos => (
                  <option key={pos.id} value={pos.id}>{pos.name}</option>
                ))}
              </select>

              <select
                value={newClosingReq.shift_type}
                onChange={(e) => setNewClosingReq({ ...newClosingReq, shift_type: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="Night Shift">Night Shift</option>
                <option value="Day Shift">Day Shift</option>
                <option value="Both">Both Shifts</option>
              </select>

              <input
                type="number"
                min="1"
                value={newClosingReq.minimum_trained_staff}
                onChange={(e) => setNewClosingReq({ ...newClosingReq, minimum_trained_staff: parseInt(e.target.value) || 1 })}
                placeholder="Min Staff"
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />

              <input
                type="time"
                value={newClosingReq.closing_start_time}
                onChange={(e) => setNewClosingReq({ ...newClosingReq, closing_start_time: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />

              <button
                onClick={addClosingRequirement}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add
              </button>
            </div>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {closingRequirements.map((req) => (
              <div key={req.id} className={`flex items-center justify-between p-3 rounded-lg ${
                req.is_active ? 'bg-gray-50' : 'bg-gray-100 opacity-60'
              }`}>
                <div className="flex items-center gap-4 flex-1">
                  <Shield className={`w-4 h-4 ${req.is_active ? 'text-blue-600' : 'text-gray-400'}`} />
                  <span className="font-medium text-gray-900">
                    {req.position?.name || 'Unknown'}
                  </span>
                  <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">
                    {req.shift_type}
                  </span>
                  <span className="text-xs text-gray-500 bg-blue-100 px-2 py-1 rounded">
                    Min: {req.minimum_trained_staff} staff
                  </span>
                  <span className="text-xs text-gray-500 bg-yellow-100 px-2 py-1 rounded">
                    From: {req.closing_start_time}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleClosingActive(req.id, req.is_active)}
                    className={`px-3 py-1 rounded text-xs font-medium ${
                      req.is_active
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {req.is_active ? 'Active' : 'Inactive'}
                  </button>
                  <button
                    onClick={() => removeClosingRequirement(req.id)}
                    className="text-red-600 hover:text-red-800 p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PositionRelationshipsManager;
