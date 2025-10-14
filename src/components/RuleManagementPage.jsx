import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Trash2, Edit2, Save, X, AlertCircle, CheckCircle, Shield, Settings, List, Target } from 'lucide-react';

const RuleManagementPage = () => {
  const [activeTab, setActiveTab] = useState('core');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [corePositions, setCorePositions] = useState([]);
  const [conditionalRules, setConditionalRules] = useState([]);
  const [positionRequirements, setPositionRequirements] = useState([]);
  const [allPositions, setAllPositions] = useState([]);

  const [editingCorePosition, setEditingCorePosition] = useState(null);
  const [editingRule, setEditingRule] = useState(null);
  const [editingRequirement, setEditingRequirement] = useState(null);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    await Promise.all([
      loadPositions(),
      loadCorePositions(),
      loadConditionalRules(),
      loadPositionRequirements()
    ]);
    setLoading(false);
  };

  const loadPositions = async () => {
    const { data, error } = await supabase
      .from('positions')
      .select('*')
      .order('name');

    if (!error && data) {
      setAllPositions(data);
    }
  };

  const loadCorePositions = async () => {
    const { data, error } = await supabase
      .from('core_positions')
      .select(`
        *,
        positions (
          id,
          name
        )
      `)
      .order('priority');

    if (!error && data) {
      setCorePositions(data);
    }
  };

  const loadConditionalRules = async () => {
    const { data, error } = await supabase
      .from('conditional_staffing_rules')
      .select('*')
      .order('priority');

    if (!error && data) {
      setConditionalRules(data);
    }
  };

  const loadPositionRequirements = async () => {
    const { data, error } = await supabase
      .from('position_requirements')
      .select(`
        *,
        positions (
          id,
          name
        )
      `)
      .order('positions(name)');

    if (!error && data) {
      setPositionRequirements(data);
    }
  };

  const handleSaveCorePosition = async (position) => {
    try {
      setSaving(true);

      if (position.id && position.id.startsWith('new-')) {
        delete position.id;
        const { error } = await supabase
          .from('core_positions')
          .insert([position]);

        if (error) throw error;
      } else if (position.id) {
        const { error } = await supabase
          .from('core_positions')
          .update(position)
          .eq('id', position.id);

        if (error) throw error;
      }

      await loadCorePositions();
      setEditingCorePosition(null);
    } catch (error) {
      console.error('Error saving core position:', error);
      alert('Failed to save: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCorePosition = async (id) => {
    if (!confirm('Are you sure you want to delete this core position?')) return;

    try {
      const { error } = await supabase
        .from('core_positions')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await loadCorePositions();
    } catch (error) {
      console.error('Error deleting core position:', error);
      alert('Failed to delete: ' + error.message);
    }
  };

  const handleSaveConditionalRule = async (rule) => {
    try {
      setSaving(true);

      if (rule.id && rule.id.startsWith('new-')) {
        delete rule.id;
        const { error } = await supabase
          .from('conditional_staffing_rules')
          .insert([rule]);

        if (error) throw error;
      } else if (rule.id) {
        const { error } = await supabase
          .from('conditional_staffing_rules')
          .update(rule)
          .eq('id', rule.id);

        if (error) throw error;
      }

      await loadConditionalRules();
      setEditingRule(null);
    } catch (error) {
      console.error('Error saving conditional rule:', error);
      alert('Failed to save: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConditionalRule = async (id) => {
    if (!confirm('Are you sure you want to delete this rule?')) return;

    try {
      const { error } = await supabase
        .from('conditional_staffing_rules')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await loadConditionalRules();
    } catch (error) {
      console.error('Error deleting rule:', error);
      alert('Failed to delete: ' + error.message);
    }
  };

  const handleToggleActive = async (table, id, currentState) => {
    try {
      const { error } = await supabase
        .from(table)
        .update({ is_active: !currentState })
        .eq('id', id);

      if (error) throw error;
      await loadAllData();
    } catch (error) {
      console.error('Error toggling active state:', error);
      alert('Failed to update: ' + error.message);
    }
  };

  const renderCorePositionsTab = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold">Core Positions</h3>
          <p className="text-sm text-gray-600">Define positions that must always be filled</p>
        </div>
        <button
          onClick={() => setEditingCorePosition({
            id: 'new-' + Date.now(),
            position_id: '',
            priority: 1,
            shift_type: 'Both',
            min_count: 1,
            max_count: 1,
            is_mandatory: true,
            description: '',
            is_active: true
          })}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Core Position
        </button>
      </div>

      {editingCorePosition && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <h4 className="font-semibold mb-3">
            {editingCorePosition.id.startsWith('new-') ? 'Add New' : 'Edit'} Core Position
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
              <select
                value={editingCorePosition.position_id}
                onChange={(e) => setEditingCorePosition({ ...editingCorePosition, position_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">Select Position</option>
                {allPositions.map(pos => (
                  <option key={pos.id} value={pos.id}>{pos.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Shift Type</label>
              <select
                value={editingCorePosition.shift_type}
                onChange={(e) => setEditingCorePosition({ ...editingCorePosition, shift_type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="Both">Both Shifts</option>
                <option value="Day Shift">Day Shift Only</option>
                <option value="Night Shift">Night Shift Only</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <input
                type="number"
                min="1"
                max="100"
                value={editingCorePosition.priority}
                onChange={(e) => setEditingCorePosition({ ...editingCorePosition, priority: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Min Count</label>
              <input
                type="number"
                min="0"
                value={editingCorePosition.min_count}
                onChange={(e) => setEditingCorePosition({ ...editingCorePosition, min_count: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Count</label>
              <input
                type="number"
                min="0"
                value={editingCorePosition.max_count}
                onChange={(e) => setEditingCorePosition({ ...editingCorePosition, max_count: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 mt-6">
                <input
                  type="checkbox"
                  checked={editingCorePosition.is_mandatory}
                  onChange={(e) => setEditingCorePosition({ ...editingCorePosition, is_mandatory: e.target.checked })}
                  className="w-4 h-4"
                />
                <span className="text-sm font-medium">Mandatory</span>
              </label>
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={editingCorePosition.description}
                onChange={(e) => setEditingCorePosition({ ...editingCorePosition, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                rows="2"
              />
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <button
              onClick={() => handleSaveCorePosition(editingCorePosition)}
              disabled={saving || !editingCorePosition.position_id}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={() => setEditingCorePosition(null)}
              className="bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {corePositions.map((cp) => (
          <div
            key={cp.id}
            className={`p-4 border rounded-lg ${cp.is_active ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-300 opacity-60'}`}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <span className="text-lg font-semibold">{cp.positions?.name || 'Unknown Position'}</span>
                  <span className="text-sm px-2 py-1 bg-blue-100 text-blue-800 rounded">
                    Priority: {cp.priority}
                  </span>
                  <span className="text-sm px-2 py-1 bg-gray-100 text-gray-800 rounded">
                    {cp.shift_type}
                  </span>
                  {cp.is_mandatory && (
                    <span className="text-sm px-2 py-1 bg-red-100 text-red-800 rounded">
                      Mandatory
                    </span>
                  )}
                  {!cp.is_active && (
                    <span className="text-sm px-2 py-1 bg-gray-100 text-gray-600 rounded">
                      Inactive
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  Count: {cp.min_count} - {cp.max_count}
                  {cp.description && ` • ${cp.description}`}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleToggleActive('core_positions', cp.id, cp.is_active)}
                  className={`px-3 py-1 rounded text-sm ${
                    cp.is_active
                      ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                      : 'bg-green-100 text-green-800 hover:bg-green-200'
                  }`}
                >
                  {cp.is_active ? 'Deactivate' : 'Activate'}
                </button>
                <button
                  onClick={() => setEditingCorePosition(cp)}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDeleteCorePosition(cp.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {corePositions.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <Target className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No core positions defined</p>
            <p className="text-sm">Add positions that must always be filled during shifts</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderConditionalRulesTab = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold">Conditional Staffing Rules</h3>
          <p className="text-sm text-gray-600">Define rules that apply based on operational conditions</p>
        </div>
        <button
          onClick={() => setEditingRule({
            id: 'new-' + Date.now(),
            rule_name: '',
            rule_type: 'require_position',
            condition: { dt_type: 'DT1' },
            action: { require_position: '', count: 1 },
            priority: 1,
            description: '',
            is_active: true
          })}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Rule
        </button>
      </div>

      {editingRule && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <h4 className="font-semibold mb-3">
            {editingRule.id.startsWith('new-') ? 'Add New' : 'Edit'} Conditional Rule
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rule Name</label>
              <input
                type="text"
                value={editingRule.rule_name}
                onChange={(e) => setEditingRule({ ...editingRule, rule_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="e.g., DT1 Requires Presenter"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rule Type</label>
              <select
                value={editingRule.rule_type}
                onChange={(e) => setEditingRule({ ...editingRule, rule_type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="require_position">Require Position</option>
                <option value="exclude_position">Exclude Position</option>
                <option value="adjust_count">Adjust Count</option>
                <option value="custom">Custom</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <input
                type="number"
                min="1"
                max="1000"
                value={editingRule.priority}
                onChange={(e) => setEditingRule({ ...editingRule, priority: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Condition (JSON)</label>
              <textarea
                value={JSON.stringify(editingRule.condition, null, 2)}
                onChange={(e) => {
                  try {
                    setEditingRule({ ...editingRule, condition: JSON.parse(e.target.value) });
                  } catch (err) {
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm"
                rows="3"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Action (JSON)</label>
              <textarea
                value={JSON.stringify(editingRule.action, null, 2)}
                onChange={(e) => {
                  try {
                    setEditingRule({ ...editingRule, action: JSON.parse(e.target.value) });
                  } catch (err) {
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm"
                rows="3"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={editingRule.description}
                onChange={(e) => setEditingRule({ ...editingRule, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                rows="2"
              />
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <button
              onClick={() => handleSaveConditionalRule(editingRule)}
              disabled={saving || !editingRule.rule_name}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={() => setEditingRule(null)}
              className="bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {conditionalRules.map((rule) => (
          <div
            key={rule.id}
            className={`p-4 border rounded-lg ${rule.is_active ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-300 opacity-60'}`}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <span className="text-lg font-semibold">{rule.rule_name}</span>
                  <span className="text-sm px-2 py-1 bg-blue-100 text-blue-800 rounded">
                    {rule.rule_type}
                  </span>
                  <span className="text-sm px-2 py-1 bg-gray-100 text-gray-800 rounded">
                    Priority: {rule.priority}
                  </span>
                  {!rule.is_active && (
                    <span className="text-sm px-2 py-1 bg-gray-100 text-gray-600 rounded">
                      Inactive
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 mt-1">{rule.description}</p>
                <div className="mt-2 flex gap-4 text-xs">
                  <div>
                    <span className="font-semibold">Condition:</span>
                    <pre className="mt-1 p-2 bg-gray-100 rounded">{JSON.stringify(rule.condition, null, 2)}</pre>
                  </div>
                  <div>
                    <span className="font-semibold">Action:</span>
                    <pre className="mt-1 p-2 bg-gray-100 rounded">{JSON.stringify(rule.action, null, 2)}</pre>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 ml-4">
                <button
                  onClick={() => handleToggleActive('conditional_staffing_rules', rule.id, rule.is_active)}
                  className={`px-3 py-1 rounded text-sm ${
                    rule.is_active
                      ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                      : 'bg-green-100 text-green-800 hover:bg-green-200'
                  }`}
                >
                  {rule.is_active ? 'Deactivate' : 'Activate'}
                </button>
                <button
                  onClick={() => setEditingRule(rule)}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDeleteConditionalRule(rule.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {conditionalRules.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <Shield className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No conditional rules defined</p>
            <p className="text-sm">Add rules to automatically adjust staffing based on conditions</p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Settings className="w-7 h-7 text-blue-600" />
              Rule Management System
            </h1>
            <p className="text-gray-600 mt-1">Configure staffing rules and position requirements</p>
          </div>
        </div>

        <div className="flex gap-2 mb-6 border-b">
          <button
            onClick={() => setActiveTab('core')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'core'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4" />
              Core Positions
            </div>
          </button>
          <button
            onClick={() => setActiveTab('rules')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'rules'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Conditional Rules
            </div>
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading rules...</p>
          </div>
        ) : (
          <>
            {activeTab === 'core' && renderCorePositionsTab()}
            {activeTab === 'rules' && renderConditionalRulesTab()}
          </>
        )}
      </div>
    </div>
  );
};

export default RuleManagementPage;
