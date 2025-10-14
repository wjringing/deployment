import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { toast } from 'sonner';
import { Link, Trash2, Plus, Save, RefreshCw, MapPin, Edit } from 'lucide-react';

export default function StationPositionMappingPage() {
  const [stations, setStations] = useState([]);
  const [selectedStation, setSelectedStation] = useState(null);
  const [mappings, setMappings] = useState([]);
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingStation, setEditingStation] = useState(null);
  const [newStationName, setNewStationName] = useState('');
  const [newStationCode, setNewStationCode] = useState('');

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

      const [stationsRes, positionsRes] = await Promise.all([
        supabase
          .from('stations')
          .select('*')
          .eq('is_active', true)
          .order('display_order'),
        supabase
          .from('positions')
          .select('*')
          .eq('type', 'position')
          .order('name')
      ]);

      if (stationsRes.error) throw stationsRes.error;
      if (positionsRes.error) throw positionsRes.error;

      setStations(stationsRes.data || []);
      setPositions(positionsRes.data || []);

      if (stationsRes.data && stationsRes.data.length > 0 && !selectedStation) {
        setSelectedStation(stationsRes.data[0].id);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadMappingsForStation = async (stationId) => {
    try {
      const { data, error } = await supabase
        .from('station_position_mappings')
        .select('*')
        .eq('station_id', stationId)
        .order('created_at');

      if (error) throw error;

      setMappings(data || []);
    } catch (error) {
      console.error('Error loading mappings:', error);
      toast.error('Failed to load mappings');
    }
  };

  const addMapping = async () => {
    if (!selectedStation || positions.length === 0) {
      toast.error('Please select a station and ensure positions exist');
      return;
    }

    try {
      const newMapping = {
        station_id: selectedStation,
        position: positions[0].name,
        is_primary: mappings.length === 0
      };

      const { error } = await supabase
        .from('station_position_mappings')
        .insert([newMapping]);

      if (error) throw error;

      toast.success('Position mapping added');
      loadMappingsForStation(selectedStation);
    } catch (error) {
      console.error('Error adding mapping:', error);
      toast.error('Failed to add mapping');
    }
  };

  const removeMapping = async (id) => {
    if (!confirm('Are you sure you want to remove this mapping?')) return;

    try {
      const { error } = await supabase
        .from('station_position_mappings')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Mapping removed');
      loadMappingsForStation(selectedStation);
    } catch (error) {
      console.error('Error removing mapping:', error);
      toast.error('Failed to remove mapping');
    }
  };

  const updateMapping = async (id, field, value) => {
    try {
      const { error } = await supabase
        .from('station_position_mappings')
        .update({ [field]: value })
        .eq('id', id);

      if (error) throw error;

      toast.success('Mapping updated');
      loadMappingsForStation(selectedStation);
    } catch (error) {
      console.error('Error updating mapping:', error);
      toast.error('Failed to update mapping');
    }
  };

  const handleAddStation = async () => {
    if (!newStationName || !newStationCode) {
      toast.error('Please enter station name and code');
      return;
    }

    try {
      const maxOrder = Math.max(...stations.map(s => s.display_order), 0);
      const { error } = await supabase
        .from('stations')
        .insert([{
          station_name: newStationName,
          station_code: newStationCode,
          display_order: maxOrder + 1
        }]);

      if (error) throw error;

      toast.success('Station added successfully');
      setNewStationName('');
      setNewStationCode('');
      loadData();
    } catch (error) {
      console.error('Error adding station:', error);
      toast.error('Failed to add station');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <RefreshCw className="h-8 w-8 animate-spin text-gray-600" />
      </div>
    );
  }

  const currentStation = stations.find(s => s.id === selectedStation);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <MapPin className="h-8 w-8" />
            Station-Position Mapping
          </h1>
          <p className="text-gray-600 mt-1">
            Configure which positions are available at each station
          </p>
        </div>
        <Button onClick={loadData} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 md:col-span-1">
          <h2 className="text-xl font-bold mb-4">Stations</h2>

          <div className="space-y-2 mb-4">
            {stations.map(station => (
              <button
                key={station.id}
                onClick={() => setSelectedStation(station.id)}
                className={`w-full text-left p-3 rounded-lg transition-colors ${
                  selectedStation === station.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 hover:bg-gray-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold">{station.station_name}</p>
                    <p className="text-sm opacity-75">{station.station_code}</p>
                  </div>
                  {selectedStation === station.id && <MapPin className="h-5 w-5" />}
                </div>
              </button>
            ))}
          </div>

          <div className="border-t pt-4">
            <h3 className="font-bold mb-2">Add New Station</h3>
            <div className="space-y-2">
              <Input
                value={newStationName}
                onChange={(e) => setNewStationName(e.target.value)}
                placeholder="Station name"
              />
              <Input
                value={newStationCode}
                onChange={(e) => setNewStationCode(e.target.value)}
                placeholder="Code (e.g., FC, DTW)"
              />
              <Button onClick={handleAddStation} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add Station
              </Button>
            </div>
          </div>
        </Card>

        <Card className="p-6 md:col-span-2">
          {currentStation ? (
            <>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold">{currentStation.station_name}</h2>
                  <p className="text-sm text-gray-600">Code: {currentStation.station_code}</p>
                </div>
                <Button onClick={addMapping}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Position
                </Button>
              </div>

              <div className="space-y-3">
                {mappings.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <MapPin className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No positions mapped to this station</p>
                    <p className="text-sm">Click "Add Position" to get started</p>
                  </div>
                ) : (
                  mappings.map(mapping => {
                    const position = positions.find(p => p.name === mapping.position);
                    return (
                      <div
                        key={mapping.id}
                        className="flex items-center gap-3 p-4 border rounded-lg"
                      >
                        <div className="flex-1">
                          <Label>Position</Label>
                          <select
                            value={mapping.position}
                            onChange={(e) => updateMapping(mapping.id, 'position', e.target.value)}
                            className="w-full px-3 py-2 border rounded-md"
                          >
                            {positions.map(pos => (
                              <option key={pos.id} value={pos.name}>
                                {pos.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="flex-shrink-0">
                          <Label>Primary</Label>
                          <div className="mt-2">
                            <input
                              type="checkbox"
                              checked={mapping.is_primary}
                              onChange={(e) => updateMapping(mapping.id, 'is_primary', e.target.checked)}
                              className="w-5 h-5"
                            />
                          </div>
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeMapping(mapping.id)}
                          className="mt-6"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <MapPin className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p>Select a station to view and manage position mappings</p>
            </div>
          )}
        </Card>
      </div>

      <Card className="p-6 bg-blue-50">
        <h3 className="text-lg font-bold text-blue-900 mb-2">How It Works</h3>
        <ul className="space-y-2 text-blue-800 text-sm">
          <li className="flex items-start gap-2">
            <span className="flex-shrink-0 mt-1">•</span>
            <span>Each station can have multiple positions mapped to it</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="flex-shrink-0 mt-1">•</span>
            <span>Mark one position as "Primary" for the default assignment</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="flex-shrink-0 mt-1">•</span>
            <span>Staff trained for a station can be assigned to any mapped position</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="flex-shrink-0 mt-1">•</span>
            <span>Used by the auto-assignment system to intelligently place staff</span>
          </li>
        </ul>
      </Card>
    </div>
  );
}
