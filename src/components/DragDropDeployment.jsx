import React, { useState, useRef, useEffect } from 'react';
import { useSupabaseData } from '../hooks/useSupabaseData';
import { calculateWorkHours, calculateBreakTime } from '../utils/timeCalculations';
import { 
  Users, 
  MapPin, 
  Clock, 
  Settings, 
  Plus, 
  Trash2, 
  Save, 
  Calendar, 
  ChefHat, 
  Store, 
  UserCheck, 
  Chrome as Broom, 
  GripVertical,
  ArrowLeft,
  Target,
  Zap,
  RotateCcw,
  X
} from 'lucide-react';

const DragDropDeployment = ({ onBack, templateShifts = [], uiLoading, setUiLoading, hideNavigation = false }) => {
  const {
    staff,
    positions,
    deploymentsByDate,
    shiftInfoByDate,
    targets,
    addDeployment,
    removeDeployment,
    updateDeployment,
    getPositionsByType,
    loading: supabaseLoading,
    error: supabaseError
  } = useSupabaseData();

  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  
  const [selectedShiftType, setSelectedShiftType] = useState('Day Shift');
  const [draggedItem, setDraggedItem] = useState(null);
  const [deploymentRows, setDeploymentRows] = useState([]);
  const [dragOverZone, setDragOverZone] = useState(null);
  const [touchDevice, setTouchDevice] = useState(false);
  const [showRecallModal, setShowRecallModal] = useState(false);
  const [editingShiftTime, setEditingShiftTime] = useState(null);

  const handleRecallAllStaff = async () => {
    try {
      setUiLoading(true);

      // Get all existing deployments for the current date and shift type
      const deploymentsToRecall = currentDeployments.filter(d => d.shift_type === selectedShiftType);

      console.log('🔄 Recalling deployments:', deploymentsToRecall.length);
      console.log('📋 Deployments to recall:', deploymentsToRecall);

      // Move each deployment to workspace (same as Edit)
      for (const deployment of deploymentsToRecall) {
        const newRow = {
          id: `row-${Date.now()}-${Math.random()}`,
          staff: deployment.staff ? {
            id: deployment.staff.id,
            name: deployment.staff.name,
            is_under_18: deployment.staff.is_under_18
          } : null,
          position: deployment.position || '',
          secondary: deployment.secondary || '',
          shiftTime: {
            startTime: deployment.start_time,
            endTime: deployment.end_time,
            shift_type: deployment.shift_type
          },
          area: deployment.area || '',
          closing: deployment.closing || '',
          originalDeploymentId: deployment.id
        };

        setDeploymentRows(prev => [...prev, newRow]);
        console.log('➕ Added row to workspace:', newRow);

        // Remove from database
        await removeDeployment(deployment.id);
      }

      console.log('✅ All staff recalled to workspace');
      setShowRecallModal(false);

    } catch (error) {
      console.error('❌ Error recalling staff:', error);
    } finally {
      setUiLoading(false);
    }
  };

  const handleResetWorkspace = () => {
    setDeploymentRows([]);
  };

  // Detect touch device
  useEffect(() => {
    setTouchDevice('ontouchstart' in window);
  }, []);

  // Get current deployments and shift info
  const currentDeployments = deploymentsByDate[selectedDate] || [];
  const currentShiftInfo = shiftInfoByDate[selectedDate] || {};

  // Generate position categories dynamically from database
  const generatePositionCategories = () => {
    const areas = positions.filter(p => p.type === 'area');
    const categories = {};
    
    // Define icon mapping for areas
    const areaIcons = {
      'Kitchen': ChefHat,
      'DT': Store,
      'Front': UserCheck,
      'Lobby': Users,
      'Mid': MapPin,
      'Cooks': ChefHat,
      'Float': Target,
      'Packing': UserCheck
    };
    
    // Define color mapping for areas
    const areaColors = {
      'Kitchen': 'bg-orange-100 border-orange-300 text-orange-800',
      'DT': 'bg-blue-100 border-blue-300 text-blue-800',
      'Front': 'bg-green-100 border-green-300 text-green-800',
      'Lobby': 'bg-yellow-100 border-yellow-300 text-yellow-800',
      'Mid': 'bg-pink-100 border-pink-300 text-pink-800',
      'Cooks': 'bg-orange-100 border-orange-300 text-orange-800',
      'Float': 'bg-purple-100 border-purple-300 text-purple-800',
      'Packing': 'bg-green-100 border-green-300 text-green-800'
    };
    
    // Sort areas by display_order first
    areas.sort((a, b) => (a.display_order || 0) - (b.display_order || 0)).forEach(area => {
      const areaPositions = positions
        .filter(p => p.area_id === area.id && p.type === 'position')
        .sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
      
      if (areaPositions.length > 0) {
        categories[area.id] = {
          name: area.name,
          icon: areaIcons[area.name] || MapPin,
          positions: areaPositions.map(p => p.name),
          color: areaColors[area.name] || 'bg-gray-100 border-gray-300 text-gray-800'
        };
      }
    });
    
    // Don't include unassigned positions - they should all be assigned to areas
    
    return categories;
  };
  
  const positionCategories = generatePositionCategories();

  // Debug logging for position categories
  useEffect(() => {
    console.log('🏷️ Position Categories:', positionCategories);
    console.log('📦 Total Positions:', positions.length);
    console.log('📍 Areas:', positions.filter(p => p.type === 'area').length);
    console.log('🔍 Position Categories Keys:', Object.keys(positionCategories));
    console.log('🔍 Position Categories Entries:', Object.entries(positionCategories));
    if (positions.length > 0) {
      console.log('🔍 Sample positions:', positions.slice(0, 3));
      console.log('🔍 Sample areas:', positions.filter(p => p.type === 'area').slice(0, 2));
    }
  }, [positions, positionCategories]);

  // Simple drag and drop handlers
  const handleDragStart = (e, item, type) => {
    console.log('🚀 Drag started:', { item, type });
    // Create clean serializable drag data with only primitive values
    const dragData = {
      id: item.id || null,
      name: item.name || '',
      is_under_18: Boolean(item.is_under_18),
      startTime: item.startTime || '',
      endTime: item.endTime || '',
      type: item.type || '',
      area_id: item.area_id || null,
      shift_type: item.shift_type || '',
      dragType: type
    };
    setDraggedItem(dragData);
    
    e.dataTransfer.effectAllowed = 'move';
    try {
      e.dataTransfer.setData('text/plain', JSON.stringify(dragData));
    } catch (error) {
      console.error('Error serializing drag data:', error.message);
      e.dataTransfer.setData('text/plain', '');
    }
  };

  const handleDragEnd = (e) => {
    console.log('🏁 Drag ended');
    setDraggedItem(null);
    setDragOverZone(null);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnter = (e, zone) => {
    e.preventDefault();
    console.log('📍 Drag enter zone:', zone);
    setDragOverZone(zone);
  };

  const handleDragLeave = (e) => {
    // Only clear if we're actually leaving the drop zone
    if (!e.currentTarget.contains(e.relatedTarget)) {
      console.log('🚪 Drag leave');
      setDragOverZone(null);
    }
  };

  const handleDrop = (e, dropZone) => {
    e.preventDefault();
    console.log('🎯 Drop event:', { draggedItem, dropZone, currentRows: deploymentRows.length });
    
    if (!draggedItem) {
      console.log('❌ No dragged item');
      return;
    }

    if (dropZone.startsWith('column-')) {
      const parts = dropZone.split('-');
      const columnType = parts[1]; // Extract just the column type (staff, position, etc.)
      const rowId = parts.slice(2).join('-'); // Extract the row ID
      console.log('📋 Adding to column:', { item: draggedItem, columnType, rowId });
      addToColumn(draggedItem, columnType, rowId);
    }

    setDraggedItem(null);
    setDragOverZone(null);
  };

  const addToColumn = (item, columnType, rowId) => {
    console.log('📋 Adding to column:', { item, columnType, rowId });
    
    setDeploymentRows(prev => {
      return prev.map(row => {
        if (row.id === rowId) {
          console.log('🎯 Found matching row:', row.id);
          const updatedRow = { ...row };
          
          switch (columnType) {
            case 'staff':
              if (item.dragType === 'staff') {
                updatedRow.staff = { 
                  id: item.id, 
                  name: item.name, 
                  is_under_18: item.is_under_18 
                };
                console.log('✅ Staff added to row:', item.name);
              }
              break;
            case 'position':
              if (item.dragType === 'position') {
                updatedRow.position = item.name;
                console.log('✅ Position added to row:', item.name);
              }
              break;
            case 'secondary':
              if (item.dragType === 'position') {
                updatedRow.secondary = item.name;
                console.log('✅ Secondary position added to row:', item.name);
              }
              break;
            case 'shift':
              if (item.dragType === 'shift') {
                updatedRow.shiftTime = {
                  id: item.id,
                  name: item.name,
                  startTime: item.startTime,
                  endTime: item.endTime,
                  shift_type: item.shift_type
                };
                console.log('✅ Shift time added to row:', item.name);
              }
              break;
            case 'area':
              if (item.dragType === 'area') {
                updatedRow.area = item.name;
                console.log('✅ Area added to row:', item.name);
              }
              break;
            case 'closing':
              if (item.dragType === 'position') {
                updatedRow.closing = item.name;
                console.log('✅ Position added to closing row:', item.name);
              }
              break;
            default:
              console.log('❌ Unknown column type:', columnType);
          }
          
          console.log('🔄 Updated row:', updatedRow);
          return updatedRow;
        }
        return row;
      });
    });
  };

  const removeFromWorkspace = (rowId) => {
    setDeploymentRows(prev => prev.filter(row => row.id !== rowId));
  };

  const updateWorkspaceRow = (rowId, field, value) => {
    setDeploymentRows(prev => 
      prev.map(row => 
        row.id === rowId ? { ...row, [field]: value } : row
      )
    );
  };

  const updateShiftTime = (rowId, field, value) => {
    setDeploymentRows(prev => 
      prev.map(row => {
        if (row.id === rowId && row.shiftTime) {
          return {
            ...row,
            shiftTime: {
              ...row.shiftTime,
              [field]: value
            }
          };
        }
        return row;
      })
    );
  };

  const saveDeployments = async () => {
    try {
      setUiLoading(true);

      console.log('🔍 Current deployment rows:', deploymentRows);

      const deploymentsToSave = deploymentRows
        .filter(row => {
          const hasStaff = row.staff && row.staff.id;
          const hasShiftTime = row.shiftTime && row.shiftTime.startTime && row.shiftTime.endTime;
          const hasPosition = row.position !== undefined && row.position !== null;

          console.log(`📝 Row ${row.id}:`, { hasStaff, hasShiftTime, hasPosition, staff: row.staff?.name, position: row.position, shiftTime: row.shiftTime });

          return hasStaff && hasShiftTime && hasPosition;
        })
        .map(row => ({
          date: selectedDate,
          staff_id: row.staff.id,
          start_time: row.shiftTime.startTime,
          end_time: row.shiftTime.endTime,
          position: row.position,
          secondary: row.secondary || '',
          area: row.area || '',
          closing: row.closing || '',
          break_minutes: calculateBreakTimeLocal(row.staff, row.shiftTime),
          shift_type: selectedShiftType
        }));

      console.log('💾 Saving deployments:', deploymentsToSave);

      for (const deployment of deploymentsToSave) {
        await addDeployment(deployment);
      }

      setDeploymentRows([]);
      
    } catch (error) {
      console.error('💥 Error saving deployments:', error);
    } finally {
      setUiLoading(false);
    }
  };

  const calculateBreakTimeLocal = (staffMember, shift) => {
    const workHours = calculateWorkHours(shift.startTime, shift.endTime);
    return calculateBreakTime(staffMember, workHours);
  };

  const clearWorkspace = () => {
    setDeploymentRows([]);
  };

  const addNewRow = () => {
    const newRow = {
      id: `row-${Date.now()}`,
      staff: null,
      position: '',
      secondary: '',
      shiftTime: null,
      area: '',
      closing: ''
    };
    setDeploymentRows(prev => [...prev, newRow]);
  };

  const handleEditExistingDeployment = async (deployment) => {
    try {
      // Create a new row with all the deployment details
      const newRow = {
        id: `row-${Date.now()}`,
        staff: deployment.staff ? {
          id: deployment.staff.id,
          name: deployment.staff.name,
          is_under_18: deployment.staff.is_under_18
        } : null,
        position: deployment.position || '',
        secondary: deployment.secondary || '',
        shiftTime: {
          startTime: deployment.start_time,
          endTime: deployment.end_time,
          shift_type: deployment.shift_type
        },
        area: deployment.area || '',
        closing: deployment.closing || '',
        originalDeploymentId: deployment.id // Track original for deletion
      };
      
      // Add to workspace
      setDeploymentRows(prev => [...prev, newRow]);
      
      // Remove the original deployment from database
      await removeDeployment(deployment.id);
      
      console.log('✅ Deployment moved to workspace for editing:', deployment.staff?.name);
      
    } catch (error) {
      console.error('❌ Failed to edit deployment:', error);
    }
  };

  if (supabaseLoading) {
    return (
      <div className="h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading deployment system...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-white shadow-sm border-b flex-shrink-0 p-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1.5 rounded-lg flex items-center gap-2 text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <Zap className="w-5 h-5 text-blue-600" />
              Interactive Deployment Builder
            </h1>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowRecallModal(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded-lg flex items-center gap-2 text-sm"
            >
              <Users className="w-4 h-4" />
              Recall All Staff
            </button>
            <button
              onClick={handleResetWorkspace}
              className="bg-orange-600 hover:bg-orange-700 text-white px-3 py-1.5 rounded-lg flex items-center gap-2 text-sm"
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </button>
            <button
              onClick={clearWorkspace}
              className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1.5 rounded-lg flex items-center gap-2 text-sm"
            >
              <Trash2 className="w-4 h-4" />
              Clear
            </button>
            <button
              onClick={saveDeployments}
              disabled={uiLoading || deploymentRows.length === 0}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-3 py-1.5 rounded-lg flex items-center gap-2 text-sm"
            >
              <Save className="w-4 h-4" />
              {uiLoading ? 'Saving...' : 'Save Deployment'}
            </button>
          </div>
        </div>

        <div className="flex gap-4 items-center mt-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Shift Type</label>
            <select
              value={selectedShiftType}
              onChange={(e) => setSelectedShiftType(e.target.value)}
              className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="Day Shift">Day Shift</option>
              <option value="Night Shift">Night Shift</option>
            </select>
          </div>
          <div className="text-xs text-gray-600">
            <div>Active rows: {deploymentRows.length}</div>
            <div>Complete deployments: {deploymentRows.filter(r => r.staff && r.position && r.shiftTime).length}</div>
            <div>Staff deployed: {deploymentRows.filter(r => r.staff).length}/{staff.length}</div>
            <div>Area assignments: {deploymentRows.filter(r => r.area).length}</div>
          </div>
        </div>
      </div>

      {/* Main Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel - Staff List */}
        <div className="w-64 bg-white border-r flex-shrink-0 flex flex-col">
          <div className="p-3 border-b bg-gray-50">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              Staff ({staff.length})
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {staff.map(member => (
              <div
                key={member.id}
                draggable
                onDragStart={(e) => handleDragStart(e, member, 'staff')}
                onDragEnd={handleDragEnd}
                className="p-3 bg-blue-50 border border-blue-200 rounded-lg cursor-move hover:bg-blue-100 transition-all duration-200 transform hover:scale-105 active:scale-95 flex items-center gap-2"
              >
                <GripVertical className="w-4 h-4 text-gray-400" />
                <div className="flex-1">
                  <div className="font-medium text-sm">{member.name}</div>
                  {member.is_under_18 && (
                    <div className="text-xs text-orange-600 font-medium">Under 18</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Center - Main Workspace */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Position Categories - Single Row */}
          <div className="bg-white border-b p-3">
            <div className="flex gap-3 overflow-x-auto pb-2">
              {Object.entries(positionCategories)
                .sort(([aKey, aCategory], [bKey, bCategory]) => {
                  // Sort by the area's display_order
                  const aArea = positions.find(p => p.id === aKey && p.type === 'area');
                  const bArea = positions.find(p => p.id === bKey && p.type === 'area');
                  return (aArea?.display_order || 0) - (bArea?.display_order || 0);
                })
                .map(([key, category]) => {
                const Icon = category.icon;
                return (
                  <div key={key} className={`${category.color} rounded-lg p-3 border-2 border-dashed min-w-[180px] flex-shrink-0`}>
                    <h3 className="font-semibold mb-2 flex items-center gap-2 text-sm">
                      <Icon className="w-4 h-4" />
                      {category.name}
                    </h3>
                    <div className="flex flex-wrap gap-1">
                      {category.positions.map(positionName => (
                        <div
                          key={positionName}
                          draggable
                          onDragStart={(e) => handleDragStart(e, { name: positionName }, 'position')}
                          onDragEnd={handleDragEnd}
                          className="px-2 py-1 bg-white rounded text-xs cursor-move hover:bg-gray-50 border transition-all duration-200 transform hover:scale-105 active:scale-95"
                        >
                          {positionName}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Deployment Workspace */}
          <div className="flex-1 bg-white p-4 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Deployment Rows</h3>
              <div className="flex gap-2">
                <span className="text-sm text-gray-600">
                  Use arrow keys or scroll to navigate • Drag items between rows
                </span>
                <button
                  onClick={addNewRow}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Row
                </button>
              </div>
            </div>

            {/* Column Headers */}
            <div className="grid grid-cols-7 gap-4 mb-4 text-sm font-medium text-gray-700">
              <div>Staff</div>
              <div>Position</div>
              <div>Secondary</div>
              <div>Shift Time</div>
              <div>Area</div>
              <div>Closing</div>
              <div>Actions</div>
            </div>

            {/* Deployment Rows */}
            <div className="space-y-3">
              {deploymentRows.map((row, index) => (
                <div
                  key={row.id}
                  className="grid grid-cols-7 gap-4 p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  {/* Staff Column */}
                  <div
                    className={`border-2 border-dashed rounded-lg p-3 min-h-[60px] flex items-center justify-center transition-colors ${
                      dragOverZone === `column-staff-${row.id}` ? 'border-blue-500 bg-blue-100' : 'border-blue-300 bg-blue-50'
                    }`}
                    onDragOver={handleDragOver}
                    onDragEnter={(e) => handleDragEnter(e, `column-staff-${row.id}`)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, `column-staff-${row.id}`)}
                  >
                    {row.staff ? (
                      <div className="text-center">
                        <div className="font-medium text-sm">{row.staff.name}</div>
                        {row.staff.is_under_18 && (
                          <div className="text-xs text-orange-600">Under 18</div>
                        )}
                        <button
                          onClick={() => updateWorkspaceRow(row.id, 'staff', null)}
                          className="mt-1 text-xs text-red-600 hover:text-red-800"
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <span className="text-gray-500 text-sm">Drop staff here</span>
                    )}
                  </div>

                  {/* Position Column */}
                  <div
                    className={`border-2 border-dashed rounded-lg p-3 min-h-[60px] flex items-center justify-center transition-colors ${
                      dragOverZone === `column-position-${row.id}` ? 'border-orange-500 bg-orange-100' : 'border-orange-300 bg-orange-50'
                    }`}
                    onDragOver={handleDragOver}
                    onDragEnter={(e) => handleDragEnter(e, `column-position-${row.id}`)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, `column-position-${row.id}`)}
                  >
                    {row.position ? (
                      <div className="text-center">
                        <span className="font-medium text-sm">{row.position}</span>
                        <button
                          onClick={() => updateWorkspaceRow(row.id, 'position', '')}
                          className="block mt-1 text-xs text-red-600 hover:text-red-800 mx-auto"
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <span className="text-gray-500 text-sm">Drop position</span>
                    )}
                  </div>

                  {/* Secondary Column */}
                  <div
                    className={`border-2 border-dashed rounded-lg p-3 min-h-[60px] flex items-center justify-center transition-colors ${
                      dragOverZone === `column-secondary-${row.id}` ? 'border-green-500 bg-green-100' : 'border-green-300 bg-green-50'
                    }`}
                    onDragOver={handleDragOver}
                    onDragEnter={(e) => handleDragEnter(e, `column-secondary-${row.id}`)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, `column-secondary-${row.id}`)}
                  >
                    <div className="text-center">
                      {row.secondary ? (
                        <div>
                          <span className="font-medium text-sm">{row.secondary}</span>
                          <button
                            onClick={() => updateWorkspaceRow(row.id, 'secondary', '')}
                            className="block mt-1 text-xs text-red-600 hover:text-red-800 mx-auto"
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        <span className="text-gray-500 text-sm">Optional</span>
                      )}
                    </div>
                  </div>

                  {/* Shift Time Column */}
                  <div
                    className={`border-2 border-dashed rounded-lg p-3 min-h-[60px] flex items-center justify-center transition-colors ${
                      dragOverZone === `column-shift-${row.id}` ? 'border-purple-500 bg-purple-100' : 'border-purple-300 bg-purple-50'
                    }`}
                    onDragOver={handleDragOver}
                    onDragEnter={(e) => handleDragEnter(e, `column-shift-${row.id}`)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, `column-shift-${row.id}`)}
                  >
                    {row.shiftTime ? (
                      <div className="text-center">
                        {editingShiftTime === row.id ? (
                          <div className="space-y-2">
                            <input
                              type="time"
                              value={row.shiftTime.startTime}
                              onChange={(e) => updateShiftTime(row.id, 'startTime', e.target.value)}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                              autoFocus
                            />
                            <input
                              type="time"
                              value={row.shiftTime.endTime}
                              onChange={(e) => updateShiftTime(row.id, 'endTime', e.target.value)}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                            />
                            <div className="flex gap-1 mt-2">
                              <button
                                onClick={() => setEditingShiftTime(null)}
                                className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => setEditingShiftTime(null)}
                                className="text-xs bg-gray-600 text-white px-2 py-1 rounded hover:bg-gray-700"
                              >
                                Done
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div 
                            className="font-medium text-sm cursor-pointer hover:bg-purple-100 rounded p-1"
                            onClick={() => setEditingShiftTime(row.id)}
                            title="Click to edit times"
                          >
                            {row.shiftTime.startTime} - {row.shiftTime.endTime}
                          </div>
                        )}
                        <button
                          onClick={() => updateWorkspaceRow(row.id, 'shiftTime', null)}
                          className="mt-1 text-xs text-red-600 hover:text-red-800"
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <span className="text-gray-500 text-sm">Drop shift</span>
                    )}
                  </div>

                  {/* Area Column */}
                  <div
                    className={`border-2 border-dashed rounded-lg p-3 min-h-[60px] flex items-center justify-center transition-colors ${
                      dragOverZone === `column-area-${row.id}` ? 'border-indigo-500 bg-indigo-100' : 'border-indigo-300 bg-indigo-50'
                    }`}
                    onDragOver={handleDragOver}
                    onDragEnter={(e) => handleDragEnter(e, `column-area-${row.id}`)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, `column-area-${row.id}`)}
                  >
                    {row.area ? (
                      <div className="text-center">
                        <span className="font-medium text-sm">{row.area}</span>
                        <button
                          onClick={() => updateWorkspaceRow(row.id, 'area', '')}
                          className="block mt-1 text-xs text-red-600 hover:text-red-800 mx-auto"
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <span className="text-gray-500 text-sm">Drop area here</span>
                    )}
                  </div>

                  {/* Closing Column */}
                  <div
                    className={`border-2 border-dashed rounded-lg p-3 min-h-[60px] flex items-center justify-center transition-colors ${
                      dragOverZone === `column-closing-${row.id}` ? 'border-red-500 bg-red-100' : 'border-red-300 bg-red-50'
                    }`}
                    onDragOver={handleDragOver}
                    onDragEnter={(e) => handleDragEnter(e, `column-closing-${row.id}`)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, `column-closing-${row.id}`)}
                  >
                    {row.closing ? (
                      <div className="text-center">
                        <span className="font-medium text-sm">{row.closing}</span>
                        <button
                          onClick={() => updateWorkspaceRow(row.id, 'closing', '')}
                          className="block mt-1 text-xs text-red-600 hover:text-red-800 mx-auto"
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <span className="text-gray-500 text-sm">Drop closing here</span>
                    )}
                  </div>

                  {/* Actions Column */}
                  <div className="flex items-center justify-center">
                    <button
                      onClick={() => removeFromWorkspace(row.id)}
                      className="text-red-600 hover:text-red-800 p-1"
                      title="Remove entire row"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}

              {/* Empty State */}
              {deploymentRows.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <Calendar className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-xl font-medium mb-2">Interactive Deployment Workspace</p>
                  <p className="text-sm mb-4">Drag staff, positions, and shifts into the workspace</p>
                  <button
                    onClick={addNewRow}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center gap-2 mx-auto"
                  >
                    <Plus className="w-4 h-4" />
                    Add First Row
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Panel - Template Shifts */}
        <div className="w-64 bg-white border-l flex-shrink-0 flex flex-col">
          <div className="p-3 border-b bg-gray-50">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Clock className="w-5 h-5 text-green-600" />
              Template Shifts
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {templateShifts
              .filter(template => template.type === selectedShiftType)
              .map(template => (
                <div
                  key={template.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, template, 'shift')}
                  onDragEnd={handleDragEnd}
                  className="p-3 bg-green-50 border border-green-200 rounded-lg cursor-move hover:bg-green-100 transition-all duration-200 transform hover:scale-105 active:scale-95"
                >
                  <div className="font-medium text-sm">{template.name}</div>
                  <div className="text-xs text-gray-600">
                    {template.startTime} - {template.endTime}
                  </div>
                  <div className="text-xs text-green-700 font-medium mt-1">
                    {template.type}
                  </div>
                </div>
              ))}
            
            {templateShifts.filter(t => t.type === selectedShiftType).length === 0 && (
              <div className="text-center text-gray-500 text-sm py-8">
                <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No template shifts for {selectedShiftType}</p>
                <p className="text-xs mt-1">Add templates in Settings</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recall All Staff Modal */}
      {showRecallModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Recall All Staff</h3>
            <p className="text-gray-600 mb-6">
              This will remove all staff members from deployment rows while keeping the row structure intact.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleRecallAllStaff}
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg"
              >
                Recall All Staff
              </button>
              <button
                onClick={() => setShowRecallModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Current Deployments Summary */}
      {currentDeployments.length > 0 && (
        <div className="bg-white border-t p-4 flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Existing Deployments for {selectedDate}</h2>
            <span className="text-sm text-gray-600">
              Click "Edit" to bring deployment back to workspace
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {currentDeployments
              .filter(d => d.shift_type === selectedShiftType)
              .map(deployment => (
                <div key={deployment.id} className="bg-gray-50 border border-gray-200 rounded-lg p-3 hover:bg-gray-100 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <div className="font-medium text-sm">{deployment.staff?.name}</div>
                    <button
                      onClick={() => handleEditExistingDeployment(deployment)}
                      className="text-blue-600 hover:text-blue-800 text-xs px-2 py-1 rounded border border-blue-300 hover:bg-blue-50"
                      title="Edit in workspace"
                    >
                      Edit
                    </button>
                  </div>
                  <div className="space-y-1 text-xs text-gray-600">
                    <div>Time: {deployment.start_time} - {deployment.end_time}</div>
                    <div>Position: {deployment.position}</div>
                    {deployment.secondary && <div>Secondary: {deployment.secondary}</div>}
                    {deployment.area && <div>Area: {deployment.area}</div>}
                    {deployment.closing && <div>Closing: {deployment.closing}</div>}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DragDropDeployment;