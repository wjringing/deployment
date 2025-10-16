import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { toast } from '../lib/toast';
import {
  Settings,
  Plus,
  Edit,
  Trash2,
  Save,
  RefreshCw,
  ToggleLeft,
  ToggleRight,
  ArrowUp,
  ArrowDown,
  History,
  TrendingUp
} from 'lucide-react';

export default function AutoAssignmentRulesPage() {
  const [rules, setRules] = useState([]);
  const [assignmentHistory, setAssignmentHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingRule, setEditingRule] = useState(null);
  const [showHistory, setShowHistory] = useState(false);

  const [formData, setFormData] = useState({
    rule_name: '',
    priority: 100,
    is_active: true,
    rule_type: 'skill_based',
    conditions: '{}',
    actions: '{}'
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      const [rulesRes, historyRes] = await Promise.all([
        supabase
          .from('auto_assignment_rules')
          .select('*')
          .order('priority'),
        supabase
          .from('assignment_history')
          .select(`
            *,
            deployment:deployment_id (
              date,
              shift_type
            ),
            staff:staff_id (
              name
            )
          `)
          .order('created_at', { ascending: false })
          .limit(50)
      ]);

      if (rulesRes.error) {
        console.error('Rules load error:', rulesRes.error);
        throw rulesRes.error;
      }
      if (historyRes.error) {
        console.error('History load error:', historyRes.error);
        throw historyRes.error;
      }

      console.log('Loaded rules:', rulesRes.data);
      setRules(rulesRes.data || []);
      setAssignmentHistory(historyRes.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load assignment rules: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRule = async () => {
    if (!formData.rule_name) {
      toast.error('Please enter a rule name');
      return;
    }

    try {
      let conditions = {};
      let actions = {};

      try {
        conditions = typeof formData.conditions === 'string'
          ? (formData.conditions.trim() ? JSON.parse(formData.conditions) : {})
          : formData.conditions || {};
      } catch (e) {
        toast.error('Invalid JSON in conditions field');
        return;
      }

      try {
        actions = typeof formData.actions === 'string'
          ? (formData.actions.trim() ? JSON.parse(formData.actions) : {})
          : formData.actions || {};
      } catch (e) {
        toast.error('Invalid JSON in actions field');
        return;
      }

      const ruleData = {
        rule_name: formData.rule_name,
        priority: formData.priority,
        is_active: formData.is_active,
        rule_type: formData.rule_type,
        conditions: conditions,
        actions: actions
      };

      console.log('Saving rule data:', ruleData);

      if (editingRule) {
        const { error } = await supabase
          .from('auto_assignment_rules')
          .update(ruleData)
          .eq('id', editingRule.id);

        if (error) throw error;
        toast.success('Rule updated successfully');
      } else {
        console.log('Inserting new rule...');
        const { data, error } = await supabase
          .from('auto_assignment_rules')
          .insert([ruleData])
          .select();

        if (error) {
          console.error('Insert error details:', error);
          throw error;
        }

        console.log('Rule created successfully:', data);
        toast.success('Rule created successfully');
      }

      console.log('Resetting form...');
      resetForm();
      console.log('Reloading data...');
      await loadData();
      console.log('Data reloaded.');
    } catch (error) {
      console.error('Error saving rule:', error);
      toast.error('Failed to save rule: ' + error.message);
    }
  };

  const handleEditRule = (rule) => {
    setEditingRule(rule);
    setFormData({
      rule_name: rule.rule_name,
      priority: rule.priority,
      is_active: rule.is_active,
      rule_type: rule.rule_type,
      conditions: JSON.stringify(rule.conditions, null, 2),
      actions: JSON.stringify(rule.actions, null, 2)
    });
  };

  const handleDeleteRule = async (id) => {
    if (!confirm('Are you sure you want to delete this rule?')) return;

    try {
      const { error } = await supabase
        .from('auto_assignment_rules')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Rule deleted successfully');
      loadData();
    } catch (error) {
      console.error('Error deleting rule:', error);
      toast.error('Failed to delete rule');
    }
  };

  const handleToggleActive = async (rule) => {
    try {
      const { error } = await supabase
        .from('auto_assignment_rules')
        .update({ is_active: !rule.is_active })
        .eq('id', rule.id);

      if (error) throw error;

      toast.success(`Rule ${!rule.is_active ? 'enabled' : 'disabled'}`);
      loadData();
    } catch (error) {
      console.error('Error toggling rule:', error);
      toast.error('Failed to toggle rule');
    }
  };

  const handleChangePriority = async (rule, direction) => {
    const newPriority = direction === 'up' ? rule.priority - 15 : rule.priority + 15;

    try {
      const { error } = await supabase
        .from('auto_assignment_rules')
        .update({ priority: Math.max(1, newPriority) })
        .eq('id', rule.id);

      if (error) throw error;

      toast.success('Priority updated');
      loadData();
    } catch (error) {
      console.error('Error changing priority:', error);
      toast.error('Failed to update priority');
    }
  };

  const resetForm = () => {
    setEditingRule(null);
    setFormData({
      rule_name: '',
      priority: 100,
      is_active: true,
      rule_type: 'skill_based',
      conditions: '{}',
      actions: '{}'
    });
  };

  const getRuleTypeColor = (type) => {
    const colors = {
      skill_based: 'bg-blue-100 text-blue-800',
      seniority_based: 'bg-green-100 text-green-800',
      time_based: 'bg-purple-100 text-purple-800',
      coverage_based: 'bg-orange-100 text-orange-800',
      position_based: 'bg-pink-100 text-pink-800'
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <RefreshCw className="h-8 w-8 animate-spin text-gray-600" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Settings className="h-8 w-8" />
            Auto-Assignment Rules
          </h1>
          <p className="text-gray-600 mt-1">
            Configure intelligent deployment assignment rules
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowHistory(!showHistory)}
          >
            <History className="h-4 w-4 mr-2" />
            {showHistory ? 'Hide' : 'Show'} History
          </Button>
          <Button onClick={loadData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Card className="p-6">
        <h2 className="text-xl font-bold mb-4">
          {editingRule ? 'Edit Rule' : 'Create New Rule'}
        </h2>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Rule Name</Label>
              <Input
                value={formData.rule_name}
                onChange={(e) => setFormData({ ...formData, rule_name: e.target.value })}
                placeholder="e.g., Peak Hours Staffing"
              />
            </div>

            <div>
              <Label>Rule Type</Label>
              <select
                value={formData.rule_type}
                onChange={(e) => setFormData({ ...formData, rule_type: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="skill_based">Skill Based</option>
                <option value="seniority_based">Seniority Based</option>
                <option value="time_based">Time Based</option>
                <option value="coverage_based">Coverage Based</option>
                <option value="position_based">Position Based</option>
              </select>
            </div>

            <div>
              <Label>Priority (lower = higher priority)</Label>
              <Input
                type="number"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 100 })}
              />
            </div>
          </div>

          <div>
            <Label>Conditions (JSON)</Label>
            <textarea
              value={typeof formData.conditions === 'string' ? formData.conditions : JSON.stringify(formData.conditions, null, 2)}
              onChange={(e) => setFormData({ ...formData, conditions: e.target.value })}
              className="w-full px-3 py-2 border rounded-md font-mono text-sm min-h-[100px]"
              placeholder='{"requires_certification": true}'
            />
          </div>

          <div>
            <Label>Actions (JSON)</Label>
            <textarea
              value={typeof formData.actions === 'string' ? formData.actions : JSON.stringify(formData.actions, null, 2)}
              onChange={(e) => setFormData({ ...formData, actions: e.target.value })}
              className="w-full px-3 py-2 border rounded-md font-mono text-sm min-h-[100px]"
              placeholder='{"assign_to_position": "prioritize_certified"}'
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-5 h-5"
            />
            <Label htmlFor="is_active">Rule is active</Label>
          </div>

          <div className="flex justify-end gap-2">
            {editingRule && (
              <Button variant="outline" onClick={resetForm}>
                Cancel
              </Button>
            )}
            <Button onClick={handleSaveRule}>
              <Save className="h-4 w-4 mr-2" />
              {editingRule ? 'Update Rule' : 'Create Rule'}
            </Button>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-xl font-bold mb-4">Active Rules</h2>

        {rules.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Settings className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p>No rules configured yet</p>
            <p className="text-sm">Create your first rule above</p>
          </div>
        ) : (
          <div className="space-y-3">
            {rules.map((rule) => (
              <div
                key={rule.id}
                className={`p-4 border rounded-lg ${rule.is_active ? '' : 'opacity-50 bg-gray-50'}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-bold text-lg">{rule.rule_name}</h3>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getRuleTypeColor(rule.rule_type)}`}>
                        {rule.rule_type.replace('_', ' ')}
                      </span>
                      <span className="text-sm text-gray-600">
                        Priority: {rule.priority}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="font-medium text-gray-700 mb-1">Conditions:</p>
                        <pre className="bg-gray-100 p-2 rounded text-xs overflow-x-auto">
                          {JSON.stringify(rule.conditions, null, 2)}
                        </pre>
                      </div>
                      <div>
                        <p className="font-medium text-gray-700 mb-1">Actions:</p>
                        <pre className="bg-gray-100 p-2 rounded text-xs overflow-x-auto">
                          {JSON.stringify(rule.actions, null, 2)}
                        </pre>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleActive(rule)}
                    >
                      {rule.is_active ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleChangePriority(rule, 'up')}
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleChangePriority(rule, 'down')}
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditRule(rule)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteRule(rule.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {showHistory && (
        <Card className="p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <History className="h-6 w-6" />
            Assignment History
          </h2>

          {assignmentHistory.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <History className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No assignment history yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {assignmentHistory.map((record) => (
                <div
                  key={record.id}
                  className="flex items-center justify-between p-3 border rounded-lg text-sm"
                >
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="font-bold">{record.staff?.name || 'Unknown Staff'}</p>
                      <p className="text-gray-600">
                        {record.deployment ? `${record.deployment.date} - ${record.deployment.shift_type}` : 'N/A'}
                      </p>
                    </div>
                    <div className="px-3 py-1 bg-blue-100 text-blue-800 rounded font-medium">
                      {record.assigned_position}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-right">
                    <div>
                      <p className="text-gray-600">{record.assignment_method}</p>
                      {record.rule_applied && (
                        <p className="text-xs text-gray-500">{record.rule_applied}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <TrendingUp className="h-4 w-4 text-green-600" />
                      <span className="font-bold text-green-600">
                        {parseFloat(record.assignment_score || 0).toFixed(0)}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {formatDate(record.created_at)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      <Card className="p-6 bg-blue-50">
        <h3 className="text-lg font-bold text-blue-900 mb-2">Rule Types Explained</h3>
        <ul className="space-y-2 text-blue-800 text-sm">
          <li>
            <strong>Skill Based:</strong> Assigns based on training, certifications, and competencies
          </li>
          <li>
            <strong>Seniority Based:</strong> Prioritizes experienced staff for specific roles
          </li>
          <li>
            <strong>Time Based:</strong> Applies rules based on time of day or shift period
          </li>
          <li>
            <strong>Coverage Based:</strong> Ensures minimum staffing levels at all times
          </li>
          <li>
            <strong>Position Based:</strong> Rules specific to certain deployment positions
          </li>
        </ul>
      </Card>
    </div>
  );
}