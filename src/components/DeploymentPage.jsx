import React from 'react';
import DeploymentCard from './DeploymentCard';
import DeploymentConfigModal from './DeploymentConfigModal';
import { exportEnhancedExcel } from '../utils/enhancedExcelExport';
import { intelligentAutoDeployment } from '../utils/intelligentDeploymentAssignment';
import { Plus, Trash2, Clock, Users, Calendar, Settings, Save, Download, TrendingUp, FileText, Copy, CalendarDays, Edit2, X, Target, MapPin, ChefHat, Store, UserCheck, Chrome as Broom, AlertCircle, CheckCircle, RefreshCw, Zap, Printer } from 'lucide-react';
import { supabase } from '../lib/supabase';

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
  const [showAutoAssignModal, setShowAutoAssignModal] = React.useState(false);
  const [showConfigModal, setShowConfigModal] = React.useState(false);
  const [pendingShiftType, setPendingShiftType] = React.useState(null);
  const [autoAssignResults, setAutoAssignResults] = React.useState(null);
  const [autoAssigning, setAutoAssigning] = React.useState(false);

  const handleAutoAssignClick = (shiftType) => {
    setPendingShiftType(shiftType);
    setShowConfigModal(true);
  };

  const handlePrintChecklists = async (shiftType) => {
    try {
      const dayOfWeek = new Date(selectedDate).getDay();

      const { data: checklists, error } = await supabase
        .from('checklists')
        .select(`
          *,
          checklist_items (
            id,
            item_text,
            is_required,
            display_order
          )
        `)
        .eq('is_active', true)
        .or(`shift_type.eq.${shiftType},shift_type.eq.Both Shifts`)
        .or(`day_of_week.is.null,day_of_week.eq.${dayOfWeek}`)
        .order('display_order', { ascending: true });

      if (error) throw error;

      if (!checklists || checklists.length === 0) {
        alert('No checklists found for this shift');
        return;
      }

      const printWindow = window.open('', '_blank');
      const checklistsHTML = checklists.map(checklist => `
        <div style="page-break-after: always; margin-bottom: 20px;">
          <h2>${checklist.title}</h2>
          <p><strong>Type:</strong> ${checklist.checklist_type} | <strong>Shift:</strong> ${checklist.shift_type}</p>
          <p><strong>Date:</strong> ${formatDate(selectedDate)}</p>
          ${checklist.description ? `<p>${checklist.description}</p>` : ''}
          <ul style="list-style: none; padding: 0;">
            ${(checklist.checklist_items || [])
              .sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
              .map(item => `
                <li style="margin: 10px 0; padding: 10px; border: 1px solid #ddd;">
                  <input type="checkbox" style="margin-right: 10px;" />
                  ${item.item_text}
                  ${item.is_required ? '<span style="color: red;"> *</span>' : ''}
                </li>
              `).join('')}
          </ul>
          <div style="margin-top: 30px;">
            <p><strong>Completed by:</strong> ___________________ <strong>Time:</strong> ___________</p>
            <p><strong>Verified by:</strong> ___________________ <strong>Time:</strong> ___________</p>
          </div>
        </div>
      `).join('');

      printWindow.document.write(`
        <html>
          <head>
            <title>${shiftType} Checklists - ${formatDate(selectedDate)}</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; }
              h1 { color: #c00; }
              h2 { color: #333; border-bottom: 2px solid #c00; padding-bottom: 5px; }
              @media print {
                button { display: none; }
              }
            </style>
          </head>
          <body>
            <h1>${shiftType} Checklists - ${formatDate(selectedDate)}</h1>
            ${checklistsHTML}
            <button onclick="window.print()" style="padding: 10px 20px; background: #c00; color: white; border: none; cursor: pointer; margin: 20px 0;">
              Print Checklists
            </button>
          </body>
        </html>
      `);
      printWindow.document.close();
    } catch (error) {
      console.error('Error loading checklists:', error);
      alert('Failed to load checklists: ' + error.message);
    }
  };

  const handleConfigConfirm = async (config) => {
    try {
      setShowConfigModal(false);
      setAutoAssigning(true);

      const results = await intelligentAutoDeployment(selectedDate, pendingShiftType, config, false);
      setAutoAssignResults(results);
      setShowAutoAssignModal(true);

      if (onRefreshData) {
        await onRefreshData();
      }
    } catch (error) {
      console.error('Error auto-assigning positions:', error);
      alert('Error auto-assigning positions: ' + error.message);
    } finally {
      setAutoAssigning(false);
      setPendingShiftType(null);
    }
  };

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
      <div className="bg-white rounded-lg shadow-md p-6 border border-gray-100">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Selected Date
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
              />
            </div>
            <div className="text-sm">
              <div className="font-bold text-gray-900 text-base">{formatDate(selectedDate)}</div>
              <div className="text-gray-600 font-medium">{currentDeployments.length} deployments scheduled</div>
              <div className="text-sm text-info font-semibold mt-1">
                Forecast: {currentShiftInfo.forecast || '£0.00'}
                (Day: {currentShiftInfo.day_shift_forecast || '£0.00'},
                Night: {currentShiftInfo.night_shift_forecast || '£0.00'})
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={onRefreshData}
              className="bg-gray-700 hover:bg-gray-800 text-white px-5 py-2.5 rounded-lg flex items-center gap-2 font-semibold transition-all shadow-sm hover:shadow-md active:scale-95"
              title="Refresh data"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
            <button
              onClick={() => setShowDuplicateModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg flex items-center gap-2 font-semibold transition-all shadow-sm hover:shadow-md active:scale-95"
            >
              <Copy className="w-4 h-4" />
              Duplicate
            </button>
            {currentDeployments.length > 0 && (
              <button
                onClick={() => setShowDeleteModal(true)}
                className="bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-lg flex items-center gap-2 font-semibold transition-all shadow-sm hover:shadow-md active:scale-95"
              >
                <Trash2 className="w-4 h-4" />
                Delete All
              </button>
            )}
            <button
              onClick={() => onExportPDF('all')}
              className="bg-success hover:bg-success/90 text-white px-5 py-2.5 rounded-lg flex items-center gap-2 font-semibold transition-all shadow-sm hover:shadow-md active:scale-95"
            >
              <Download className="w-4 h-4" />
              PDF
            </button>
            {/* Excel export temporarily hidden
            <button
              onClick={onExportAllExcel}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
            >
              <FileText className="w-4 h-4" />
              Excel
            </button>
            */}
          </div>
        </div>
      </div>

      {/* Shift Information */}
      <div className="bg-white rounded-lg shadow-md p-6 border border-gray-100">
        <h2 className="text-xl font-bold mb-5 flex items-center gap-2 text-info">
          <Calendar className="w-6 h-6" />
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
              className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
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
              className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
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
              className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
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
              className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
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
      <div className="bg-white rounded-lg shadow-md p-6 border border-gray-100">
        <h2 className="text-xl font-bold mb-5 flex items-center gap-2 text-success">
          <Plus className="w-6 h-6" />
          Add New Deployment
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Staff Member</label>
            <select
              value={newDeployment.staff_id}
              onChange={(e) => setNewDeployment(prev => ({ ...prev, staff_id: e.target.value }))}
              className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
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
              className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
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
              className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
            <input
              type="time"
              value={newDeployment.end_time}
              onChange={(e) => setNewDeployment(prev => ({ ...prev, end_time: e.target.value }))}
              className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
            <select
              value={newDeployment.position}
              onChange={(e) => setNewDeployment(prev => ({ ...prev, position: e.target.value }))}
              className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
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
              className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
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
              className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
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
              className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
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
          className="bg-success hover:bg-success/90 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg flex items-center gap-2 font-semibold shadow-md hover:shadow-lg transition-all active:scale-95"
        >
          <Plus className="w-5 h-5" />
          {uiLoading ? 'Adding...' : 'Add Deployment'}
        </button>
      </div>

      {/* Current Deployments */}
      <div className="space-y-6">
        {/* Day Shift */}
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-bold flex items-center gap-2 text-warning">
              <Clock className="w-6 h-6" />
              Day Shift Deployments ({dayShiftDeployments.length})
            </h2>
            <div className="flex gap-2">
              <button
                onClick={() => handleAutoAssignClick('Day Shift')}
                disabled={autoAssigning || dayShiftDeployments.length === 0}
                className="bg-primary hover:bg-primary-hover disabled:bg-gray-400 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 shadow-sm transition-all active:scale-95"
              >
                <Zap className="w-4 h-4" />
                {autoAssigning ? 'Assigning...' : 'Auto-Assign Positions'}
              </button>
              {/* Excel export temporarily hidden
              <button
                onClick={() => onExportShiftExcel('Day Shift')}
                className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm flex items-center gap-1"
              >
                <FileText className="w-3 h-3" />
                Excel Day Shift
              </button>
              */}
              <button
                onClick={() => onExportPDF('day')}
                className="bg-info hover:bg-info/90 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 shadow-sm transition-all active:scale-95"
              >
                <Download className="w-4 h-4" />
                PDF Day Shift
              </button>
              <button
                onClick={() => handlePrintChecklists('Day Shift')}
                className="bg-orange-600 hover:bg-orange-700 text-white px-3 py-1 rounded text-sm flex items-center gap-1"
              >
                <Printer className="w-3 h-3" />
                Checklists
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
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-bold flex items-center gap-2 text-secondary">
              <Clock className="w-6 h-6" />
              Night Shift Deployments ({nightShiftDeployments.length})
            </h2>
            <div className="flex gap-2">
              <button
                onClick={() => handleAutoAssignClick('Night Shift')}
                disabled={autoAssigning || nightShiftDeployments.length === 0}
                className="bg-primary hover:bg-primary-hover disabled:bg-gray-400 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 shadow-sm transition-all active:scale-95"
              >
                <Zap className="w-4 h-4" />
                {autoAssigning ? 'Assigning...' : 'Auto-Assign Positions'}
              </button>
              {/* Excel export temporarily hidden
              <button
                onClick={() => onExportShiftExcel('Night Shift')}
                className="bg-success hover:bg-success/90 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 shadow-sm transition-all active:scale-95"
              >
                <FileText className="w-4 h-4" />
                Excel Night Shift
              </button>
              */}
              <button
                onClick={() => onExportPDF('night')}
                className="bg-info hover:bg-info/90 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 shadow-sm transition-all active:scale-95"
              >
                <Download className="w-4 h-4" />
                PDF Night Shift
              </button>
              <button
                onClick={() => handlePrintChecklists('Night Shift')}
                className="bg-warning hover:bg-warning/90 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 shadow-sm transition-all active:scale-95"
              >
                <Printer className="w-4 h-4" />
                Checklists
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
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-100">
          <h2 className="text-xl font-bold mb-5 flex items-center gap-2 text-warning">
            <Target className="w-6 h-6" />
            Today's Targets
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {supabaseTargets.map(target => (
              <div key={target.id} className="bg-warning/10 border-2 border-warning/30 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="font-semibold text-sm text-gray-700">{target.name}</div>
                <div className="text-xl font-bold text-warning mt-1">{target.value}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Delete All Deployments Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md border-2 border-destructive/20 animate-scale-in">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-destructive flex items-center gap-2">
                <AlertCircle className="w-6 h-6" />
                Delete All Deployments
              </h3>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-6">
              <p className="text-gray-700 mb-3 font-medium">
                Are you sure you want to delete all deployments for <strong>{formatDate(selectedDate)}</strong>?
              </p>
              <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg border border-destructive/20">
                This action cannot be undone. {currentDeployments.length} deployment(s) will be permanently removed.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleDeleteAllDeployments}
                className="flex-1 bg-destructive hover:bg-destructive/90 text-white px-4 py-3 rounded-lg flex items-center justify-center gap-2 font-semibold shadow-md transition-all active:scale-95"
              >
                <Trash2 className="w-4 h-4" />
                Delete All
              </button>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-6 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50 font-semibold transition-all active:scale-95"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Configuration Modal */}
      <DeploymentConfigModal
        isOpen={showConfigModal}
        onClose={() => {
          setShowConfigModal(false);
          setPendingShiftType(null);
        }}
        onConfirm={handleConfigConfirm}
        shiftType={pendingShiftType}
        selectedDate={selectedDate}
      />

      {/* Auto-Assign Results Modal */}
      {showAutoAssignModal && autoAssignResults && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Zap className="w-5 h-5 text-purple-600" />
                Auto-Assignment Results
              </h3>
              <button
                onClick={() => setShowAutoAssignModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {autoAssignResults.appliedRules && autoAssignResults.appliedRules.length > 0 && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm font-semibold text-blue-900 mb-1">Applied Rules:</p>
                <ul className="text-xs text-blue-800 list-disc list-inside">
                  {autoAssignResults.appliedRules.map((rule, idx) => (
                    <li key={idx}>{rule}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="space-y-4">
              {autoAssignResults.assigned && autoAssignResults.assigned.length > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-semibold text-green-900 mb-2 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5" />
                    Successfully Assigned ({autoAssignResults.assigned.length})
                  </h4>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {autoAssignResults.assigned.map((result, idx) => (
                      <div key={idx} className="text-sm text-green-800 flex items-center justify-between">
                        <span>{result.staffName}</span>
                        <span className="font-medium">→ {result.position}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {autoAssignResults.skipped && autoAssignResults.skipped.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h4 className="font-semibold text-yellow-900 mb-2 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" />
                    Skipped ({autoAssignResults.skipped.length})
                  </h4>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {autoAssignResults.skipped.map((result, idx) => (
                      <div key={idx} className="text-sm text-yellow-800">
                        <div className="font-medium">{result.staffName}</div>
                        <div className="text-xs">{result.reason}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {autoAssignResults.failed && autoAssignResults.failed.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h4 className="font-semibold text-red-900 mb-2">
                    Failed ({autoAssignResults.failed.length})
                  </h4>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {autoAssignResults.failed.map((result, idx) => (
                      <div key={idx} className="text-sm text-red-800">
                        <div className="font-medium">{result.staffName}</div>
                        <div className="text-xs">{result.error}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowAutoAssignModal(false)}
                className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg"
              >
                Close
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
                className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
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