import React from 'react';
import { Edit2, Trash2, Check, X, ArrowRight, Shield } from 'lucide-react';

const RuleCard = ({ rule, onEdit, onDelete, onToggleActive, showTechnical = false }) => {
  const parseRuleToPlainLanguage = (rule) => {
    const conditions = [];
    const actions = [];

    if (rule.condition) {
      if (rule.condition.dt_type) {
        conditions.push(`Drive-Thru is ${rule.condition.dt_type}`);
      }
      if (rule.condition.num_cooks) {
        if (rule.condition.num_cooks.gte !== undefined) {
          conditions.push(`at least ${rule.condition.num_cooks.gte} cooks`);
        }
        if (rule.condition.num_cooks.lte !== undefined) {
          conditions.push(`at most ${rule.condition.num_cooks.lte} cooks`);
        }
        if (rule.condition.num_cooks.eq !== undefined) {
          conditions.push(`exactly ${rule.condition.num_cooks.eq} cooks`);
        }
      }
      if (rule.condition.shift_type) {
        conditions.push(`${rule.condition.shift_type}`);
      }
      if (rule.condition.day_of_week) {
        conditions.push(`on ${rule.condition.day_of_week}`);
      }
    }

    if (rule.action) {
      if (rule.action.require_position) {
        const count = rule.action.count || 1;
        actions.push(`require ${count} ${rule.action.require_position}${count > 1 ? 's' : ''}`);
      }
      if (rule.action.exclude_position) {
        actions.push(`exclude ${rule.action.exclude_position}`);
      }
      if (rule.action.adjust_position_count) {
        Object.entries(rule.action.adjust_position_count).forEach(([pos, count]) => {
          actions.push(`set ${pos} to ${count}`);
        });
      }
    }

    return {
      conditions: conditions.length > 0 ? conditions : ['No conditions set'],
      actions: actions.length > 0 ? actions : ['No actions set']
    };
  };

  const { conditions, actions } = parseRuleToPlainLanguage(rule);

  return (
    <div
      className={`rounded-xl border-2 transition-all ${
        rule.is_active
          ? 'bg-white border-blue-200 shadow-sm hover:shadow-md'
          : 'bg-gray-50 border-gray-300 opacity-70'
      }`}
    >
      <div className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h4 className="text-lg font-bold text-gray-900">{rule.rule_name}</h4>
              {!rule.is_active && (
                <span className="px-3 py-1 bg-gray-200 text-gray-600 text-xs font-semibold rounded-full">
                  Inactive
                </span>
              )}
              <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                Priority {rule.priority}
              </span>
            </div>
            {rule.description && (
              <p className="text-sm text-gray-600 mb-3">{rule.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2 ml-4">
            <button
              onClick={() => onToggleActive('conditional_staffing_rules', rule.id, rule.is_active)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                rule.is_active
                  ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                  : 'bg-green-100 text-green-800 hover:bg-green-200'
              }`}
            >
              {rule.is_active ? (
                <>
                  <X className="w-4 h-4 inline mr-1" />
                  Deactivate
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 inline mr-1" />
                  Activate
                </>
              )}
            </button>
            <button
              onClick={() => onEdit(rule)}
              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
              title="Edit rule"
            >
              <Edit2 className="w-5 h-5" />
            </button>
            <button
              onClick={() => onDelete(rule.id)}
              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
              title="Delete rule"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="bg-gradient-to-r from-blue-50 to-white rounded-lg p-4 border border-blue-200">
          <div className="flex items-start gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="bg-blue-600 text-white px-2 py-1 rounded text-xs font-bold">WHEN</span>
                <span className="text-xs text-gray-500 uppercase">Conditions</span>
              </div>
              <ul className="space-y-1">
                {conditions.map((condition, idx) => (
                  <li key={idx} className="text-sm text-gray-800 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-blue-500 flex-shrink-0" />
                    <span>{condition}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex items-center justify-center px-3">
              <ArrowRight className="w-8 h-8 text-blue-400" />
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="bg-green-600 text-white px-2 py-1 rounded text-xs font-bold">THEN</span>
                <span className="text-xs text-gray-500 uppercase">Actions</span>
              </div>
              <ul className="space-y-1">
                {actions.map((action, idx) => (
                  <li key={idx} className="text-sm text-gray-800 flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <span className="font-medium">{action}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {showTechnical && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <details className="text-xs">
              <summary className="cursor-pointer text-gray-500 hover:text-gray-700 font-medium">
                Show Technical Details
              </summary>
              <div className="mt-3 grid grid-cols-2 gap-4">
                <div>
                  <span className="font-semibold text-gray-700">Condition:</span>
                  <pre className="mt-1 p-2 bg-gray-100 rounded text-xs overflow-x-auto">
                    {JSON.stringify(rule.condition, null, 2)}
                  </pre>
                </div>
                <div>
                  <span className="font-semibold text-gray-700">Action:</span>
                  <pre className="mt-1 p-2 bg-gray-100 rounded text-xs overflow-x-auto">
                    {JSON.stringify(rule.action, null, 2)}
                  </pre>
                </div>
              </div>
            </details>
          </div>
        )}
      </div>
    </div>
  );
};

export default RuleCard;
