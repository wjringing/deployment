import React from 'react';
import { Plus, Trash2, Target, ArrowLeft, RotateCcw, CheckCircle, AlertTriangle } from 'lucide-react';

const TargetSettingsPage = ({
  supabaseTargets,
  newTarget,
  setNewTarget,
  uiLoading,
  onAddTarget,
  onUpdateTarget,
  onRemoveTarget,
  onBack,
  onResetTargets,
  isTargetsDefault
}) => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="text-gray-600 hover:text-gray-800 p-2 rounded-lg hover:bg-gray-100 flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Settings
            </button>
            <div className="flex items-center gap-3">
              <Target className="w-8 h-8 text-purple-600" />
              <div>
                <h2 className="text-3xl font-bold text-gray-900">Target Management</h2>
                <p className="text-gray-600">Configure and manage performance targets</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {isTargetsDefault ? (
              <div className="flex items-center gap-2 text-green-700 bg-green-50 px-3 py-2 rounded-lg">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm font-medium">Using Default Targets</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-blue-700 bg-blue-50 px-3 py-2 rounded-lg">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-sm font-medium">Custom Targets Active</span>
              </div>
            )}
            
            <button
              onClick={onResetTargets}
              disabled={isTargetsDefault || uiLoading}
              className="bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Reset to Defaults
            </button>
          </div>
        </div>
        
        <div className="text-sm text-gray-600">
          <p className="mb-2">
            <strong>Current Status:</strong> {supabaseTargets.length} targets configured
          </p>
          <p>
            Targets define performance goals and key metrics for daily operations. 
            Use the reset function to restore default values or customize targets to match your specific requirements.
          </p>
        </div>
      </div>

      {/* Add Target Form */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center gap-3 mb-4">
          <Plus className="w-6 h-6 text-purple-600" />
          <h3 className="text-xl font-semibold text-gray-900">Add New Target</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Target Name</label>
            <input
              type="text"
              placeholder="e.g., Drive Thru Time"
              value={newTarget.name}
              onChange={(e) => setNewTarget({ ...newTarget, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Target Value</label>
            <input
              type="text"
              placeholder="e.g., 90 seconds, 95%"
              value={newTarget.value}
              onChange={(e) => setNewTarget({ ...newTarget, value: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Priority (1-10)</label>
            <input
              type="number"
              min="1"
              max="10"
              value={newTarget.priority}
              onChange={(e) => setNewTarget({ ...newTarget, priority: parseInt(e.target.value) || 1 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
          
          <div className="flex items-end">
            <button
              onClick={onAddTarget}
              disabled={uiLoading || !newTarget.name.trim() || !newTarget.value.trim()}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              {uiLoading ? 'Adding...' : 'Add Target'}
            </button>
          </div>
        </div>
      </div>

      {/* Target List */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center gap-3 mb-6">
          <Target className="w-6 h-6 text-purple-600" />
          <h3 className="text-xl font-semibold text-gray-900">Current Targets</h3>
          <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-sm font-medium">
            {supabaseTargets.length} configured
          </span>
        </div>
        
        {supabaseTargets.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Target className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-xl font-medium mb-2">No Targets Configured</p>
            <p className="text-sm mb-4">Add your first target above to get started</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {supabaseTargets
              .sort((a, b) => (a.priority || 0) - (b.priority || 0))
              .map((target) => (
                <div key={target.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 mb-1">{target.name}</h4>
                      <p className="text-lg font-bold text-purple-600">{target.value}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs font-medium">
                        Priority {target.priority || 1}
                      </span>
                      <button
                        onClick={() => onRemoveTarget(target.id)}
                        disabled={uiLoading}
                        className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50"
                        title="Delete target"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="text-xs text-gray-500">
                    <div className="flex items-center justify-between">
                      <span>Target ID: {target.id.toString().slice(-8)}</span>
                      <span className={`px-2 py-1 rounded-full ${
                        target.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {target.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Target Categories Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h4 className="font-medium text-blue-900 mb-3">Target Categories</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <h5 className="font-medium text-blue-800 mb-2">Service Targets</h5>
            <ul className="text-blue-700 space-y-1">
              <li>• Drive Thru Time</li>
              <li>• Order Accuracy</li>
              <li>• Customer Wait Time</li>
            </ul>
          </div>
          <div>
            <h5 className="font-medium text-blue-800 mb-2">Quality Targets</h5>
            <ul className="text-blue-700 space-y-1">
              <li>• Customer Satisfaction</li>
              <li>• Food Safety Score</li>
              <li>• Cleanliness Standard</li>
            </ul>
          </div>
          <div>
            <h5 className="font-medium text-blue-800 mb-2">Sales Targets</h5>
            <ul className="text-blue-700 space-y-1">
              <li>• Upselling Rate</li>
              <li>• Average Transaction</li>
              <li>• Daily Revenue</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TargetSettingsPage;