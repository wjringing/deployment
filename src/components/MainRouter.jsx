import React, { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Spin } from 'antd';
import DragDropDeployment from './DragDropDeployment';
import DeploymentPage from './DeploymentPage';
import SettingsPage from './SettingsPage';
import TargetSettingsPage from './TargetSettingsPage';
import SalesPage from './SalesPage';
import ScheduleUploader from './ScheduleUploader';
import Training from '../pages/Training';
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
import TrainingDevelopmentPage from './TrainingDevelopmentPage';
import FixedClosingPositionsPage from './FixedClosingPositionsPage';
import { useSupabaseData } from '../hooks/useSupabaseData';

const MainRouter = () => {
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });

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

  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicateFromDate, setDuplicateFromDate] = useState('');

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

  const currentDeployments = deploymentsByDate[selectedDate] || [];
  const currentShiftInfo = shiftInfoByDate[selectedDate] || {
    forecast: '£0.00',
    day_shift_forecast: '£0.00',
    night_shift_forecast: '£0.00',
    weather: '',
    notes: ''
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const calculateWorkHours = (startTime, endTime) => {
    if (!startTime || !endTime) return '0:00';
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    let hours = endHour - startHour;
    let minutes = endMin - startMin;
    if (minutes < 0) {
      hours -= 1;
      minutes += 60;
    }
    return `${hours}:${String(minutes).padStart(2, '0')}`;
  };

  const calculateBreakTime = (startTime, endTime) => {
    const workHours = calculateWorkHours(startTime, endTime);
    const [hours] = workHours.split(':').map(Number);
    if (hours >= 6) return '00:30';
    return '00:00';
  };

  if (supabaseLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spin size="large" tip="Loading..." />
      </div>
    );
  }

  if (supabaseError) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center max-w-md bg-white rounded-lg shadow-lg p-8 border-2 border-red-200">
          <div className="bg-red-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-red-600 text-3xl">⚠</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">System Error</h2>
          <p className="text-gray-600 mb-6">{supabaseError}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            Reload Application
          </button>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route index element={<Navigate to="/deployment" replace />} />
      <Route
        path="/deployment"
        element={
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
            showDuplicateModal={showDuplicateModal}
            setShowDuplicateModal={setShowDuplicateModal}
            duplicateFromDate={duplicateFromDate}
            setDuplicateFromDate={setDuplicateFromDate}
            onAddDeployment={addDeployment}
            onRemoveDeployment={removeDeployment}
            onUpdateDeployment={updateDeployment}
            onUpdateShiftInfo={updateShiftInfo}
            onDuplicateDeployments={duplicateDeployments}
            onDeleteAllDeployments={deleteAllDeployments}
            onRefreshData={loadAllData}
            formatDate={formatDate}
            calculateWorkHours={calculateWorkHours}
            calculateBreakTime={calculateBreakTime}
          />
        }
      />
      <Route
        path="/dragdrop"
        element={
          <DragDropDeployment
            staff={supabaseStaff}
            positions={supabasePositions}
            deployments={deploymentsByDate}
            onAddDeployment={addDeployment}
            onRemoveDeployment={removeDeployment}
            onUpdateDeployment={updateDeployment}
          />
        }
      />
      <Route
        path="/settings"
        element={
          <SettingsPage
            supabaseStaff={supabaseStaff}
            supabasePositions={supabasePositions}
            templateShifts={templateShifts}
            onAddStaff={addSupabaseStaff}
            onRemoveStaff={removeStaff}
            onAddPosition={addPosition}
            onRemovePosition={removePosition}
            onUpdatePosition={updatePosition}
            onAddTemplateShift={addTemplateShift}
            onRemoveTemplateShift={removeTemplateShift}
            onStaffDataChange={loadAllData}
          />
        }
      />
      <Route
        path="/targets"
        element={
          <TargetSettingsPage
            targets={supabaseTargets}
            onAddTarget={addTarget}
            onUpdateTarget={updateTarget}
            onRemoveTarget={removeTarget}
          />
        }
      />
      <Route
        path="/sales"
        element={
          <SalesPage
            salesRecords={salesRecordsByDate}
            onUpdateSalesRecords={updateSalesRecords}
          />
        }
      />
      <Route path="/schedule-upload" element={<ScheduleUploader />} />
      <Route path="/checklists" element={<ChecklistsPage />} />
      <Route path="/handover" element={<HandoverNotesPage />} />
      <Route path="/staff" element={<StaffLocationPage />} />
      <Route path="/breaks" element={<BreakSchedulerPage />} />
      <Route path="/labor-sales" element={<LaborSalesCalculatorPage />} />
      <Route path="/performance" element={<PerformanceScorecardPage />} />
      <Route path="/training" element={<Training />} />
      <Route path="/stations" element={<StationPositionMappingPage />} />
      <Route path="/position-relationships" element={<PositionRelationshipsManager />} />
      <Route path="/training-development" element={<TrainingDevelopmentPage />} />
      <Route path="/fixed-closing" element={<FixedClosingPositionsPage />} />
      <Route path="/rules" element={<RuleManagementPage />} />
      <Route path="/auto-assignment" element={<AutoAssignmentRulesPage />} />
    </Routes>
  );
};

export default MainRouter;
