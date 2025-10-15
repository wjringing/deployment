import React, { useState } from 'react';
import { Plus, Trash2, Settings, Users, Target, Clock, Save, ArrowRight, MapPin, Upload, Star, Link2 } from 'lucide-react';
import StaffCsvImporter from './StaffCsvImporter';
import StaffDefaultPositionsManager from './StaffDefaultPositionsManager';
import PositionRelationshipsManager from './PositionRelationshipsManager';

const SettingsPage = ({
  supabaseStaff,
  supabasePositions,
  templateShifts,
  newStaff,
  setNewStaff,
  newPosition,
  setNewPosition,
  newTemplateShift,
  setNewTemplateShift,
  uiLoading,
  onAddStaff,
  onRemoveStaff,
  onAddPosition,
  onRemovePosition,
  onUpdatePosition,
  onAddTemplateShift,
  onRemoveTemplateShift,
  onNavigateToTargets,
  onStaffDataChange
}) => {
  const [showCsvImporter, setShowCsvImporter] = useState(false);
  const [activeTab, setActiveTab] = useState('general');

  const handleImportComplete = () => {
    if (onStaffDataChange) {
      onStaffDataChange();
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3 mb-6">
        <Settings className="w-8 h-8 text-red-600" />
        <h2 className="text-3xl font-bold text-gray-900">System Settings</h2>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('general')}
            className={`${
              activeTab === 'general'
                ? 'border-red-500 text-red-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
          >
            <Settings className="w-4 h-4" />
            General Settings
          </button>
          <button
            onClick={() => setActiveTab('defaults')}
            className={`${
              activeTab === 'defaults'
                ? 'border-red-500 text-red-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
          >
            <Star className="w-4 h-4" />
            Default Positions
          </button>
          <button
            onClick={() => setActiveTab('relationships')}
            className={`${
              activeTab === 'relationships'
                ? 'border-red-500 text-red-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
          >
            <Link2 className="w-4 h-4" />
            Position Relationships
          </button>
        </nav>
      </div>

      {activeTab === 'relationships' ? (
        <PositionRelationshipsManager />
      ) : activeTab === 'defaults' ? (
        <StaffDefaultPositionsManager />
      ) : showCsvImporter ? (
        <div className="space-y-4">
          <StaffCsvImporter onImportComplete={handleImportComplete} />
          <button
            onClick={() => setShowCsvImporter(false)}
            className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold rounded-lg transition-colors"
          >
            Back to Settings
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Staff Management */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Users className="w-6 h-6 text-blue-600" />
                  <h3 className="text-xl font-semibold text-gray-900">Staff Management</h3>
                </div>
                <button
                  onClick={() => setShowCsvImporter(true)}
                  className="flex items-center gap-2 px-3 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors text-sm"
                >
                  <Upload className="w-4 h-4" />
                  Import CSV
                </button>
              </div>
          
          {/* Add Staff Form */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-3">Add New Staff Member</h4>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Staff name"
                value={newStaff.name}
                onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={newStaff.is_under_18}
                  onChange={(e) => setNewStaff({ ...newStaff, is_under_18: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Under 18 years old</span>
              </label>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Hourly Rate (£)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder={newStaff.is_under_18 ? "Under 18 rate" : "Team member rate"}
                  value={newStaff.hourly_rate || ''}
                  onChange={(e) => setNewStaff({ ...newStaff, hourly_rate: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <button
                onClick={onAddStaff}
                disabled={uiLoading || !newStaff.name.trim()}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Staff
              </button>
            </div>
          </div>

          {/* Staff List */}
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {supabaseStaff.map((staff) => (
              <div key={staff.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">{staff.name}</span>
                    {staff.is_under_18 && (
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                        Under 18
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    £{(staff.hourly_rate || 0).toFixed(2)}/hour
                  </div>
                </div>
                <button
                  onClick={() => onRemoveStaff(staff.id)}
                  disabled={uiLoading}
                  className="text-red-600 hover:text-red-800 p-1"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Position Management */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center gap-3 mb-4">
            <MapPin className="w-6 h-6 text-green-600" />
            <h3 className="text-xl font-semibold text-gray-900">Position Management</h3>
          </div>
          
          {/* Add Position Form */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-3">Add New Position</h4>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Position name"
                value={newPosition.name}
                onChange={(e) => setNewPosition({ ...newPosition, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
              <input
                type="number"
                placeholder="Display order (1-999)"
                value={newPosition.display_order || ''}
                onChange={(e) => setNewPosition({ ...newPosition, display_order: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
              <select
                value={newPosition.type}
                onChange={(e) => setNewPosition({ ...newPosition, type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="position">Position</option>
                <option value="pack_position">Pack Position</option>
                <option value="area">Area</option>
                <option value="cleaning_area">Cleaning Area</option>
              </select>
              {newPosition.type === 'position' && (
                <select
                  value={newPosition.area_id || ''}
                  onChange={(e) => setNewPosition({ ...newPosition, area_id: e.target.value || null })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="">No Area (Unassigned)</option>
                  {supabasePositions.filter(p => p.type === 'area').map(area => (
                    <option key={area.id} value={area.id}>{area.name}</option>
                  ))}
                </select>
              )}
              <button
                onClick={onAddPosition}
                disabled={uiLoading || !newPosition.name.trim()}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Position
              </button>
            </div>
          </div>

          {/* Position List */}
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {supabasePositions.map((position) => {
              const parentArea = supabasePositions.find(p => p.id === position.area_id);
              return (
                <div key={position.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-gray-900">{position.name}</span>
                      <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">
                        Order: {position.display_order || 0}
                      </span>
                    </div>
                    <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                      {position.type.replace('_', ' ')}
                    </span>
                    {parentArea && (
                      <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                        {parentArea.name}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={position.display_order || 0}
                      onChange={(e) => onUpdatePosition(position.id, { display_order: parseInt(e.target.value) || 0 })}
                      className="w-16 px-2 py-1 border border-gray-300 rounded text-xs text-center"
                      min="0"
                      max="999"
                      title="Display order"
                    />
                    <button
                      onClick={() => onRemovePosition(position.id)}
                      disabled={uiLoading}
                      className="text-red-600 hover:text-red-800 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Target Management - Navigation Card */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center gap-3 mb-4">
            <Target className="w-6 h-6 text-purple-600" />
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-gray-900">Target Management</h3>
              <p className="text-gray-600">Configure performance targets and goals</p>
            </div>
            <button
              onClick={onNavigateToTargets}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
            >
              <Target className="w-4 h-4" />
              Manage Targets
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <p className="text-purple-800 text-sm mb-2">
              <strong>Quick Access:</strong> Click "Manage Targets" to configure performance goals, 
              set priorities, and manage target values for your operations.
            </p>
            <div className="text-xs text-purple-600">
              Features: Add/Remove Targets • Set Priorities • Reset to Defaults • Category Organization
            </div>
          </div>
        </div>

        {/* Template Shifts */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center gap-3 mb-4">
            <Clock className="w-6 h-6 text-orange-600" />
            <h3 className="text-xl font-semibold text-gray-900">Template Shifts</h3>
          </div>
          
          {/* Add Template Shift Form */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-3">Add New Template Shift</h4>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Shift name"
                value={newTemplateShift.name}
                onChange={(e) => setNewTemplateShift({ ...newTemplateShift, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="time"
                  placeholder="Start time"
                  value={newTemplateShift.startTime}
                  onChange={(e) => setNewTemplateShift({ ...newTemplateShift, startTime: e.target.value })}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
                <input
                  type="time"
                  placeholder="End time"
                  value={newTemplateShift.endTime}
                  onChange={(e) => setNewTemplateShift({ ...newTemplateShift, endTime: e.target.value })}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
              <select
                value={newTemplateShift.type}
                onChange={(e) => setNewTemplateShift({ ...newTemplateShift, type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="Day Shift">Day Shift</option>
                <option value="Night Shift">Night Shift</option>
              </select>
              <button
                onClick={onAddTemplateShift}
                disabled={uiLoading || !newTemplateShift.name.trim() || !newTemplateShift.startTime || !newTemplateShift.endTime}
                className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Template Shift
              </button>
            </div>
          </div>

          {/* Template Shift List */}
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {templateShifts.map((shift) => (
              <div key={shift.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <span className="font-medium text-gray-900">{shift.name}</span>
                  <span className="ml-2 text-gray-600">{shift.startTime} - {shift.endTime}</span>
                  <span className="ml-2 px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full">
                    {shift.type}
                  </span>
                </div>
                <button
                  onClick={() => onRemoveTemplateShift(shift.id)}
                  disabled={uiLoading}
                  className="text-red-600 hover:text-red-800 p-1"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
        </>
      )}
    </div>
  );
};

export default SettingsPage;