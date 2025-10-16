import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useSupabaseData } from '../hooks/useSupabaseData';
import { AccessControlManager } from '../utils/accessControl';
import GDPRComplianceManager from '../utils/gdprCompliance';
import GDPRPrivacyCenter from './GDPRPrivacyCenter';
import GDPRConsentBanner from './GDPRConsentBanner';
import DragDropDeployment from './DragDropDeployment';
import DeploymentPage from './DeploymentPage';
import SettingsPage from './SettingsPage';
import TargetSettingsPage from './TargetSettingsPage';
import SalesPage from './SalesPage';
import ScheduleUploader from './ScheduleUploader';
import Training from '../pages/Training';
import ProtectedPageWrapper from './ProtectedPageWrapper';
import PasswordProtectedDataProtection from './PasswordProtectedDataProtection';
import StationPositionMappingPage from './StationPositionMappingPage';
import RuleManagementPage from './RuleManagementPage';
import ChecklistsPage from './ChecklistsPage';
import HandoverNotesPage from './HandoverNotesPage';
import StaffLocationPage from './StaffLocationPage';
import BreakSchedulerPage from './BreakSchedulerPage';
import LaborSalesCalculatorPage from './LaborSalesCalculatorPage';
import PerformanceScorecardPage from './PerformanceScorecardPage';
import AutoAssignmentRulesPage from './AutoAssignmentRulesPage';
import PositionRelationshipsManager from './PositionRelationshipsManager';
import { DefaultTargetsManager } from '../utils/defaultTargets';
import { Plus, Trash2, Clock, Users, Calendar, Settings, Save, Download, TrendingUp, FileText, Copy, CalendarDays, Edit2, LogOut, X, CropIcon as DragDropIcon, GripVertical, Target, MapPin, ChefHat, Store, UserCheck, Chrome as Broom, AlertCircle, CheckCircle, Shield, Lock, UserX, Upload, Award, Link as LinkIcon, CheckSquare, MessageSquare, Navigation, Coffee, Calculator, BarChart3, Menu, ChevronDown } from 'lucide-react';

const DeploymentManagementSystem = () => {
  const handleLogout = async () => {
    await supabase.auth.signOut();
  };
  // Supabase data with descriptive aliases to avoid conflicts
  const {
    staff: supabaseStaff,
    positions: supabasePositions,
    deploymentsByDate,
    shiftInfoByDate,
    salesRecordsByDate,
    targets: supabaseTargets,
    templateShifts,
    loading: supabaseLoading,
    error: supabaseError,
    addStaff: addSupabaseStaff,
    removeStaff,
    addDeployment,
    removeDeployment,
    updateDeployment,
    updateShiftInfo,
    updateSalesRecords,
    calculateForecastTotals,
    duplicateDeployments,
    addPosition,
    removePosition,
    updatePosition,
    getPositionsByType,
    addTarget,
    updateTarget,
    removeTarget,
    addTemplateShift,
    removeTemplateShift,
    deleteAllDeployments,
    loadAllData
  } = useSupabaseData();

  // Local UI state with specific naming
  const [accessControl] = useState(new AccessControlManager());
  const [gdprManager] = useState(new GDPRComplianceManager(supabase));
  const [defaultTargetsManager] = useState(new DefaultTargetsManager());
  const [uiLoading, setUiLoading] = useState(false);
  const [uiError, setUiError] = useState('');
  const [currentPage, setCurrentPage] = useState('deployment');
  const [pageProtectionStatus, setPageProtectionStatus] = useState({
    settingsLocked: false
  });
  const [showPrivacyCenter, setShowPrivacyCenter] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState(null);

  const [newTemplateShift, setNewTemplateShift] = useState({
    name: '',
    startTime: '',
    endTime: '',
    type: 'Day Shift'
  });
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });

  // Drag and Drop State
  const [draggedItem, setDraggedItem] = useState(null);
  const [dragOverTarget, setDragOverTarget] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [touchDevice, setTouchDevice] = useState(false);

  // Form states
  const [newStaff, setNewStaff] = useState({ name: '', is_under_18: false });
  const [newPosition, setNewPosition] = useState({ name: '', type: 'position', area_id: null, display_order: 0 });
  const [newDeployment, setNewDeployment] = useState({
    staff_id: '',
    start_time: '',
    end_time: '',
    position: '',
    secondary: '',
    area: '',
    closing: '',
    shift_type: 'Day Shift'
  });
  const [newTarget, setNewTarget] = useState({ name: '', value: '', priority: 1 });

  // Modal states
  const [salesData, setSalesData] = useState({
    todayData: '',
    lastWeekData: '',
    lastYearData: ''
  });
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicateFromDate, setDuplicateFromDate] = useState('');

  // Drag and drop refs
  const dragCounter = useRef(0);
  const dropZoneRef = useRef(null);

  // Detect touch device
  useEffect(() => {
    setTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
    
    // PAGE PROTECTION SETTING: Check which pages are currently locked
    // Check page protection status
    const settingsLocked = accessControl.isPageLocked('settings');
    setPageProtectionStatus({ settingsLocked });
  }, [accessControl]);

  // Set current user after staff data is loaded
  useEffect(() => {
    if (supabaseStaff.length > 0) {
      setCurrentUser(supabaseStaff[0]); // Use first staff member as current user for demo
    } else {
      setCurrentUser(null);
    }
  }, [supabaseStaff]);

  // Position categories for drag and drop
  const positionCategories = {
    kitchen: {
      name: 'Kitchen',
      icon: ChefHat,
      positions: ['Cook', 'Cook2', 'Burgers', 'Fries', 'Chick', 'Transfer'],
      color: 'bg-orange-100 border-orange-300 text-orange-800'
    },
    frontOfHouse: {
      name: 'Front of House',
      icon: Store,
      positions: ['DT', 'DT2', 'Rst', 'Front', 'Mid', 'Lobby'],
      color: 'bg-blue-100 border-blue-300 text-blue-800'
    },
    packing: {
      name: 'Packing',
      icon: UserCheck,
      positions: ['DT Pack', 'Rst Pack', 'Deliv Pack'],
      color: 'bg-green-100 border-green-300 text-green-800'
    }
  };

  const areas = ['Cooks', 'DT', 'Front', 'Mid', 'Lobby', 'Pck Mid', 'Float / Bottlenecks', 'Table Service / Lobby'];
  const cleaningAreas = ['Lobby / Toilets', 'Front', 'Staff Room / Toilet', 'Kitchen'];

  // Get current data
  const currentDeployments = deploymentsByDate[selectedDate] || [];
  const currentShiftInfo = shiftInfoByDate[selectedDate] || {
    forecast: '£0.00',
    day_shift_forecast: '£0.00',
    night_shift_forecast: '£0.00',
    weather: '',
    notes: ''
  };

  // Drag and Drop Event Handlers
  const handleDragStart = (e, item, type) => {
    console.log('Drag started:', { item, type });
    
    // Create clean serializable drag data to avoid circular references
    const dragData = {
      id: item.id,
      name: item.name,
      is_under_18: item.is_under_18,
      startTime: item.startTime,
      endTime: item.endTime,
      type: item.type,
      area_id: item.area_id,
      dragType: type
    };
    setDraggedItem(dragData);
    setIsDragging(true);
    
    // Set drag effect
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', JSON.stringify(dragData));
    
    // Add visual feedback
    e.target.style.opacity = '0.5';
    
    // Add drag image for better UX
    if (e.dataTransfer.setDragImage) {
      const dragImage = e.target.cloneNode(true);
      dragImage.style.transform = 'rotate(5deg)';
      dragImage.style.opacity = '0.8';
      e.dataTransfer.setDragImage(dragImage, 0, 0);
    }
  };

  const handleDragEnd = (e) => {
    console.log('Drag ended');
    
    // Reset visual feedback
    e.target.style.opacity = '1';
    
    // Reset drag state
    setDraggedItem(null);
    setIsDragging(false);
    setDragOverTarget(null);
    dragCounter.current = 0;
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnter = (e, targetType, targetId) => {
    e.preventDefault();
    dragCounter.current++;
    
    if (draggedItem) {
      setDragOverTarget({ type: targetType, id: targetId });
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    dragCounter.current--;
    
    if (dragCounter.current === 0) {
      setDragOverTarget(null);
    }
  };

  const handleDrop = async (e, targetType, targetData = {}) => {
    e.preventDefault();
    dragCounter.current = 0;
    setDragOverTarget(null);
    
    if (!draggedItem) return;
    
    console.log('Drop event:', { draggedItem, targetType, targetData });
    
    try {
      setUiLoading(true);
      
      switch (draggedItem.dragType) {
        case 'staff':
          await handleStaffDrop(draggedItem, targetType, targetData);
          break;
        case 'deployment':
          await handleDeploymentDrop(draggedItem, targetType, targetData);
          break;
        case 'position':
          await handlePositionDrop(draggedItem, targetType, targetData);
          break;
        default:
          console.warn('Unknown drag type:', draggedItem.dragType);
      }
      
      setUiError('');
    } catch (error) {
      console.error('Drop error:', error);
      setUiError(error.message || 'Failed to process drop action');
    } finally {
      setUiLoading(false);
      setDraggedItem(null);
      setIsDragging(false);
    }
  };

  // Specific drop handlers
  const handleStaffDrop = async (staffItem, targetType, targetData) => {
    if (targetType === 'timeSlot') {
      // Create new deployment
      const deploymentData = {
        date: selectedDate,
        staff_id: staffItem.id,
        start_time: targetData.startTime || '09:00',
        end_time: targetData.endTime || '17:00',
        position: targetData.position || '',
        secondary: '',
        area: '',
        closing: '',
        break_minutes: 0,
        shift_type: targetData.shiftType || 'Day Shift'
      };
      
      await addDeployment(deploymentData);
    }
  };

  const handleDeploymentDrop = async (deploymentItem, targetType, targetData) => {
    if (targetType === 'shiftType') {
      // Move deployment to different shift
      await updateDeployment(deploymentItem.id, {
        shift_type: targetData.shiftType
      });
    } else if (targetType === 'timeSlot') {
      // Update deployment time
      await updateDeployment(deploymentItem.id, {
        start_time: targetData.startTime,
        end_time: targetData.endTime
      });
    }
  };

  const handlePositionDrop = async (positionItem, targetType, targetData) => {
    if (targetType === 'deployment') {
      // Update deployment position
      await updateDeployment(targetData.deploymentId, {
        position: positionItem.name
      });
    }
  };

  // Touch event handlers for mobile support
  const handleTouchStart = (e, item, type) => {
    if (!touchDevice) return;
    
    const touch = e.touches[0];
    // Create clean serializable drag data to avoid circular references
    const dragData = {
      id: item.id,
      name: item.name,
      is_under_18: item.is_under_18,
      startTime: item.startTime,
      endTime: item.endTime,
      type: item.type,
      area_id: item.area_id,
      dragType: type
    };
    
    setDraggedItem(dragData);
    setIsDragging(true);
    
    // Store initial touch position
    dragData.initialX = touch.clientX;
    dragData.initialY = touch.clientY;
  };

  const handleTouchMove = (e) => {
    if (!touchDevice || !draggedItem) return;
    
    e.preventDefault();
    const touch = e.touches[0];
    
    // Find element under touch point
    const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
    const dropZone = elementBelow?.closest('[data-drop-zone]');
    
    if (dropZone) {
      const targetType = dropZone.dataset.dropZone;
      const targetId = dropZone.dataset.dropId;
      setDragOverTarget({ type: targetType, id: targetId });
    } else {
      setDragOverTarget(null);
    }
  };

  const handleTouchEnd = async (e) => {
    if (!touchDevice || !draggedItem) return;
    
    const touch = e.changedTouches[0];
    const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
    const dropZone = elementBelow?.closest('[data-drop-zone]');
    
    if (dropZone) {
      const targetType = dropZone.dataset.dropZone;
      const targetData = JSON.parse(dropZone.dataset.dropData || '{}');
      
      // Create a synthetic event object without circular references
      const syntheticEvent = {
        preventDefault: () => {},
        stopPropagation: () => {}
      };
      
      await handleDrop(syntheticEvent, targetType, targetData);
    }
    
    setDraggedItem(null);
    setIsDragging(false);
    setDragOverTarget(null);
  };

  // Utility functions
  const calculateWorkHours = (startTime, endTime) => {
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    
    let start = startHour + startMin / 60;
    let end = endHour + endMin / 60;
    
    if (end < start) {
      end += 24;
    }
    
    return end - start;
  };

  const calculateBreakTime = (staffMember, workHours) => {
    if (staffMember?.is_under_18) {
      return workHours >= 4.5 ? 30 : 0;
    }
    
    if (workHours >= 6) return 30;
    if (workHours >= 4.5) return 15;
    return 0;
  };

  // Template shift management
  const handleAddTemplateShift = async () => {
    if (newTemplateShift.name && newTemplateShift.startTime && newTemplateShift.endTime) {
      try {
        setUiLoading(true);
        await addTemplateShift(newTemplateShift);
        setNewTemplateShift({ name: '', startTime: '', endTime: '', type: 'Day Shift' });
        setUiError('');
      } catch (error) {
        setUiError(error.message || 'Failed to add template shift');
      } finally {
        setUiLoading(false);
      }
    }
  };

  const handleRemoveTemplateShift = async (id) => {
    try {
      setUiLoading(true);
      await removeTemplateShift(id);
      setUiError('');
    } catch (error) {
      setUiError(error.message || 'Failed to remove template shift');
    } finally {
      setUiLoading(false);
    }
  };
  const formatDate = (dateString) => {
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('en-GB', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Form handlers
  const handleAddStaff = async () => {
    if (!newStaff.name.trim()) {
      setUiError('Staff name is required');
      return;
    }

    try {
      setUiLoading(true);
      await addSupabaseStaff(newStaff);
      setNewStaff({ name: '', is_under_18: false });
      setUiError('');
    } catch (error) {
      setUiError(error.message || 'Failed to add staff member');
    } finally {
      setUiLoading(false);
    }
  };

  const handleAddDeployment = async () => {
    if (!newDeployment.staff_id || !newDeployment.start_time || !newDeployment.end_time || !newDeployment.position) {
      setUiError('Please fill in all required fields');
      return;
    }

    try {
      setUiLoading(true);
      
      const staffMember = supabaseStaff.find(s => s.id === newDeployment.staff_id);
      const workHours = calculateWorkHours(newDeployment.start_time, newDeployment.end_time);
      const breakTime = calculateBreakTime(staffMember, workHours);
      
      const deploymentData = {
        ...newDeployment,
        date: selectedDate,
        break_minutes: breakTime
      };
      
      await addDeployment(deploymentData);
      
      setNewDeployment({
        staff_id: '',
        start_time: '',
        end_time: '',
        position: '',
        secondary: '',
        area: '',
        closing: '',
        shift_type: 'Day Shift'
      });
      setUiError('');
    } catch (error) {
      setUiError(error.message || 'Failed to add deployment');
    } finally {
      setUiLoading(false);
    }
  };

  const handleUpdateShiftInfo = async (field, value) => {
    try {
      const updatedInfo = {
        ...currentShiftInfo,
        [field]: value
      };
      await updateShiftInfo(selectedDate, updatedInfo);
    } catch (error) {
      setUiError(error.message || 'Failed to update shift information');
    }
  };

  const handleDuplicateDeployments = async () => {
    if (!duplicateFromDate) {
      setUiError('Please select a date to copy from');
      return;
    }

    try {
      setUiLoading(true);
      await duplicateDeployments(duplicateFromDate, selectedDate);
      setShowDuplicateModal(false);
      setDuplicateFromDate('');
      setUiError('');
    } catch (error) {
      setUiError(error.message || 'Failed to duplicate deployments');
    } finally {
      setUiLoading(false);
    }
  };

  const handleExportPDF = (exportType = 'all') => {
    try {
      // Filter deployments based on export type
      let deploymentsToExport = currentDeployments;
      if (exportType === 'day') {
        deploymentsToExport = currentDeployments.filter(d => d.shift_type === 'Day Shift' || d.shift_type === 'Both Shifts');
      } else if (exportType === 'night') {
        deploymentsToExport = currentDeployments.filter(d => d.shift_type === 'Night Shift' || d.shift_type === 'Both Shifts');
      }

      import('../utils/enhancedPdfExport').then(({ exportEnhancedPDF }) => {
        exportEnhancedPDF(deploymentsToExport, currentShiftInfo, selectedDate, supabaseTargets, exportType);
      });
    } catch (error) {
      setUiError('Failed to export PDF: ' + error.message);
    }
  };

  const handleExportExcel = () => {
    try {
      import('../utils/enhancedExcelExport').then(({ exportEnhancedExcel }) => {
        exportEnhancedExcel(currentDeployments, currentShiftInfo, selectedDate, supabaseTargets);
      });
    } catch (error) {
      setUiError('Failed to export Excel: ' + error.message);
    }
  };

  const handleExportExcelByShift = (shiftType) => {
    try {
      const filteredDeployments = currentDeployments.filter(d => d.shift_type === shiftType);
      import('../utils/enhancedExcelExport').then(({ exportEnhancedExcel }) => {
        exportEnhancedExcel(filteredDeployments, currentShiftInfo, selectedDate, supabaseTargets);
      });
    } catch (error) {
      setUiError('Failed to export Excel: ' + error.message);
    }
  };

  const handleDeleteAllDeployments = async (date) => {
    try {
      setUiLoading(true);
      await deleteAllDeployments(date);
      setUiError('');
    } catch (error) {
      setUiError(error.message || 'Failed to delete deployments');
    } finally {
      setUiLoading(false);
    }
  };

  const handleRefreshData = async () => {
    try {
      setUiLoading(true);
      console.log('Manual refresh triggered for date:', selectedDate);
      await loadAllData();
      
      // Force multiple refresh cycles to ensure data synchronization
      for (let i = 0; i < 2; i++) {
        await new Promise(resolve => setTimeout(resolve, 300));
        await loadAllData();
      }
      
      setUiError('');
      console.log('Manual refresh completed');
    } catch (error) {
      setUiError(error.message || 'Failed to refresh data');
    } finally {
      setUiLoading(false);
    }
  };

  const handleResetTargets = async (defaultTargets) => {
    try {
      setUiLoading(true);
      
      // Remove all existing targets
      for (const target of supabaseTargets) {
        await removeTarget(target.id);
      }
      
      // Add default targets
      for (const defaultTarget of defaultTargets) {
        const targetData = {
          name: defaultTarget.name,
          value: defaultTarget.value,
          priority: defaultTarget.priority,
          is_active: defaultTarget.is_active
        };
        await addTarget(targetData);
      }
      
      setUiError('');
    } catch (error) {
      setUiError(error.message || 'Failed to reset targets');
    } finally {
      setUiLoading(false);
    }
  };

  const handleAddTarget = async () => {
    if (!newTarget.name.trim() || !newTarget.value.trim()) {
      setUiError('Target name and value are required');
      return;
    }

    try {
      setUiLoading(true);
      await addTarget(newTarget);
      setNewTarget({ name: '', value: '', priority: 1 });
      setUiError('');
    } catch (error) {
      setUiError(error.message || 'Failed to add target');
    } finally {
      setUiLoading(false);
    }
  };

  const handleAddPosition = async () => {
    if (!newPosition.name.trim()) {
      setUiError('Position name is required');
      return;
    }

    try {
      setUiLoading(true);
      await addPosition(newPosition);
      setNewPosition({ name: '', type: 'position', area_id: null, display_order: 0 });
      setUiError('');
    } catch (error) {
      setUiError(error.message || 'Failed to add position');
    } finally {
      setUiLoading(false);
    }
  };

  const handleRemovePosition = async (id) => {
    try {
      setUiLoading(true);
      await removePosition(id);
      setUiError('');
    } catch (error) {
      setUiError(error.message || 'Failed to remove position');
    } finally {
      setUiLoading(false);
    }
  };
  const handleResetTargetsFromPage = () => {
    const defaultTargets = defaultTargetsManager.getDefaultTargets();
    handleResetTargets(defaultTargets);
  };

  const isTargetsDefault = defaultTargetsManager.areTargetsDefault(supabaseTargets);
  const handleProtectionStatusChange = (status) => {
    setPageProtectionStatus(status);
  };

  const handleConsentGiven = (consents) => {
    console.log('User consent recorded:', consents);
    // Handle consent preferences
  };

  const handleUnlockRequest = (pageName) => {
    // This would typically require admin authorization
    // For now, we'll show a confirmation dialog
    if (window.confirm(`Are you sure you want to request unlock for ${pageName} page?`)) {
      console.log(`Unlock requested for ${pageName} page`);
      // In a real application, this would send a request to administrators
    }
  };

  // Loading state
  if (supabaseLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading deployment system...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (supabaseError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">System Error</h2>
          <p className="text-gray-600 mb-4">{supabaseError}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg"
          >
            Reload Application
          </button>
        </div>
      </div>
    );
  }

  const navigationGroups = {
    operations: {
      label: 'Operations',
      icon: Users,
      items: [
        { id: 'deployment', label: 'Deployments', icon: Users },
        { id: 'dragdrop', label: 'Drag & Drop', icon: DragDropIcon },
        { id: 'schedule', label: 'Upload Schedule', icon: Upload }
      ]
    },
    shift: {
      label: 'Shift Management',
      icon: Clock,
      items: [
        { id: 'checklists', label: 'Checklists', icon: CheckSquare },
        { id: 'handover', label: 'Handover Notes', icon: MessageSquare },
        { id: 'location', label: 'Location Board', icon: Navigation },
        { id: 'breaks', label: 'Break Scheduler', icon: Coffee }
      ]
    },
    analytics: {
      label: 'Analytics',
      icon: BarChart3,
      items: [
        { id: 'labor-calc', label: 'Labor Calculator', icon: Calculator },
        { id: 'performance', label: 'Performance', icon: BarChart3 },
        { id: 'sales', label: 'Sales Data', icon: TrendingUp }
      ]
    },
    training: {
      label: 'Training & Rules',
      icon: Award,
      items: [
        { id: 'training', label: 'Training & Ranking', icon: Award },
        { id: 'station-mapping', label: 'Station Mapping', icon: LinkIcon },
        { id: 'position-relationships', label: 'Position Relationships', icon: MapPin },
        { id: 'rule-management', label: 'Rule Management', icon: Shield },
        { id: 'auto-rules', label: 'Auto-Assignment', icon: Settings }
      ]
    },
    admin: {
      label: 'Admin',
      icon: Settings,
      items: [
        { id: 'settings', label: 'Settings', icon: Settings },
        { id: 'targets', label: 'Targets', icon: Target },
        { id: 'protection', label: 'Data Protection', icon: Shield }
      ]
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
              >
                <Menu className="w-6 h-6" />
              </button>
              <h1 className="text-xl md:text-2xl font-bold text-gray-900 flex items-center gap-2">
                <DragDropIcon className="w-6 h-6 md:w-8 md:h-8 text-red-600" />
                <span className="hidden sm:inline">KFC Deployment</span>
              </h1>
              {isDragging && (
                <div className="hidden md:block bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium animate-pulse">
                  Drag Mode
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Desktop Navigation */}
              <nav className="hidden lg:flex items-center gap-1">
                {Object.entries(navigationGroups).map(([key, group]) => (
                  <div key={key} className="relative">
                    <button
                      onClick={() => setOpenDropdown(openDropdown === key ? null : key)}
                      className={`px-3 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                        group.items.some(item => item.id === currentPage)
                          ? 'bg-red-100 text-red-700 font-medium'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                      }`}
                    >
                      <group.icon className="w-4 h-4" />
                      <span className="text-sm">{group.label}</span>
                      <ChevronDown className="w-3 h-3" />
                    </button>
                    {openDropdown === key && (
                      <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-lg border min-w-[200px] py-1 z-50">
                        {group.items.map(item => (
                          <button
                            key={item.id}
                            onClick={() => {
                              setCurrentPage(item.id);
                              setOpenDropdown(null);
                            }}
                            className={`w-full px-4 py-2 text-left flex items-center gap-2 transition-colors ${
                              currentPage === item.id
                                ? 'bg-red-50 text-red-700'
                                : 'text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            <item.icon className="w-4 h-4" />
                            <span className="text-sm">{item.label}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </nav>

              <button
                onClick={handleLogout}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 hover:text-gray-900"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black bg-opacity-50" onClick={() => setMobileMenuOpen(false)}>
          <div className="absolute left-0 top-0 bottom-0 w-80 bg-white shadow-xl overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="font-bold text-lg">Menu</h2>
              <button onClick={() => setMobileMenuOpen(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-2">
              {Object.entries(navigationGroups).map(([key, group]) => (
                <div key={key} className="mb-4">
                  <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase flex items-center gap-2">
                    <group.icon className="w-4 h-4" />
                    {group.label}
                  </div>
                  {group.items.map(item => (
                    <button
                      key={item.id}
                      onClick={() => {
                        setCurrentPage(item.id);
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full px-4 py-3 text-left flex items-center gap-3 transition-colors rounded-lg ${
                        currentPage === item.id
                          ? 'bg-red-100 text-red-700 font-medium'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <item.icon className="w-5 h-5" />
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {uiError && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <span className="text-red-800">{uiError}</span>
            </div>
            <button
              onClick={() => setUiError('')}
              className="text-red-600 hover:text-red-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {currentPage === 'deployment' && (
          <DeploymentPage
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            currentDeployments={currentDeployments}
            currentShiftInfo={currentShiftInfo}
            supabaseStaff={supabaseStaff}
            supabaseTargets={supabaseTargets}
            supabasePositions={supabasePositions}
            newDeployment={newDeployment}
            setNewDeployment={setNewDeployment}
            uiLoading={uiLoading}
            draggedItem={draggedItem}
            dragOverTarget={dragOverTarget}
            isDragging={isDragging}
            touchDevice={touchDevice}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragOver={handleDragOver}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onAddDeployment={handleAddDeployment}
            onUpdateDeployment={updateDeployment}
            onRemoveDeployment={removeDeployment}
            onUpdateShiftInfo={handleUpdateShiftInfo}
            onDuplicateDeployments={handleDuplicateDeployments}
            onExportPDF={handleExportPDF}
            onExportAllExcel={handleExportExcel}
            onExportShiftExcel={handleExportExcelByShift}
            formatDate={formatDate}
            calculateWorkHours={calculateWorkHours}
            calculateBreakTime={calculateBreakTime}
            showDuplicateModal={showDuplicateModal}
            setShowDuplicateModal={setShowDuplicateModal}
            duplicateFromDate={duplicateFromDate}
            setDuplicateFromDate={setDuplicateFromDate}
            onDeleteAllDeployments={handleDeleteAllDeployments}
            onRefreshData={handleRefreshData}
          />
        )}
        
        {currentPage === 'dragdrop' && (
          <DragDropDeployment
            onBack={() => setCurrentPage('deployment')}
            templateShifts={templateShifts}
            uiLoading={uiLoading}
            setUiLoading={setUiLoading}
          />
        )}

        {currentPage === 'schedule' && (
          <ScheduleUploader />
        )}

        {currentPage === 'checklists' && (
          <ChecklistsPage />
        )}

        {currentPage === 'handover' && (
          <HandoverNotesPage />
        )}

        {currentPage === 'location' && (
          <StaffLocationPage />
        )}

        {currentPage === 'breaks' && (
          <BreakSchedulerPage />
        )}

        {currentPage === 'labor-calc' && (
          <LaborSalesCalculatorPage />
        )}

        {currentPage === 'performance' && (
          <PerformanceScorecardPage />
        )}

        {currentPage === 'training' && (
          <Training embedded={true} />
        )}

        {currentPage === 'station-mapping' && (
          <StationPositionMappingPage />
        )}

        {currentPage === 'position-relationships' && (
          <PositionRelationshipsManager />
        )}

        {currentPage === 'rule-management' && (
          <RuleManagementPage />
        )}

        {currentPage === 'auto-rules' && (
          <AutoAssignmentRulesPage />
        )}

        {currentPage === 'sales' && (
          <SalesPage
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            salesRecordsByDate={salesRecordsByDate}
            onUpdateSalesRecords={updateSalesRecords}
            formatDate={formatDate}
            onDataRefresh={handleRefreshData}
          />
        )}
        
        {currentPage === 'targets' && (
          <TargetSettingsPage
            supabaseTargets={supabaseTargets}
            newTarget={newTarget}
            setNewTarget={setNewTarget}
            uiLoading={uiLoading}
            onAddTarget={handleAddTarget}
            onUpdateTarget={updateTarget}
            onRemoveTarget={removeTarget}
            onBack={() => setCurrentPage('settings')}
            onResetTargets={handleResetTargetsFromPage}
            isTargetsDefault={isTargetsDefault}
          />
        )}
        
        {currentPage === 'settings' && (
          // PAGE PROTECTION SETTING: Wrap protected pages with ProtectedPageWrapper
          <ProtectedPageWrapper
            pageName="settings"
            isLocked={pageProtectionStatus.settingsLocked}
            lockInfo={accessControl.getLockInfo('settings')}
            onUnlockRequest={handleUnlockRequest}
          >
            <SettingsPage
              supabaseStaff={supabaseStaff}
              supabasePositions={supabasePositions}
              templateShifts={templateShifts}
              newStaff={newStaff}
              setNewStaff={setNewStaff}
              newPosition={newPosition}
              setNewPosition={setNewPosition}
              newTemplateShift={newTemplateShift}
              setNewTemplateShift={setNewTemplateShift}
              uiLoading={uiLoading}
              onAddStaff={handleAddStaff}
              onRemoveStaff={removeStaff}
              onAddPosition={handleAddPosition}
              onRemovePosition={handleRemovePosition}
              onAddTemplateShift={handleAddTemplateShift}
              onRemoveTemplateShift={handleRemoveTemplateShift}
              onNavigateToTargets={() => setCurrentPage('targets')}
              onStaffDataChange={loadAllData}
            />
          </ProtectedPageWrapper>
        )}
        
        {currentPage === 'protection' && (
          <PasswordProtectedDataProtection
            salesRecordsByDate={salesRecordsByDate}
            staff={supabaseStaff}
            positions={supabasePositions}
            targets={supabaseTargets}
            templateShifts={templateShifts}
            onProtectionStatusChange={handleProtectionStatusChange}
            onResetTargets={handleResetTargets}
          />
        )}
        
        {currentPage === 'privacy' && (
          <GDPRPrivacyCenter
            currentUser={currentUser}
            onClose={() => setCurrentPage('deployment')}
          />
        )}
      </div>
      
      {/* GDPR Privacy Center Modal */}
      {showPrivacyCenter && (
        <GDPRPrivacyCenter
          currentUser={currentUser}
          onClose={() => setShowPrivacyCenter(false)}
        />
      )}
      
      {/* GDPR Consent Banner */}
      <GDPRConsentBanner
        currentUser={currentUser}
        onConsentGiven={handleConsentGiven}
      />
    </div>
  );
};

export default DeploymentManagementSystem;