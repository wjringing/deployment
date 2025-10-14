import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Link, Trash2, Plus, Save, RefreshCw } from 'lucide-react';

const STATIONS = [
  { name: 'BOH Cook', category: 'BOH' },
  { name: 'FOH Cashier', category: 'FOH' },
  { name: 'FOH Guest Host', category: 'FOH' },
  { name: 'FOH Pack', category: 'FOH' },
  { name: 'FOH Present', category: 'FOH' },
  { name: 'MOH Burgers', category: 'MOH' },
  { name: 'MOH Chicken Pack', category: 'MOH' },
  { name: 'Freezer to Fryer', category: 'MOH' },
  { name: 'MOH Sides', category: 'MOH' },
];

export default function StationPositionMappingPage() {
  const [selectedStation, setSelectedStation] = useState(STATIONS[0].name);
  const [mappings, setMappings] = useState([]);
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedStation) {
      loadMappingsForStation(selectedStation);
    }
  }, [selectedStation]);

  const loadData = async () => {
    try {
      setLoading(true);

      const { data: positionsData, error: posError } = await supabase
        .from('positions')
        .select('*')
        .eq('type', 'position')
        .order('name');

      if (posError) throw posError;

      setPositions(positionsData || []);
    } catch (error) {
      console.error('Error loading data:', error);
      setMessage('Error loading positions');
    } finally {
      setLoading(false);
    }
  };

  const loadMappingsForStation = async (stationName) => {
    try {
      const { data, error } = await supabase
        .from('station_position_mappings')
        .select(`
          id,
          station_name,
          station_category,
          priority,
          notes,
          positions (
            id,
            name
          )
        `)
        .eq('station_name', stationName)
        .order('priority');

      if (error) throw error;

      setMappings(data || []);
    } catch (error) {
      console.error('Error loading mappings:', error);
      setMessage('Error loading mappings');
    }
  };

  const addMapping = () => {
    const newMapping = {
      id: null,
      station_name: selectedStation,
      station_category: STATIONS.find(s => s.name === selectedStation)?.category || 'FOH',
      position_id: positions[0]?.id || '',
      priority: mappings.length + 1,
      notes: '',
      positions: positions[0] || { id: '', name: '' },
      isNew: true
    };

    setMappings([...mappings, newMapping]);
  };

  const removeMapping = (index) => {
    const newMappings = [...mappings];
    newMappings.splice(index, 1);
    // Re-calculate priorities
    newMappings.forEach((m, i) => {
      m.priority = i + 1;
    });
    setMappings(newMappings);
  };

  const updateMapping = (index, field, value) => {
    const newMappings = [...mappings];

    if (field === 'position_id') {
      const selectedPos = positions.find(p => p.id === value);
      newMappings[index].position_id = value;
      newMappings[index].positions = selectedPos || { id: '', name: '' };
    } else {
      newMappings[index][field] = value;
    }

    setMappings(newMappings);
  };

  const saveMappings = async () => {
    try {
      setSaving(true);
      setMessage('');

      // Delete existing mappings for this station
      const { error: deleteError } = await supabase
        .from('station_position_mappings')
        .delete()
        .eq('station_name', selectedStation);

      if (deleteError) throw deleteError;

      // Insert new mappings
      if (mappings.length > 0) {
        const mappingsToInsert = mappings.map(m => ({
          station_name: m.station_name,
          station_category: m.station_category,
          position_id: m.position_id || m.positions.id,
          priority: m.priority,
          notes: m.notes || ''
        }));

        const { error: insertError } = await supabase
          .from('station_position_mappings')
          .insert(mappingsToInsert);

        if (insertError) throw insertError;
      }

      setMessage('Mappings saved successfully!');

      // Reload to get fresh data with IDs
      await loadMappingsForStation(selectedStation);

      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error saving mappings:', error);
      setMessage('Error saving mappings: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const getStationCategory = (stationName) => {
    return STATIONS.find(s => s.name === stationName)?.category || '';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Link className="w-7 h-7 text-red-600" />
              Station-Position Mapping
            </h2>
            <p className="text-gray-600 mt-1">
              Configure which training stations map to which deployment positions
            </p>
          </div>
          <button
            onClick={loadData}
            className="text-gray-600 hover:text-gray-900 p-2 rounded-lg hover:bg-gray-100"
            title="Refresh"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
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
              Select Training Station
            </label>
            <select
              value={selectedStation}
              onChange={(e) => setSelectedStation(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            >
              {STATIONS.map(station => (
                <option key={station.name} value={station.name}>
                  {station.name} ({station.category})
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-900">
                Mapped Positions
              </h3>
              <button
                onClick={addMapping}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Position
              </button>
            </div>

            <div className="space-y-3">
              {mappings.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No positions mapped yet. Click "Add Position" to get started.
                </div>
              ) : (
                mappings.map((mapping, index) => (
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
                        value={mapping.priority}
                        onChange={(e) => updateMapping(index, 'priority', parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                        min="1"
                      />
                    </div>

                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Position
                      </label>
                      <select
                        value={mapping.position_id || mapping.positions?.id}
                        onChange={(e) => updateMapping(index, 'position_id', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                      >
                        {positions.map(pos => (
                          <option key={pos.id} value={pos.id}>
                            {pos.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Notes
                      </label>
                      <input
                        type="text"
                        value={mapping.notes || ''}
                        onChange={(e) => updateMapping(index, 'notes', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                        placeholder="Optional notes"
                      />
                    </div>

                    <button
                      onClick={() => removeMapping(index)}
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
              onClick={saveMappings}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-5 h-5" />
              {saving ? 'Saving...' : 'Save Mappings'}
            </button>
            <button
              onClick={() => loadMappingsForStation(selectedStation)}
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
            <span>Priority 1 positions will be assigned first when auto-assigning</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="flex-shrink-0 mt-1">•</span>
            <span>Staff trained in a station can be auto-assigned to any mapped position</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="flex-shrink-0 mt-1">•</span>
            <span>The system will check staff rankings and sign-offs when assigning</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="flex-shrink-0 mt-1">•</span>
            <span>You can map one station to multiple positions with different priorities</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
