import React from 'react';
import DeploymentCard from './DeploymentCard';
import { exportEnhancedExcel } from '../utils/enhancedExcelExport';
import { Plus, Trash2, Clock, Users, Calendar, Settings, Save, Download, TrendingUp, FileText, Copy, CalendarDays, Edit2, X, Target, MapPin, ChefHat, Store, UserCheck, Chrome as Broom, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';

const DeploymentPage = ({
  selectedDate,
  setSelectedDate,
  currentDeployments,
  currentShiftInfo,
  supabaseStaff,
  supabaseTargets,
  supabasePositions,
  newDeployment,
  setNewDeployment,
  uiLoading,
  draggedItem,
  dragOverTarget,
  isDragging,
  touchDevice,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragEnter,
  onDragLeave,
  onDrop,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  onAddDeployment,
  onUpdateDeployment,
  onRemoveDeployment,
  onUpdateShiftInfo,
  onDuplicateDeployments,
  onExportPDF,
  onExportAllExcel,
  onExportShiftExcel,
  formatDate,
  calculateWorkHours,
  calculateBreakTime,
  showDuplicateModal,
  setShowDuplicateModal,
  duplicateFromDate,
  setDuplicateFromDate,
  onDeleteAllDeployments,
  onRefreshData
}) => {
  const [showDeleteModal, setShowDeleteModal] = React.useState(false);
  
  // Generate position categories from database
  const positionCategories = React.useMemo(() => {
    if (!supabasePositions || !Array.isArray(supabasePositions)) {
      return {};
    }
    
    const areas = supabasePositions.filter(p => p.type === 'area');
    const categories = {};
    
    areas.forEach(area => {
      const areaPositions = supabasePositions.filter(p => p.area_id === area.id);
      categories[area.id] = {
        name: area.name,
        positions: areaPositions.map(p => p.name)
      };
    });
    
    // Add unassigned positions
    const unassignedPositions = supabasePositions.filter(p => p.type !== 'area' && !p.area_id);
    if (unassignedPositions.length > 0) {
      categories['unassigned'] = {
        name: 'Unassigned Positions',
        positions: unassignedPositions.map(p => p.name)
      };
    }
    
    return categories;
  }, [supabasePositions]);
  
  // Generate areas from database
  const areasFromSupabase = React.useMemo(() => {
    if (!supabasePositions || !Array.isArray(supabasePositions)) {
      return [];
    }
    return supabasePositions
      .filter(p => p.type === 'area')
      .map(p => p.name);
  }, [supabasePositions]);
  
  // Generate cleaning areas from database
  const cleaningAreasFromSupabase = React.useMemo(() => {
    if (!supabasePositions || !Array.isArray(supabasePositions)) {
      return [];
    }
    return supabasePositions
      .filter(p => p.type === 'cleaning_area')
      .map(p => p.name);
  }, [supabasePositions]);
  
  const dayShiftDeployments = currentDeployments.filter(d => d.shift_type === 'Day Shift');
  const nightShiftDeployments = currentDeployments.filter(d => d.shift_type === 'Night Shift');

  const handleDeleteAllDeployments = async () => {
    try {
      await onDeleteAllDeployments(selectedDate);
      setShowDeleteModal(false);
    } catch (error) {
      console.error('Failed to delete deployments:', error);
    }
  };
  return (
    <div className="space-y-6">
      {/* Date Selection and Actions */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Selected Date
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
            <div className="text-sm text-gray-600">
              <div className="font-medium">{formatDate(selectedDate)}</div>
              <div>{currentDeployments.length} deployments scheduled</div>
              <div className="text-xs text-blue-600">
                Forecast: {currentShiftInfo.forecast || '£0.00'} 
                (Day: {currentShiftInfo.day_shift_forecast || '£0.00'}, 
                Night: {currentShiftInfo.night_shift_forecast || '£0.00'})
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={onRefreshData}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
              title="Refresh data"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
            <button
              onClick={() => setShowDuplicateModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
            >
              <Copy className="w-4 h-4" />
              Duplicate
            </button>
            {currentDeployments.length > 0 && (
              <button
                onClick={() => setShowDeleteModal(true)}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete All
              </button>
            )}
            <button
              onClick={() => onExportPDF('all')}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              PDF
            </button>
            <button
              onClick={onExportAllExcel}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
            >
              <FileText className="w-4 h-4" />
              Excel
            </button>
          </div>
        </div>
      </div>

      {/* Shift Information */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-blue-600" />
          Shift Information
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Total Forecast
            </label>
            <input
              type="text"
              value={currentShiftInfo.forecast || ''}
              onChange={(e) => onUpdateShiftInfo('forecast', e.target.value)}
              placeholder="£0.00"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Day Shift Forecast
            </label>
            <input
              type="text"
              value={currentShiftInfo.day_shift_forecast || ''}
              onChange={(e) => onUpdateShiftInfo('day_shift_forecast', e.target.value)}
              placeholder="£0.00"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Night Shift Forecast
            </label>
            <input
              type="text"
              value={currentShiftInfo.night_shift_forecast || ''}
              onChange={(e) => onUpdateShiftInfo('night_shift_forecast', e.target.value)}
              placeholder="£0.00"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Weather
            </label>
            <input
              type="text"
              value={currentShiftInfo.weather || ''}
              onChange={(e) => onUpdateShiftInfo('weather', e.target.value)}
              placeholder="Weather conditions"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
        </div>
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notes
          </label>
          <textarea
            value={currentShiftInfo.notes || ''}
            onChange={(e) => onUpdateShiftInfo('notes', e.target.value)}
            placeholder="Shift notes and instructions..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>
      </div>

      {/* Add New Deployment */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Plus className="w-5 h-5 text-green-600" />
          Add New Deployment
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Staff Member</label>
            <select
              value={newDeployment.staff_id}
              onChange={(e) => setNewDeployment(prev => ({ ...prev, staff_id: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="">Select Staff</option>
              {supabaseStaff.map(member => (
                <option key={member.id} value={member.id}>
                  {member.name} {member.is_under_18 ? '(U18)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Shift Type</label>
            <select
              value={newDeployment.shift_type}
              onChange={(e) => setNewDeployment(prev => ({ ...prev, shift_type: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="Day Shift">Day Shift</option>
              <option value="Night Shift">Night Shift</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
            <input
              type="time"
              value={newDeployment.start_time}
              onChange={(e) => setNewDeployment(prev => ({ ...prev, start_time: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
            <input
              type="time"
              value={newDeployment.end_time}
              onChange={(e) => setNewDeployment(prev => ({ ...prev, end_time: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
            <select
              value={newDeployment.position}
              onChange={(e) => setNewDeployment(prev => ({ ...prev, position: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="">Select Position</option>
              {Object.entries(positionCategories).map(([key, category]) => (
                <optgroup key={key} label={category.name}>
                  {category.positions.map(position => (
                    <option key={position} value={position}>{position}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Secondary Position</label>
            <select
              value={newDeployment.secondary}
              onChange={(e) => setNewDeployment(prev => ({ ...prev, secondary: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="">Select Secondary</option>
              {Object.entries(positionCategories).map(([key, category]) => (
                <optgroup key={key} label={category.name}>
                  {category.positions.map(position => (
                    <option key={position} value={position}>{position}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Area</label>
            <select
              value={newDeployment.area}
              onChange={(e) => setNewDeployment(prev => ({ ...prev, area: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="">Select Area</option>
              {areasFromSupabase.map(area => (
                <option key={area} value={area}>{area}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Closing Position</label>
            <select
              value={newDeployment.closing}
              onChange={(e) => setNewDeployment(prev => ({ ...prev, closing: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="">Select Closing</option>
              {cleaningAreasFromSupabase.map(area => (
                <option key={area} value={area}>{area}</option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={onAddDeployment}
          disabled={uiLoading}
          className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          {uiLoading ? 'Adding...' : 'Add Deployment'}
        </button>
      </div>

      {/* Current Deployments */}
      <div className="space-y-6">
        {/* Day Shift */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              Day Shift Deployments ({dayShiftDeployments.length})
            </h2>
            <div className="flex gap-2">
              <button
                onClick={() => onExportShiftExcel('Day Shift')}
                className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm flex items-center gap-1"
              >
                <FileText className="w-3 h-3" />
                Excel Day Shift
              </button>
              <button
                onClick={() => onExportPDF('day')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm flex items-center gap-1"
              >
                <Download className="w-3 h-3" />
                PDF Day Shift
              </button>
            </div>
          </div>
          
          {dayShiftDeployments.length > 0 ? (
            <div className="space-y-3">
              {dayShiftDeployments.map(deployment => (
                <DeploymentCard
                  key={deployment.id}
                  deployment={deployment}
                  onRemove={onRemoveDeployment}
                  onUpdate={onUpdateDeployment}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No day shift deployments scheduled</p>
            </div>
          )}
        </div>

        {/* Night Shift */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Clock className="w-5 h-5 text-purple-600" />
              Night Shift Deployments ({nightShiftDeployments.length})
            </h2>
            <div className="flex gap-2">
              <button
                onClick={() => onExportShiftExcel('Night Shift')}
                className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm flex items-center gap-1"
              >
                <FileText className="w-3 h-3" />
                Excel Night Shift
              </button>
              <button
                onClick={() => onExportPDF('night')}
                className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded text-sm flex items-center gap-1"
              >
                <Download className="w-3 h-3" />
                PDF Night Shift
              </button>
            </div>
          </div>
          
          {nightShiftDeployments.length > 0 ? (
            <div className="space-y-3">
              {nightShiftDeployments.map(deployment => (
                <DeploymentCard
                  key={deployment.id}
                  deployment={deployment}
                  onRemove={onRemoveDeployment}
                  onUpdate={onUpdateDeployment}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No night shift deployments scheduled</p>
            </div>
          )}
        </div>
      </div>

      {/* Targets Display */}
      {supabaseTargets.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-yellow-600" />
            Today's Targets
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {supabaseTargets.map(target => (
              <div key={target.id} className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <div className="font-medium text-sm">{target.name}</div>
                <div className="text-lg font-bold text-yellow-800">{target.value}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Delete All Deployments Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-red-600">Delete All Deployments</h3>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="mb-6">
              <p className="text-gray-700 mb-2">
                Are you sure you want to delete all deployments for <strong>{formatDate(selectedDate)}</strong>?
              </p>
              <p className="text-sm text-red-600">
                This action cannot be undone. {currentDeployments.length} deployment(s) will be permanently removed.
              </p>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={handleDeleteAllDeployments}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete All
              </button>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Duplicate Modal */}
      {showDuplicateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Duplicate Deployments</h3>
              <button
                onClick={() => setShowDuplicateModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Copy deployments from:
              </label>
              <input
                type="date"
                value={duplicateFromDate}
                onChange={(e) => setDuplicateFromDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={onDuplicateDeployments}
                disabled={uiLoading || !duplicateFromDate}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg"
              >
                {uiLoading ? 'Copying...' : 'Copy Deployments'}
              </button>
              <button
                onClick={() => setShowDuplicateModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeploymentPage;