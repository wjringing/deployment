import React, { useState } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { parseSchedulePDF, convertTimeToMilitary, getDateForDayOfWeek } from '../utils/pdfScheduleParser';
import { classifyShift } from '../utils/shiftClassifier';

export default function ScheduleUploadPage({ onUploadComplete }) {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [parsedData, setParsedData] = useState(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (selectedFile) => {
    if (selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
      setUploadStatus(null);
      setParsedData(null);
    } else {
      setUploadStatus({ type: 'error', message: 'Please upload a PDF file' });
    }
  };

  const extractTextFromPDF = async (file) => {
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    const textDecoder = new TextDecoder('utf-8');
    let text = textDecoder.decode(uint8Array);

    text = text.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F-\x9F]/g, '');

    return text;
  };

  const processSchedule = async () => {
    if (!file) return;

    setProcessing(true);
    setUploadStatus({ type: 'info', message: 'Processing PDF...' });

    try {
      const pdfText = await extractTextFromPDF(file);
      const scheduleData = parseSchedulePDF(pdfText);

      if (!scheduleData.employees || scheduleData.employees.length === 0) {
        throw new Error('No employee data found in PDF. Please check the file format.');
      }

      setParsedData(scheduleData);
      setUploadStatus({
        type: 'success',
        message: `Successfully parsed ${scheduleData.employees.length} employees. Review the data before saving.`
      });

    } catch (error) {
      console.error('Processing error:', error);
      setUploadStatus({
        type: 'error',
        message: `Failed to process PDF: ${error.message}`
      });
    } finally {
      setProcessing(false);
    }
  };

  const saveToDatabase = async () => {
    if (!parsedData) return;

    setProcessing(true);
    setUploadStatus({ type: 'info', message: 'Saving to database...' });

    try {
      const { data: locationData } = await supabase
        .from('locations')
        .select('id')
        .eq('location_code', parsedData.locationCode)
        .maybeSingle();

      let locationId = locationData?.id;

      if (!locationId) {
        const { data: newLocation, error: locationError } = await supabase
          .from('locations')
          .insert([{
            name: parsedData.location,
            location_code: parsedData.locationCode,
            address: ''
          }])
          .select()
          .single();

        if (locationError) throw locationError;
        locationId = newLocation.id;
      }

      const uploadRecord = await supabase
        .from('schedule_uploads')
        .insert([{
          location_id: locationId,
          week_start_date: parsedData.weekStart.toISOString().split('T')[0],
          upload_filename: file.name,
          processing_status: 'processing',
          total_employees: parsedData.employees.length
        }])
        .select()
        .single();

      const employeeMap = new Map();
      const scheduleRecords = [];
      const deploymentRecords = [];

      for (const emp of parsedData.employees) {
        let employeeId = employeeMap.get(emp.name);

        if (!employeeId) {
          const { data: existingEmp } = await supabase
            .from('employees')
            .select('id')
            .eq('location_id', locationId)
            .eq('name', emp.name)
            .maybeSingle();

          if (existingEmp) {
            employeeId = existingEmp.id;
          } else {
            const { data: newEmp, error: empError } = await supabase
              .from('employees')
              .insert([{
                location_id: locationId,
                name: emp.name,
                role: emp.role
              }])
              .select()
              .single();

            if (empError) throw empError;
            employeeId = newEmp.id;
          }

          employeeMap.set(emp.name, employeeId);
        }

        for (const [day, shift] of Object.entries(emp.schedule)) {
          const scheduleDate = getDateForDayOfWeek(parsedData.weekStart, day);
          const startTime = convertTimeToMilitary(shift.startTime);
          const endTime = convertTimeToMilitary(shift.endTime);
          const isOvernight = endTime < startTime;
          const shiftType = classifyShift(startTime, endTime);

          scheduleRecords.push({
            employee_id: employeeId,
            location_id: locationId,
            week_start_date: parsedData.weekStart.toISOString().split('T')[0],
            schedule_date: scheduleDate,
            day_of_week: day,
            start_time: startTime,
            end_time: endTime,
            shift_classification: shiftType,
            is_overnight: isOvernight
          });

          deploymentRecords.push({
            location_id: locationId,
            employee_id: employeeId,
            deployment_date: scheduleDate,
            shift_type: shiftType,
            role: emp.role,
            start_time: startTime,
            end_time: endTime,
            week_start_date: parsedData.weekStart.toISOString().split('T')[0]
          });
        }
      }

      if (scheduleRecords.length > 0) {
        const { error: schedError } = await supabase
          .from('schedules')
          .insert(scheduleRecords);

        if (schedError) throw schedError;
      }

      if (deploymentRecords.length > 0) {
        const { error: deployError } = await supabase
          .from('shift_deployments')
          .insert(deploymentRecords);

        if (deployError) throw deployError;
      }

      await supabase
        .from('schedule_uploads')
        .update({
          processing_status: 'completed',
          total_shifts: scheduleRecords.length
        })
        .eq('id', uploadRecord.data.id);

      setUploadStatus({
        type: 'success',
        message: `Successfully processed ${parsedData.employees.length} employees with ${scheduleRecords.length} shifts!`
      });

      setTimeout(() => {
        if (onUploadComplete) {
          onUploadComplete();
        }
      }, 2000);

    } catch (error) {
      console.error('Database error:', error);
      setUploadStatus({
        type: 'error',
        message: `Failed to save to database: ${error.message}`
      });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Upload Staff Schedule</h1>
        <p className="text-gray-600">Upload your weekly PDF schedule to automatically generate shift deployments</p>
      </div>

      <div
        className={`relative border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
          dragActive
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          id="file-upload"
          accept=".pdf"
          onChange={handleChange}
          className="hidden"
        />

        <label
          htmlFor="file-upload"
          className="cursor-pointer flex flex-col items-center"
        >
          <Upload className="w-16 h-16 text-gray-400 mb-4" />
          <p className="text-xl font-medium text-gray-700 mb-2">
            {file ? file.name : 'Drop your PDF schedule here'}
          </p>
          <p className="text-sm text-gray-500">
            or click to browse files
          </p>
        </label>
      </div>

      {file && !parsedData && (
        <div className="mt-6">
          <button
            onClick={processSchedule}
            disabled={processing}
            className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {processing ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <FileText className="w-5 h-5" />
                Parse PDF Schedule
              </>
            )}
          </button>
        </div>
      )}

      {uploadStatus && (
        <div className={`mt-6 p-4 rounded-lg flex items-start gap-3 ${
          uploadStatus.type === 'success' ? 'bg-green-50 border border-green-200' :
          uploadStatus.type === 'error' ? 'bg-red-50 border border-red-200' :
          'bg-blue-50 border border-blue-200'
        }`}>
          {uploadStatus.type === 'success' && <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />}
          {uploadStatus.type === 'error' && <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />}
          {uploadStatus.type === 'info' && <Loader className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0 animate-spin" />}
          <p className={`text-sm ${
            uploadStatus.type === 'success' ? 'text-green-800' :
            uploadStatus.type === 'error' ? 'text-red-800' :
            'text-blue-800'
          }`}>
            {uploadStatus.message}
          </p>
        </div>
      )}

      {parsedData && (
        <div className="mt-6 bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Parsed Schedule Preview</h3>

          <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
            <div>
              <span className="font-medium text-gray-600">Location:</span>
              <span className="ml-2 text-gray-800">{parsedData.location}</span>
            </div>
            <div>
              <span className="font-medium text-gray-600">Week:</span>
              <span className="ml-2 text-gray-800">
                {parsedData.weekStart?.toLocaleDateString()} - {parsedData.weekEnd?.toLocaleDateString()}
              </span>
            </div>
            <div>
              <span className="font-medium text-gray-600">Total Employees:</span>
              <span className="ml-2 text-gray-800">{parsedData.employees.length}</span>
            </div>
            <div>
              <span className="font-medium text-gray-600">Total Shifts:</span>
              <span className="ml-2 text-gray-800">
                {parsedData.employees.reduce((sum, emp) => sum + Object.keys(emp.schedule).length, 0)}
              </span>
            </div>
          </div>

          <div className="max-h-60 overflow-y-auto border border-gray-200 rounded p-4 mb-4">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-2 font-medium text-gray-700">Employee</th>
                  <th className="text-left p-2 font-medium text-gray-700">Role</th>
                  <th className="text-center p-2 font-medium text-gray-700">Shifts</th>
                </tr>
              </thead>
              <tbody>
                {parsedData.employees.map((emp, idx) => (
                  <tr key={idx} className="border-t border-gray-100">
                    <td className="p-2 text-gray-800">{emp.name}</td>
                    <td className="p-2 text-gray-600">{emp.role}</td>
                    <td className="p-2 text-center text-gray-800">{Object.keys(emp.schedule).length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            onClick={saveToDatabase}
            disabled={processing}
            className="w-full bg-green-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {processing ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                Saving to Database...
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5" />
                Save Schedule to Database
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
