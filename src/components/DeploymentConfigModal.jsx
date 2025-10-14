import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { X, Settings, ChefHat, Users, CheckCircle, AlertCircle } from 'lucide-react';

const DeploymentConfigModal = ({ isOpen, onClose, onConfirm, shiftType, selectedDate }) => {
  const [config, setConfig] = useState({
    dt_type: 'DT1',
    num_cooks: 1,
    num_pack_stations: 2,
    require_shift_runner: true,
    require_manager: true
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadedFromDb, setLoadedFromDb] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadConfiguration();
    }
  }, [isOpen, shiftType, selectedDate]);

  const loadConfiguration = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('shift_configuration_rules')
        .select('*')
        .eq('config_name', 'default')
        .eq('is_active', true)
        .or(`shift_type.eq.${shiftType},shift_type.eq.Both`)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error loading configuration:', error);
        return;
      }

      if (data) {
        setConfig({
          dt_type: data.dt_type || 'DT1',
          num_cooks: data.num_cooks || 1,
          num_pack_stations: data.num_pack_stations || 2,
          require_shift_runner: data.require_shift_runner !== false,
          require_manager: data.require_manager !== false
        });
        setLoadedFromDb(true);
      }
    } catch (error) {
      console.error('Error loading configuration:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAsDefault = async () => {
    try {
      setSaving(true);

      const { error } = await supabase
        .from('shift_configuration_rules')
        .upsert({
          config_name: 'default',
          shift_type: 'Both',
          dt_type: config.dt_type,
          num_cooks: config.num_cooks,
          num_pack_stations: config.num_pack_stations,
          require_shift_runner: config.require_shift_runner,
          require_manager: config.require_manager,
          is_active: true,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'config_name,shift_type,effective_date'
        });

      if (error) throw error;

      alert('Configuration saved as default');
      setLoadedFromDb(true);
    } catch (error) {
      console.error('Error saving configuration:', error);
      alert('Failed to save configuration: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleConfirm = () => {
    onConfirm(config);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold flex items-center gap-2">
            <Settings className="w-6 h-6 text-blue-600" />
            Auto-Assignment Configuration
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading configuration...</p>
          </div>
        ) : (
          <>
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                Configure operational parameters for <strong>{shiftType}</strong> on{' '}
                <strong>{new Date(selectedDate).toLocaleDateString()}</strong>
              </p>
            </div>

            <div className="space-y-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5 text-green-600" />
                  Drive-Through Configuration
                </h3>

                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Drive-Through Type
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      <button
                        onClick={() => setConfig({ ...config, dt_type: 'DT1' })}
                        className={`px-4 py-3 rounded-lg border-2 transition-all ${
                          config.dt_type === 'DT1'
                            ? 'border-blue-600 bg-blue-50 text-blue-700 font-semibold'
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        DT1
                      </button>
                      <button
                        onClick={() => setConfig({ ...config, dt_type: 'DT2' })}
                        className={`px-4 py-3 rounded-lg border-2 transition-all ${
                          config.dt_type === 'DT2'
                            ? 'border-blue-600 bg-blue-50 text-blue-700 font-semibold'
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        DT2
                      </button>
                      <button
                        onClick={() => setConfig({ ...config, dt_type: 'None' })}
                        className={`px-4 py-3 rounded-lg border-2 transition-all ${
                          config.dt_type === 'None'
                            ? 'border-blue-600 bg-blue-50 text-blue-700 font-semibold'
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        None
                      </button>
                    </div>
                    <p className="mt-2 text-xs text-gray-500">
                      {config.dt_type === 'DT1' && 'DT1 requires a DT Presenter position'}
                      {config.dt_type === 'DT2' && 'DT2 does not require a DT Presenter'}
                      {config.dt_type === 'None' && 'No drive-through service'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <ChefHat className="w-5 h-5 text-orange-600" />
                  Kitchen Configuration
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Number of Cooks
                    </label>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setConfig({ ...config, num_cooks: Math.max(0, config.num_cooks - 1) })}
                        className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded"
                      >
                        -
                      </button>
                      <span className="text-2xl font-bold w-12 text-center">{config.num_cooks}</span>
                      <button
                        onClick={() => setConfig({ ...config, num_cooks: Math.min(5, config.num_cooks + 1) })}
                        className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Number of Pack Stations
                    </label>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setConfig({ ...config, num_pack_stations: Math.max(0, config.num_pack_stations - 1) })}
                        className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded"
                      >
                        -
                      </button>
                      <span className="text-2xl font-bold w-12 text-center">{config.num_pack_stations}</span>
                      <button
                        onClick={() => setConfig({ ...config, num_pack_stations: Math.min(5, config.num_pack_stations + 1) })}
                        className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-4">Required Positions</h3>

                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.require_shift_runner}
                      onChange={(e) => setConfig({ ...config, require_shift_runner: e.target.checked })}
                      className="w-5 h-5 text-blue-600 rounded"
                    />
                    <span className="text-sm font-medium">Require Shift Runner</span>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.require_manager}
                      onChange={(e) => setConfig({ ...config, require_manager: e.target.checked })}
                      className="w-5 h-5 text-blue-600 rounded"
                    />
                    <span className="text-sm font-medium">Require Manager</span>
                  </label>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-yellow-800">
                    <p className="font-semibold mb-1">Configuration Summary</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Drive-Through: {config.dt_type}</li>
                      <li>Cooks needed: {config.num_cooks}</li>
                      <li>Pack stations: {config.num_pack_stations}</li>
                      {config.require_shift_runner && <li>Shift Runner required</li>}
                      {config.require_manager && <li>Manager required</li>}
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={handleConfirm}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center justify-center gap-2 font-semibold"
              >
                <CheckCircle className="w-5 h-5" />
                Confirm & Start Auto-Assignment
              </button>
              <button
                onClick={handleSaveAsDefault}
                disabled={saving}
                className="px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg font-semibold"
              >
                {saving ? 'Saving...' : 'Save as Default'}
              </button>
              <button
                onClick={onClose}
                className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>

            {loadedFromDb && (
              <div className="mt-3 text-center">
                <p className="text-xs text-green-600 flex items-center justify-center gap-1">
                  <CheckCircle className="w-4 h-4" />
                  Configuration loaded from saved defaults
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default DeploymentConfigModal;
