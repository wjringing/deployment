import React, { useState } from 'react';
import { Upload, Download, Users, AlertCircle, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import {
  downloadStaffCsvTemplate,
  parseCsvFile,
  validateStaffRecords,
  importStaffRecords,
  getStaffSummary
} from '../utils/staffCsvImporter';

export default function StaffCsvImporter({ onImportComplete }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [validationResults, setValidationResults] = useState(null);
  const [importResults, setImportResults] = useState(null);
  const [updateMode, setUpdateMode] = useState(false);
  const [error, setError] = useState(null);
  const [staffSummary, setStaffSummary] = useState(null);

  React.useEffect(() => {
    loadStaffSummary();
  }, []);

  const loadStaffSummary = async () => {
    const summary = await getStaffSummary();
    setStaffSummary(summary);
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      setError('Please select a CSV file');
      return;
    }

    setSelectedFile(file);
    setError(null);
    setValidationResults(null);
    setImportResults(null);

    setParsing(true);

    try {
      const { records, errors } = await parseCsvFile(file);

      if (errors.length > 0) {
        setError(errors.join('; '));
        setParsing(false);
        return;
      }

      const validation = await validateStaffRecords(records);
      setValidationResults(validation);
    } catch (err) {
      setError(err.message);
    } finally {
      setParsing(false);
    }
  };

  const handleImport = async () => {
    if (!validationResults || validationResults.valid.length === 0) {
      setError('No valid records to import');
      return;
    }

    setImporting(true);
    setError(null);

    try {
      const recordsToImport = updateMode
        ? [...validationResults.valid, ...validationResults.duplicates]
        : validationResults.valid;

      const results = await importStaffRecords(recordsToImport, {
        updateExisting: updateMode
      });

      setImportResults(results);

      if (results.success.length > 0 || results.updated.length > 0) {
        await loadStaffSummary();
        if (onImportComplete) {
          onImportComplete();
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setImporting(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setValidationResults(null);
    setImportResults(null);
    setError(null);
    setUpdateMode(false);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Users className="w-6 h-6 text-red-600" />
          <h2 className="text-2xl font-bold text-gray-800">Import Staff from CSV</h2>
        </div>
        <button
          onClick={downloadStaffCsvTemplate}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
        >
          <Download className="w-4 h-4" />
          Download Template
        </button>
      </div>

      {staffSummary && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-semibold text-gray-700 mb-2">Current Staff Database</h3>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Total Staff:</span>
              <span className="ml-2 font-bold text-blue-600">{staffSummary.total}</span>
            </div>
            <div>
              <span className="text-gray-600">Under 18:</span>
              <span className="ml-2 font-bold text-orange-600">{staffSummary.under18}</span>
            </div>
            <div>
              <span className="text-gray-600">Over 18:</span>
              <span className="ml-2 font-bold text-green-600">{staffSummary.over18}</span>
            </div>
          </div>
        </div>
      )}

      <div className="mb-6">
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-red-400 transition-colors">
          <input
            type="file"
            accept=".csv"
            onChange={handleFileSelect}
            className="hidden"
            id="csv-upload"
          />
          <label
            htmlFor="csv-upload"
            className="cursor-pointer flex flex-col items-center gap-3"
          >
            <Upload className="w-12 h-12 text-gray-400" />
            <div>
              <p className="text-lg font-semibold text-gray-700">
                {selectedFile ? selectedFile.name : 'Choose a CSV file'}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Click to select or drag and drop
              </p>
            </div>
          </label>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="text-red-700">{error}</div>
        </div>
      )}

      {parsing && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg flex items-center gap-3">
          <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />
          <span className="text-blue-700">Parsing CSV file...</span>
        </div>
      )}

      {validationResults && !importResults && (
        <div className="mb-6 space-y-4">
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-start gap-3 mb-2">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-green-800">
                  {validationResults.valid.length} valid record(s) ready to import
                </p>
                {validationResults.valid.length > 0 && (
                  <ul className="mt-2 text-sm text-green-700 space-y-1">
                    {validationResults.valid.slice(0, 5).map((record, idx) => (
                      <li key={idx}>
                        {record.name} {record.is_under_18 ? '(Under 18)' : '(Over 18)'}
                      </li>
                    ))}
                    {validationResults.valid.length > 5 && (
                      <li className="italic">
                        ... and {validationResults.valid.length - 5} more
                      </li>
                    )}
                  </ul>
                )}
              </div>
            </div>
          </div>

          {validationResults.duplicates.length > 0 && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-yellow-800">
                    {validationResults.duplicates.length} duplicate name(s) found in database
                  </p>
                  <ul className="mt-2 text-sm text-yellow-700 space-y-1">
                    {validationResults.duplicates.slice(0, 5).map((record, idx) => (
                      <li key={idx}>{record.name}</li>
                    ))}
                    {validationResults.duplicates.length > 5 && (
                      <li className="italic">
                        ... and {validationResults.duplicates.length - 5} more
                      </li>
                    )}
                  </ul>
                  <div className="mt-3">
                    <label className="flex items-center gap-2 text-sm text-yellow-800">
                      <input
                        type="checkbox"
                        checked={updateMode}
                        onChange={(e) => setUpdateMode(e.target.checked)}
                        className="rounded border-yellow-400"
                      />
                      Update existing records with new data
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {validationResults.errors.length > 0 && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-3">
                <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-red-800">Validation Errors:</p>
                  <ul className="mt-2 text-sm text-red-700 space-y-1">
                    {validationResults.errors.map((err, idx) => (
                      <li key={idx}>{err}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleImport}
              disabled={importing || validationResults.valid.length === 0}
              className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {importing ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5" />
                  Import {validationResults.valid.length + (updateMode ? validationResults.duplicates.length : 0)} Record(s)
                </>
              )}
            </button>
            <button
              onClick={handleReset}
              className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {importResults && (
        <div className="space-y-4">
          {importResults.success.length > 0 && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-green-800">
                    Successfully imported {importResults.success.length} staff member(s)
                  </p>
                </div>
              </div>
            </div>
          )}

          {importResults.updated.length > 0 && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-blue-800">
                    Successfully updated {importResults.updated.length} staff member(s)
                  </p>
                </div>
              </div>
            </div>
          )}

          {importResults.failed.length > 0 && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-3">
                <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-red-800">
                    Failed to import {importResults.failed.length} record(s)
                  </p>
                  <ul className="mt-2 text-sm text-red-700 space-y-1">
                    {importResults.failed.map((fail, idx) => (
                      <li key={idx}>
                        {fail.record.name || 'Unknown'}: {fail.error}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          <button
            onClick={handleReset}
            className="w-full px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors"
          >
            Import Another File
          </button>
        </div>
      )}

      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-semibold text-gray-700 mb-2">CSV Format Requirements:</h3>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>Required column: <code className="bg-gray-200 px-1 rounded">name</code></li>
          <li>Optional column: <code className="bg-gray-200 px-1 rounded">is_under_18</code> (true/false, yes/no, or 1/0)</li>
          <li>First row must contain column headers</li>
          <li>Names must be unique within the CSV file</li>
          <li>Names matching existing staff will be flagged as duplicates</li>
        </ul>
      </div>
    </div>
  );
}
