import React, { useState, useEffect } from 'react';
import { HelpCircle, Plus, X, Trash2, AlertCircle, CheckCircle2, Info } from 'lucide-react';

const SimpleRuleBuilder = ({ onSave, onCancel, allPositions = [], existingRule = null }) => {
  const [ruleName, setRuleName] = useState('');
  const [whenConditions, setWhenConditions] = useState([]);
  const [thenActions, setThenActions] = useState([]);
  const [errors, setErrors] = useState({});
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    if (existingRule) {
      setRuleName(existingRule.rule_name || '');

      const conditions = parseConditionsFromRule(existingRule.condition);
      setWhenConditions(conditions);

      const actions = parseActionsFromRule(existingRule.action, existingRule.rule_type);
      setThenActions(actions);
    }
  }, [existingRule]);

  const parseConditionsFromRule = (condition) => {
    if (!condition || typeof condition !== 'object') return [];

    const conditions = [];

    if (condition.dt_type) {
      conditions.push({ type: 'dt_type', value: condition.dt_type });
    }
    if (condition.num_cooks) {
      if (condition.num_cooks.gte !== undefined) {
        conditions.push({ type: 'min_cooks', value: condition.num_cooks.gte });
      }
      if (condition.num_cooks.lte !== undefined) {
        conditions.push({ type: 'max_cooks', value: condition.num_cooks.lte });
      }
      if (condition.num_cooks.eq !== undefined) {
        conditions.push({ type: 'exact_cooks', value: condition.num_cooks.eq });
      }
    }
    if (condition.shift_type) {
      conditions.push({ type: 'shift_type', value: condition.shift_type });
    }
    if (condition.day_of_week) {
      conditions.push({ type: 'day_of_week', value: condition.day_of_week });
    }

    return conditions.length > 0 ? conditions : [{ type: '', value: '' }];
  };

  const parseActionsFromRule = (action, ruleType) => {
    if (!action || typeof action !== 'object') return [];

    const actions = [];

    if (action.require_position) {
      actions.push({
        type: 'require_position',
        position: action.require_position,
        count: action.count || 1
      });
    }
    if (action.exclude_position) {
      actions.push({
        type: 'exclude_position',
        position: action.exclude_position
      });
    }
    if (action.adjust_position_count) {
      Object.entries(action.adjust_position_count).forEach(([pos, count]) => {
        actions.push({
          type: 'adjust_count',
          position: pos,
          count: count
        });
      });
    }

    return actions.length > 0 ? actions : [{ type: '', position: '', count: 1 }];
  };

  const addCondition = () => {
    setWhenConditions([...whenConditions, { type: '', value: '' }]);
  };

  const removeCondition = (index) => {
    setWhenConditions(whenConditions.filter((_, i) => i !== index));
  };

  const updateCondition = (index, field, value) => {
    const updated = [...whenConditions];
    updated[index] = { ...updated[index], [field]: value };
    setWhenConditions(updated);
  };

  const addAction = () => {
    setThenActions([...thenActions, { type: '', position: '', count: 1 }]);
  };

  const removeAction = (index) => {
    setThenActions(thenActions.filter((_, i) => i !== index));
  };

  const updateAction = (index, field, value) => {
    const updated = [...thenActions];
    updated[index] = { ...updated[index], [field]: value };
    setThenActions(updated);
  };

  const validateRule = () => {
    const newErrors = {};

    if (!ruleName.trim()) {
      newErrors.ruleName = 'Please give your rule a name';
    }

    if (whenConditions.length === 0 || whenConditions.every(c => !c.type)) {
      newErrors.conditions = 'Add at least one condition';
    }

    if (thenActions.length === 0 || thenActions.every(a => !a.type)) {
      newErrors.actions = 'Add at least one action';
    }

    whenConditions.forEach((cond, idx) => {
      if (cond.type && !cond.value) {
        newErrors[`condition_${idx}`] = 'Please select a value';
      }
    });

    thenActions.forEach((action, idx) => {
      if (action.type && !action.position) {
        newErrors[`action_${idx}`] = 'Please select a position';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const buildRuleObject = () => {
    const condition = {};

    whenConditions.forEach(cond => {
      if (!cond.type || !cond.value) return;

      if (cond.type === 'dt_type') {
        condition.dt_type = cond.value;
      } else if (cond.type === 'min_cooks') {
        if (!condition.num_cooks) condition.num_cooks = {};
        condition.num_cooks.gte = parseInt(cond.value);
      } else if (cond.type === 'max_cooks') {
        if (!condition.num_cooks) condition.num_cooks = {};
        condition.num_cooks.lte = parseInt(cond.value);
      } else if (cond.type === 'exact_cooks') {
        if (!condition.num_cooks) condition.num_cooks = {};
        condition.num_cooks.eq = parseInt(cond.value);
      } else if (cond.type === 'shift_type') {
        condition.shift_type = cond.value;
      } else if (cond.type === 'day_of_week') {
        condition.day_of_week = cond.value;
      }
    });

    const action = {};
    let ruleType = 'require_position';

    thenActions.forEach(act => {
      if (!act.type || !act.position) return;

      if (act.type === 'require_position') {
        action.require_position = act.position;
        action.count = parseInt(act.count) || 1;
        ruleType = 'require_position';
      } else if (act.type === 'exclude_position') {
        action.exclude_position = act.position;
        ruleType = 'exclude_position';
      } else if (act.type === 'adjust_count') {
        if (!action.adjust_position_count) action.adjust_position_count = {};
        action.adjust_position_count[act.position] = parseInt(act.count) || 1;
        ruleType = 'adjust_count';
      }
    });

    return {
      rule_name: ruleName,
      rule_type: ruleType,
      condition,
      action,
      priority: existingRule?.priority || 100,
      description: generateDescription(),
      is_active: existingRule?.is_active !== undefined ? existingRule.is_active : true
    };
  };

  const generateDescription = () => {
    const conditionParts = whenConditions
      .filter(c => c.type && c.value)
      .map(c => {
        if (c.type === 'dt_type') return `Drive-Thru is ${c.value}`;
        if (c.type === 'min_cooks') return `at least ${c.value} cooks`;
        if (c.type === 'max_cooks') return `at most ${c.value} cooks`;
        if (c.type === 'exact_cooks') return `exactly ${c.value} cooks`;
        if (c.type === 'shift_type') return `${c.value}`;
        if (c.type === 'day_of_week') return `on ${c.value}`;
        return '';
      });

    const actionParts = thenActions
      .filter(a => a.type && a.position)
      .map(a => {
        if (a.type === 'require_position') return `require ${a.count} ${a.position}`;
        if (a.type === 'exclude_position') return `exclude ${a.position}`;
        if (a.type === 'adjust_count') return `set ${a.position} to ${a.count}`;
        return '';
      });

    return `When ${conditionParts.join(' and ')}, then ${actionParts.join(' and ')}`;
  };

  const handleSave = () => {
    if (!validateRule()) return;

    const ruleObject = buildRuleObject();

    if (existingRule?.id) {
      ruleObject.id = existingRule.id;
    }

    onSave(ruleObject);
  };

  const getConditionOptions = () => [
    { value: '', label: 'Select a condition...' },
    { value: 'dt_type', label: 'Drive-Thru Type' },
    { value: 'min_cooks', label: 'Minimum Number of Cooks' },
    { value: 'max_cooks', label: 'Maximum Number of Cooks' },
    { value: 'exact_cooks', label: 'Exact Number of Cooks' },
    { value: 'shift_type', label: 'Shift Type' },
    { value: 'day_of_week', label: 'Day of Week' }
  ];

  const getConditionValueOptions = (conditionType) => {
    switch (conditionType) {
      case 'dt_type':
        return [
          { value: '', label: 'Select...' },
          { value: 'DT1', label: 'DT1 (One Lane)' },
          { value: 'DT2', label: 'DT2 (Two Lanes)' },
          { value: 'None', label: 'No Drive-Thru' }
        ];
      case 'shift_type':
        return [
          { value: '', label: 'Select...' },
          { value: 'Day Shift', label: 'Day Shift' },
          { value: 'Night Shift', label: 'Night Shift' },
          { value: 'Both', label: 'Both Shifts' }
        ];
      case 'day_of_week':
        return [
          { value: '', label: 'Select...' },
          { value: 'Monday', label: 'Monday' },
          { value: 'Tuesday', label: 'Tuesday' },
          { value: 'Wednesday', label: 'Wednesday' },
          { value: 'Thursday', label: 'Thursday' },
          { value: 'Friday', label: 'Friday' },
          { value: 'Saturday', label: 'Saturday' },
          { value: 'Sunday', label: 'Sunday' }
        ];
      case 'min_cooks':
      case 'max_cooks':
      case 'exact_cooks':
        return [
          { value: '', label: 'Select...' },
          { value: '0', label: '0' },
          { value: '1', label: '1' },
          { value: '2', label: '2' },
          { value: '3', label: '3' },
          { value: '4', label: '4' },
          { value: '5', label: '5' }
        ];
      default:
        return [{ value: '', label: 'Select condition first' }];
    }
  };

  const getActionOptions = () => [
    { value: '', label: 'Select an action...' },
    { value: 'require_position', label: 'Require a Position' },
    { value: 'adjust_count', label: 'Set Position Count' },
    { value: 'exclude_position', label: 'Exclude a Position' }
  ];

  const getPositionOptions = () => [
    { value: '', label: 'Select position...' },
    ...allPositions.map(pos => ({ value: pos.name, label: pos.name }))
  ];

  return (
    <div className="bg-gradient-to-br from-blue-50 to-white border-2 border-blue-200 rounded-xl p-6 shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 text-white rounded-lg p-2">
            <Info className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">
              {existingRule ? 'Edit Staffing Rule' : 'Create New Staffing Rule'}
            </h3>
            <p className="text-sm text-gray-600">Build your rule step-by-step</p>
          </div>
        </div>
        <button
          onClick={() => setShowHelp(!showHelp)}
          className="text-blue-600 hover:text-blue-700 hover:bg-blue-100 p-2 rounded-full transition"
        >
          <HelpCircle className="w-5 h-5" />
        </button>
      </div>

      {showHelp && (
        <div className="mb-6 bg-blue-100 border border-blue-300 rounded-lg p-4">
          <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
            <Info className="w-4 h-4" />
            How to Create Rules
          </h4>
          <ul className="text-sm text-blue-800 space-y-1 ml-6 list-disc">
            <li>Give your rule a descriptive name (e.g., "DT1 Needs Presenter")</li>
            <li>Add conditions using the "When" section (what triggers the rule)</li>
            <li>Add actions using the "Then" section (what happens when triggered)</li>
            <li>You can have multiple conditions and actions</li>
            <li>All conditions must be true for the rule to apply</li>
          </ul>
        </div>
      )}

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Rule Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={ruleName}
            onChange={(e) => setRuleName(e.target.value)}
            placeholder="e.g., DT1 Requires Presenter"
            className={`w-full px-4 py-3 border-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition ${
              errors.ruleName ? 'border-red-300 bg-red-50' : 'border-gray-300'
            }`}
          />
          {errors.ruleName && (
            <p className="text-red-600 text-sm mt-1 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {errors.ruleName}
            </p>
          )}
        </div>

        <div className="bg-white rounded-lg border-2 border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <span className="bg-blue-600 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm">1</span>
                When (Conditions)
              </h4>
              <p className="text-sm text-gray-600 ml-9">What must be true for this rule to apply?</p>
            </div>
            <button
              onClick={addCondition}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Add Condition
            </button>
          </div>

          {errors.conditions && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-700 text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {errors.conditions}
              </p>
            </div>
          )}

          <div className="space-y-3">
            {whenConditions.length === 0 && (
              <div className="text-center py-8 text-gray-400">
                <Info className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No conditions yet. Click "Add Condition" to start.</p>
              </div>
            )}

            {whenConditions.map((condition, index) => (
              <div key={index} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-start gap-3">
                  <div className="flex-1 grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Condition Type
                      </label>
                      <select
                        value={condition.type}
                        onChange={(e) => updateCondition(index, 'type', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        {getConditionOptions().map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Value
                      </label>
                      <select
                        value={condition.value}
                        onChange={(e) => updateCondition(index, 'value', e.target.value)}
                        disabled={!condition.type}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                      >
                        {getConditionValueOptions(condition.type).map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                      {errors[`condition_${index}`] && (
                        <p className="text-red-600 text-xs mt-1">{errors[`condition_${index}`]}</p>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => removeCondition(index)}
                    className="mt-6 p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                    title="Remove condition"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg border-2 border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <span className="bg-green-600 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm">2</span>
                Then (Actions)
              </h4>
              <p className="text-sm text-gray-600 ml-9">What should happen when the conditions are met?</p>
            </div>
            <button
              onClick={addAction}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Add Action
            </button>
          </div>

          {errors.actions && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-700 text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {errors.actions}
              </p>
            </div>
          )}

          <div className="space-y-3">
            {thenActions.length === 0 && (
              <div className="text-center py-8 text-gray-400">
                <Info className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No actions yet. Click "Add Action" to start.</p>
              </div>
            )}

            {thenActions.map((action, index) => (
              <div key={index} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-start gap-3">
                  <div className="flex-1 grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Action Type
                      </label>
                      <select
                        value={action.type}
                        onChange={(e) => updateAction(index, 'type', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        {getActionOptions().map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Position
                      </label>
                      <select
                        value={action.position}
                        onChange={(e) => updateAction(index, 'position', e.target.value)}
                        disabled={!action.type}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                      >
                        {getPositionOptions().map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                      {errors[`action_${index}`] && (
                        <p className="text-red-600 text-xs mt-1">{errors[`action_${index}`]}</p>
                      )}
                    </div>

                    {(action.type === 'require_position' || action.type === 'adjust_count') && (
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Count
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="10"
                          value={action.count}
                          onChange={(e) => updateAction(index, 'count', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => removeAction(index)}
                    className="mt-6 p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                    title="Remove action"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {whenConditions.length > 0 && thenActions.length > 0 && (
          <div className="bg-gradient-to-r from-blue-50 to-green-50 border-2 border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              Rule Preview
            </h4>
            <p className="text-sm text-gray-700">
              {generateDescription() || 'Complete all fields to see preview'}
            </p>
          </div>
        )}

        <div className="flex gap-3 pt-4">
          <button
            onClick={handleSave}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-lg flex items-center justify-center gap-2 transition shadow-md hover:shadow-lg"
          >
            <CheckCircle2 className="w-5 h-5" />
            Save Rule
          </button>
          <button
            onClick={onCancel}
            className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold rounded-lg transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default SimpleRuleBuilder;
