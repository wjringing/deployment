import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { User, Plus, Trash2, Save, Star } from 'lucide-react';

export default function StaffDefaultPositionsManager() {
  const [staff, setStaff] = useState([]);
  const [positions, setPositions] = useState([]);
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [defaultPositions, setDefaultPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedStaffId) {
      loadDefaultPositions(selectedStaffId);
    } else {
      setDefaultPositions([]);
    }
  }, [selectedStaffId]);

  const loadData = async () => {
    try {
      setLoading(true);

      const [staffRes, positionsRes] = await Promise.all([
        supabase.from('staff').select('*').order('name'),
        supabase.from('positions').select('*').eq('type', 'position').order('name')
      ]);

      if (staffRes.error) throw staffRes.error;
      if (positionsRes.error) throw positionsRes.error;

      setStaff(staffRes.data || []);
      setPositions(positionsRes.data || []);

      if (staffRes.data && staffRes.data.length > 0) {
        setSelectedStaffId(staffRes.data[0].id);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      setMessage('Error loading data');
    } finally {
      setLoading(false);
    }
  };

  const loadDefaultPositions = async (staffId) => {
    try {
      const { data, error } = await supabase
        .from('staff_default_positions')
        .select(`
          id,
          priority,
          shift_type,
          notes,
          positions (
            id,
            name
          )
        `)
        .eq('staff_id', staffId)
        .order('priority');

      if (error) throw error;

      setDefaultPositions(data || []);
    } catch (error) {
      console.error('Error loading default positions:', error);
      setMessage('Error loading default positions');
    }
  };

  const addDefaultPosition = () => {
    if (positions.length === 0) return;

    const newPosition = {
      id: null,
      staff_id: selectedStaffId,
      position_id: positions[0].id,
      priority: defaultPositions.length + 1,
      shift_type: 'Both',
      notes: '',
      positions: positions[0],
      isNew: true
    };

    setDefaultPositions([...defaultPositions, newPosition]);
  };

  const removePosition = (index) => {
    const newPositions = [...defaultPositions];
    newPositions.splice(index, 1);
    // Re-calculate priorities
    newPositions.forEach((p, i) => {
      p.priority = i + 1;
    });
    setDefaultPositions(newPositions);
  };

  const updatePosition = (index, field, value) => {
    const newPositions = [...defaultPositions];

    if (field === 'position_id') {
      const selectedPos = positions.find(p => p.id === value);
      newPositions[index].position_id = value;
      newPositions[index].positions = selectedPos || { id: '', name: '' };
    } else {
      newPositions[index][field] = value;
    }

    setDefaultPositions(newPositions);
  };

  const saveDefaultPositions = async () => {
    try {
      setSaving(true);
      setMessage('');

      // Delete existing defaults for this staff
      const { error: deleteError } = await supabase
        .from('staff_default_positions')
        .delete()
        .eq('staff_id', selectedStaffId);

      if (deleteError) throw deleteError;

      // Insert new defaults
      if (defaultPositions.length > 0) {
        const positionsToInsert = defaultPositions.map(p => ({
          staff_id: selectedStaffId,
          position_id: p.position_id || p.positions.id,
          priority: p.priority,
          shift_type: p.shift_type,
          notes: p.notes || ''
        }));

        const { error: insertError } = await supabase
          .from('staff_default_positions')
          .insert(positionsToInsert);

        if (insertError) throw insertError;
      }

      setMessage('Default positions saved successfully!');

      // Reload to get fresh data with IDs
      await loadDefaultPositions(selectedStaffId);

      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error saving default positions:', error);
      setMessage('Error saving: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const selectedStaff = staff.find(s => s.id === selectedStaffId);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  if (staff.length === 0) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <p className="text-yellow-800">No staff members found. Please add staff first.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Star className="w-7 h-7 text-red-600" />
            Staff Default Positions
          </h2>
          <p className="text-gray-600 mt-1">
            Set preferred default positions for staff members
          </p>
        </div>

        {message && (
          <div className={`mb-4 p-4 rounded-lg ${
            message.includes('Error') ? 'bg-red-50 text-red-800' : 'bg-green-50 text-green-800'
          }`}>
            {message}
          </div>
        )}

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Staff Member
            </label>
            <select
              value={selectedStaffId}
              onChange={(e) => setSelectedStaffId(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            >
              {staff.map(member => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-900">
                Default Positions for {selectedStaff?.name}
              </h3>
              <button
                onClick={addDefaultPosition}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Default Position
              </button>
            </div>

            <div className="space-y-3">
              {defaultPositions.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg text-gray-500">
                  No default positions set for this staff member.
                  <br />
                  Click "Add Default Position" to set one.
                </div>
              ) : (
                defaultPositions.map((defPos, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg"
                  >
                    <div className="flex-shrink-0 w-24">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Priority
                      </label>
                      <input
                        type="number"
                        value={defPos.priority}
                        onChange={(e) => updatePosition(index, 'priority', parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                        min="1"
                      />
                    </div>

                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Position
                      </label>
                      <select
                        value={defPos.position_id || defPos.positions?.id}
                        onChange={(e) => updatePosition(index, 'position_id', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                      >
                        {positions.map(pos => (
                          <option key={pos.id} value={pos.id}>
                            {pos.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex-shrink-0 w-40">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Shift Type
                      </label>
                      <select
                        value={defPos.shift_type}
                        onChange={(e) => updatePosition(index, 'shift_type', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                      >
                        <option value="Both">Both Shifts</option>
                        <option value="Day Shift">Day Shift</option>
                        <option value="Night Shift">Night Shift</option>
                      </select>
                    </div>

                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Notes
                      </label>
                      <input
                        type="text"
                        value={defPos.notes || ''}
                        onChange={(e) => updatePosition(index, 'notes', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                        placeholder="Optional notes"
                      />
                    </div>

                    <button
                      onClick={() => removePosition(index)}
                      className="flex-shrink-0 mt-6 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Remove"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 pt-4 border-t">
            <button
              onClick={saveDefaultPositions}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-5 h-5" />
              {saving ? 'Saving...' : 'Save Default Positions'}
            </button>
            <button
              onClick={() => loadDefaultPositions(selectedStaffId)}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      <div className="bg-blue-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">
          How it works
        </h3>
        <ul className="space-y-2 text-blue-800">
          <li className="flex items-start gap-2">
            <span className="flex-shrink-0 mt-1">•</span>
            <span><strong>Priority 1</strong> will be assigned first during auto-assignment (Score: 1009)</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="flex-shrink-0 mt-1">•</span>
            <span>Default positions get <strong>highest priority</strong> over training-based assignments</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="flex-shrink-0 mt-1">•</span>
            <span><strong>Shift Type</strong> controls when this default applies (Day/Night/Both)</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="flex-shrink-0 mt-1">•</span>
            <span>Example: Samantha Edwards → Burgers (Priority 1, Both shifts)</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="flex-shrink-0 mt-1">•</span>
            <span>If position is full, system will try Priority 2, then training-based positions</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
