import React, { useState } from 'react';
import { Trash2, AlertTriangle, CheckCircle, Calendar, CalendarRange, X } from 'lucide-react';
import { supabase } from '../lib/supabase';

/**
 * DeleteImportedShifts Component
 * Provides functionality to delete imported shifts with two options:
 * 1. Delete Day - Remove shifts for a specific date
 * 2. Delete Week - Remove all shifts for a week date range
 */
export default function DeleteImportedShifts({ onDeleteComplete }) {
  const [showDialog, setShowDialog] = useState(false);
  const [deleteMode, setDeleteMode] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const openDialog = (mode) => {
    setDeleteMode(mode);
    setShowDialog(true);
    setError(null);
    setSuccess(null);

    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;

    if (mode === 'day') {
      setSelectedDate(todayStr);
    } else {
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay() + 1);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);

      const formatDate = (date) => {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
      };

      setDateRange({
        start: formatDate(startOfWeek),
        end: formatDate(endOfWeek)
      });
    }
  };

  const closeDialog = () => {
    setShowDialog(false);
    setDeleteMode(null);
    setSelectedDate('');
    setDateRange({ start: '', end: '' });
    setError(null);
    setSuccess(null);
  };

  const handleDeleteDay = async () => {
    if (!selectedDate) {
      setError('Please select a date');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data: schedulesToDelete, error: fetchError } = await supabase
        .from('schedule_shifts')
        .select('id, schedule_id')
        .eq('shift_date', selectedDate);

      if (fetchError) throw fetchError;

      if (!schedulesToDelete || schedulesToDelete.length === 0) {
        setError('No shifts found for this date');
        setLoading(false);
        return;
      }

      const shiftIds = schedulesToDelete.map(s => s.id);
      const scheduleIds = [...new Set(schedulesToDelete.map(s => s.schedule_id))];

      const { error: deleteError } = await supabase
        .from('schedule_shifts')
        .delete()
        .in('id', shiftIds);

      if (deleteError) throw deleteError;

      for (const scheduleId of scheduleIds) {
        const { data: remainingShifts } = await supabase
          .from('schedule_shifts')
          .select('id', { count: 'exact', head: true })
          .eq('schedule_id', scheduleId);

        if (!remainingShifts || remainingShifts.length === 0) {
          await supabase
            .from('schedule_employees')
            .delete()
            .eq('schedule_id', scheduleId);

          await supabase
            .from('shift_schedules')
            .delete()
            .eq('id', scheduleId);
        }
      }

      const { error: deploymentDeleteError } = await supabase
        .from('deployments')
        .delete()
        .eq('date', selectedDate);

      if (deploymentDeleteError) {
        console.warn('Some deployments could not be deleted:', deploymentDeleteError);
      }

      setSuccess(`Successfully deleted ${shiftIds.length} shift(s) for ${selectedDate}`);

      setTimeout(() => {
        if (onDeleteComplete) {
          onDeleteComplete();
        }
        closeDialog();
      }, 2000);

    } catch (err) {
      console.error('Error deleting day shifts:', err);
      setError(err.message || 'Failed to delete shifts');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteWeek = async () => {
    if (!dateRange.start || !dateRange.end) {
      setError('Please select start and end dates');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data: schedulesToDelete, error: fetchError } = await supabase
        .from('schedule_shifts')
        .select('id, schedule_id, shift_date')
        .gte('shift_date', dateRange.start)
        .lte('shift_date', dateRange.end);

      if (fetchError) throw fetchError;

      if (!schedulesToDelete || schedulesToDelete.length === 0) {
        setError('No shifts found in this date range');
        setLoading(false);
        return;
      }

      const shiftIds = schedulesToDelete.map(s => s.id);
      const scheduleIds = [...new Set(schedulesToDelete.map(s => s.schedule_id))];

      const { error: deleteError } = await supabase
        .from('schedule_shifts')
        .delete()
        .in('id', shiftIds);

      if (deleteError) throw deleteError;

      for (const scheduleId of scheduleIds) {
        const { data: remainingShifts } = await supabase
          .from('schedule_shifts')
          .select('id', { count: 'exact', head: true })
          .eq('schedule_id', scheduleId);

        if (!remainingShifts || remainingShifts.length === 0) {
          await supabase
            .from('schedule_employees')
            .delete()
            .eq('schedule_id', scheduleId);

          await supabase
            .from('shift_schedules')
            .delete()
            .eq('id', scheduleId);
        }
      }

      const { error: deploymentDeleteError } = await supabase
        .from('deployments')
        .delete()
        .gte('date', dateRange.start)
        .lte('date', dateRange.end);

      if (deploymentDeleteError) {
        console.warn('Some deployments could not be deleted:', deploymentDeleteError);
      }

      setSuccess(`Successfully deleted ${shiftIds.length} shift(s) from ${dateRange.start} to ${dateRange.end}`);

      setTimeout(() => {
        if (onDeleteComplete) {
          onDeleteComplete();
        }
        closeDialog();
      }, 2000);

    } catch (err) {
      console.error('Error deleting week shifts:', err);
      setError(err.message || 'Failed to delete shifts');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="flex gap-2">
        <button
          onClick={() => openDialog('day')}
          className="flex items-center gap-2 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 font-medium rounded-lg transition-colors"
          title="Delete shifts for a specific day"
        >
          <Calendar className="w-4 h-4" />
          Delete Day
        </button>

        <button
          onClick={() => openDialog('week')}
          className="flex items-center gap-2 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 font-medium rounded-lg transition-colors"
          title="Delete shifts for a week range"
        >
          <CalendarRange className="w-4 h-4" />
          Delete Week
        </button>
      </div>

      {showDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <h3 className="text-lg font-semibold text-gray-900">
                  {deleteMode === 'day' ? 'Delete Day Shifts' : 'Delete Week Shifts'}
                </h3>
              </div>
              <button
                onClick={closeDialog}
                className="text-gray-400 hover:text-gray-600 transition"
                disabled={loading}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-red-800">
                  <strong>Warning:</strong> This action will permanently delete all imported shifts and related deployments for the selected {deleteMode === 'day' ? 'date' : 'date range'}. This cannot be undone.
                </p>
              </div>

              {deleteMode === 'day' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Date
                  </label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    disabled={loading}
                  />
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={dateRange.start}
                      onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      disabled={loading}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={dateRange.end}
                      onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      disabled={loading}
                    />
                  </div>
                </div>
              )}

              {error && (
                <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              {success && (
                <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-3 flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <p className="text-sm text-green-800">{success}</p>
                </div>
              )}
            </div>

            <div className="flex gap-2 p-4 border-t bg-gray-50">
              <button
                onClick={closeDialog}
                className="flex-1 px-4 py-2 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={deleteMode === 'day' ? handleDeleteDay : handleDeleteWeek}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition flex items-center justify-center gap-2 disabled:bg-gray-400"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
