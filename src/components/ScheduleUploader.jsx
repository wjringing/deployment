import React, { useState } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle, Users, Calendar } from 'lucide-react';
import { extractTextFromPDF } from '../utils/pdfProcessor';
import { parseShiftSchedule, classifyShift } from '../utils/scheduleParser';
import { supabase } from '../lib/supabase';
import { autoAssignScheduleToDeployments, matchScheduleEmployeesToStaff } from '../utils/autoDeploymentAssignment';
import ShiftScheduleViewer from './ShiftScheduleViewer';

export default function ScheduleUploader() {
  const [schedule, setSchedule] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [autoAssignResults, setAutoAssignResults] = useState(null);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setError('Please upload a PDF file');
      return;
    }

    setLoading(true);
    setError(null);
    setUploadStatus('Extracting PDF text...');

    try {
      const pdfText = await extractTextFromPDF(file);

      setUploadStatus('Parsing schedule data...');
      const parsedSchedule = parseShiftSchedule(pdfText);

      if (!parsedSchedule.employees || parsedSchedule.employees.length === 0) {
        throw new Error('No schedule data found in PDF');
      }

      setUploadStatus('Saving to database...');
      await saveScheduleToDatabase(parsedSchedule);

      setSchedule(parsedSchedule);
      setUploadStatus(null);
    } catch (err) {
      console.error('Error processing PDF:', err);
      setError(err.message || 'Failed to process PDF. Please ensure it is a TeamLive schedule.');
      setUploadStatus(null);
    } finally {
      setLoading(false);
    }
  };

  const saveScheduleToDatabase = async (parsedSchedule) => {
    try {
      const weekDates = Object.values(parsedSchedule.week);
      const minDay = Math.min(...weekDates);
      const maxDay = Math.max(...weekDates);

      // Get current date to determine year and month
      const now = new Date();
      let year = now.getFullYear();
      let month = now.getMonth();

      // If we're in December and the schedule shows days 1-7, it's likely next year January
      if (month === 11 && minDay < 7) {
        year++;
        month = 0;
      }
      // If we're in January and the schedule shows days > 25, it's likely last year December
      else if (month === 0 && maxDay > 25) {
        year--;
        month = 11;
      }

      // Format dates as YYYY-MM-DD in local timezone
      const formatLocalDate = (day) => {
        const date = new Date(year, month, day);
        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
      };

      const weekStartDate = formatLocalDate(minDay);
      const weekEndDate = formatLocalDate(maxDay);

      const { data: scheduleRecord, error: scheduleError } = await supabase
        .from('shift_schedules')
        .insert({
          location: parsedSchedule.location || 'KFC',
          week_start_date: weekStartDate,
          week_end_date: weekEndDate,
          uploaded_at: new Date().toISOString(),
          raw_data: parsedSchedule
        })
        .select()
        .single();

      if (scheduleError) throw scheduleError;

      for (const employee of parsedSchedule.employees) {
        const { data: employeeRecord, error: employeeError } = await supabase
          .from('schedule_employees')
          .insert({
            schedule_id: scheduleRecord.id,
            name: employee.name,
            role: employee.role
          })
          .select()
          .single();

        if (employeeError) throw employeeError;

        for (const shift of employee.shifts) {
          const shiftDate = formatLocalDate(parsedSchedule.week[shift.day]);
          const classification = classifyShift(shift.start, shift.end);

          await supabase
            .from('schedule_shifts')
            .insert({
              schedule_id: scheduleRecord.id,
              schedule_employee_id: employeeRecord.id,
              shift_date: shiftDate,
              day_of_week: shift.day,
              start_time: shift.start,
              end_time: shift.end,
              shift_classification: classification
            });
        }
      }

      setUploadStatus('Matching employees to staff...');
      const matches = await matchScheduleEmployeesToStaff(scheduleRecord.id);

      setUploadStatus('Auto-assigning to deployments...');
      const assignResults = await autoAssignScheduleToDeployments(
        scheduleRecord.id,
        weekStartDate.toISOString().split('T')[0]
      );

      setAutoAssignResults({
        matches,
        assignments: assignResults
      });

    } catch (error) {
      console.error('Error saving to database:', error);
      throw new Error('Failed to save schedule to database');
    }
  };

  const handleReset = () => {
    setSchedule(null);
    setError(null);
    setAutoAssignResults(null);
  };

  if (schedule) {
    return (
      <div>
        <div className="bg-white shadow-sm border-b p-4 mb-4">
          <button
            onClick={handleReset}
            className="text-red-600 hover:text-red-700 font-medium transition"
          >
            ← Upload New Schedule
          </button>
        </div>

        {autoAssignResults && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4 mx-4">
            <div className="flex items-start gap-2">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-green-800 font-medium">Schedule Uploaded Successfully</p>
                <div className="mt-2 text-sm text-green-700">
                  <p>Matched {autoAssignResults.matches.length} employees to staff records</p>
                  <p>Auto-assigned {autoAssignResults.assignments.success.length} shifts to deployments</p>
                  {autoAssignResults.assignments.skipped.length > 0 && (
                    <p className="text-yellow-700">Skipped {autoAssignResults.assignments.skipped.length} shifts (no staff match)</p>
                  )}
                  {autoAssignResults.assignments.failed.length > 0 && (
                    <p className="text-red-700">Failed {autoAssignResults.assignments.failed.length} shifts</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <ShiftScheduleViewer scheduleData={schedule} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <FileText className="w-16 h-16 mx-auto text-red-600 mb-4" />
          <h1 className="text-2xl font-bold text-gray-900">
            Upload Schedule PDF
          </h1>
          <p className="text-gray-600 mt-2">
            Upload your TeamLive schedule PDF to automatically populate deployments
          </p>
        </div>

        <label className="block">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-red-500 transition cursor-pointer">
            <Upload className="w-12 h-12 mx-auto text-gray-400 mb-3" />
            <span className="text-gray-700 font-medium block">
              Click to upload or drag and drop
            </span>
            <span className="text-sm text-gray-500 mt-1 block">
              PDF files only
            </span>
          </div>
          <input
            type="file"
            accept=".pdf"
            onChange={handleFileUpload}
            disabled={loading}
            className="hidden"
          />
        </label>

        {loading && (
          <div className="mt-4 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-red-600 border-t-transparent"></div>
            <p className="text-gray-600 mt-2">{uploadStatus || 'Processing PDF...'}</p>
          </div>
        )}

        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-red-800 text-sm font-medium">Error</p>
                <p className="text-red-700 text-sm mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h3 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Auto-Assignment Rules
          </h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>Day Shift: end time ≤ 18:00</li>
            <li>Night Shift: start &gt; 15:00 AND end &gt; 22:00</li>
            <li>Both Shifts: start &lt; 15:00 AND 18:01 ≤ end ≤ 22:00</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
