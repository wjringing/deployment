import React, { useState } from 'react';
import { salesDataProcessor } from '../utils/salesDataProcessor';
import { Upload, FileText, TrendingUp, Clock, AlertCircle, CheckCircle, Copy, Download } from 'lucide-react';

const SalesDataImporter = ({ onDataImported, selectedDate }) => {
  const [pastedData, setPastedData] = useState('');
  const [processedData, setProcessedData] = useState(null);
  const [validation, setValidation] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');

  const handlePasteData = async (e) => {
    const data = e.target.value;
    setPastedData(data);
    
    if (data.trim()) {
      try {
        setIsProcessing(true);
        setError('');
        
        const processed = salesDataProcessor.parseSalesData(data);
        const validationResult = salesDataProcessor.validateData(processed);
        
        setProcessedData(processed);
        setValidation(validationResult);
      } catch (err) {
        setError(err.message);
        setProcessedData(null);
        setValidation(null);
      } finally {
        setIsProcessing(false);
      }
    } else {
      setProcessedData(null);
      setValidation(null);
    }
  };

  const handleImportData = async () => {
    if (!processedData || !onDataImported) return;

    try {
      setIsProcessing(true);
      
      // Convert to sales records format
      const salesRecords = salesDataProcessor.exportForSalesRecords(processedData, selectedDate);
      
      // Import into the system
      await onDataImported(salesRecords);
      
      // Clear the form
      setPastedData('');
      setProcessedData(null);
      setValidation(null);
      
    } catch (err) {
      setError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClearData = () => {
    setPastedData('');
    setProcessedData(null);
    setValidation(null);
    setError('');
  };

  const generateSampleData = () => {
    const sampleData = `Time	Last Year	System Forecast	Manager Forecast
Day Totals	£3,820.72	£4,362.00	£4,300.00
5:00 AM	£0.00	£0.00	£0.00
Breakfast	£245.50	£280.00	£275.00
6:00 AM	£0.00	£0.00	£0.00
7:00 AM	£45.20	£52.00	£50.00
8:00 AM	£89.30	£95.00	£92.00
9:00 AM	£156.80	£165.00	£160.00
10:00 AM	£234.50	£245.00	£240.00
11:00 AM	£298.70	£310.00	£305.00
12:00 PM	£387.90	£395.00	£390.00
Lunch	£1,245.80	£1,280.00	£1,275.00
1:00 PM	£456.20	£465.00	£460.00
2:00 PM	£398.50	£405.00	£400.00
3:00 PM	£345.80	£350.00	£348.00
Afternoon	£567.30	£580.00	£575.00
4:00 PM	£298.40	£305.00	£302.00
5:00 PM	£267.90	£275.00	£272.00
6:00 PM	£234.60	£240.00	£238.00
7:00 PM	£198.30	£205.00	£203.00
8:00 PM	£167.80	£175.00	£173.00
Dinner	£1,156.70	£1,180.00	£1,175.00
9:00 PM	£134.50	£140.00	£138.00
10:00 PM	£89.20	£95.00	£93.00
11:00 PM	£45.60	£50.00	£48.00`;
    
    setPastedData(sampleData);
    handlePasteData({ target: { value: sampleData } });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Upload className="w-6 h-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Sales Data Importer</h2>
              <p className="text-gray-600">Import daily sales figures from tabular data</p>
            </div>
          </div>
          <button
            onClick={generateSampleData}
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <FileText className="w-4 h-4" />
            Load Sample Data
          </button>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <h3 className="font-medium text-blue-900 mb-2">Data Format Instructions:</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Paste data with columns: Time | Last Year | System Forecast | Manager Forecast</li>
            <li>• Manager Forecast values are used as the primary data source</li>
            <li>• Meal period rows (Breakfast, Lunch, Afternoon, Dinner) are automatically filtered out</li>
            <li>• Day Shift: 6:00 AM - 4:00 PM | Night Shift: 4:00 PM - 11:00 PM</li>
            <li>• Supports tab-separated, pipe-separated, or space-separated data</li>
            <li>• <strong>Shift forecasts will be automatically updated</strong> after import</li>
          </ul>
        </div>
      </div>

      {/* Data Input */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Paste Sales Data</h3>
          {pastedData && (
            <button
              onClick={handleClearData}
              className="text-gray-600 hover:text-gray-800 text-sm"
            >
              Clear Data
            </button>
          )}
        </div>
        
        <textarea
          value={pastedData}
          onChange={handlePasteData}
          placeholder="Paste your sales data here (tab-separated, pipe-separated, or space-separated)..."
          className="w-full h-40 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
          disabled={isProcessing}
        />
        
        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <span className="text-red-800">{error}</span>
          </div>
        )}
      </div>

      {/* Processing Results */}
      {processedData && (
        <div className="space-y-6">
          {/* Validation Results */}
          {validation && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center gap-3 mb-4">
                {validation.isValid ? (
                  <CheckCircle className="w-6 h-6 text-green-600" />
                ) : (
                  <AlertCircle className="w-6 h-6 text-red-600" />
                )}
                <h3 className="text-lg font-semibold text-gray-900">
                  Data Validation {validation.isValid ? 'Passed' : 'Failed'}
                </h3>
              </div>
              
              {validation.errors.length > 0 && (
                <div className="mb-4">
                  <h4 className="font-medium text-red-800 mb-2">Errors:</h4>
                  <ul className="list-disc list-inside text-red-700 space-y-1">
                    {validation.errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {validation.warnings.length > 0 && (
                <div>
                  <h4 className="font-medium text-yellow-800 mb-2">Warnings:</h4>
                  <ul className="list-disc list-inside text-yellow-700 space-y-1">
                    {validation.warnings.map((warning, index) => (
                      <li key={index}>{warning}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Summary */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              Sales Summary
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="text-sm font-medium text-blue-800">Total Forecast</div>
                <div className="text-2xl font-bold text-blue-900">
                  {salesDataProcessor.formatCurrency(processedData.totalManagerForecast)}
                </div>
              </div>
              
              <div className="bg-green-50 rounded-lg p-4">
                <div className="text-sm font-medium text-green-800">Day Shift</div>
                <div className="text-2xl font-bold text-green-900">
                  {salesDataProcessor.formatCurrency(processedData.dayShiftForecast)}
                </div>
                <div className="text-xs text-green-700">{processedData.dayShift.length} hours</div>
              </div>
              
              <div className="bg-purple-50 rounded-lg p-4">
                <div className="text-sm font-medium text-purple-800">Night Shift</div>
                <div className="text-2xl font-bold text-purple-900">
                  {salesDataProcessor.formatCurrency(processedData.nightShiftForecast)}
                </div>
                <div className="text-xs text-purple-700">{processedData.nightShift.length} hours</div>
              </div>
            </div>

            {/* Hourly Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Day Shift */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-green-600" />
                  Day Shift (6:00 AM - 4:00 PM)
                </h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {processedData.dayShift.map((item, index) => (
                    <div key={index} className="flex justify-between items-center p-2 bg-green-50 rounded">
                      <span className="text-sm font-medium">{item.time}</span>
                      <span className="text-sm text-green-700">
                        {salesDataProcessor.formatCurrency(item.managerForecast)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Night Shift */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-purple-600" />
                  Night Shift (4:00 PM - 11:00 PM)
                </h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {processedData.nightShift.map((item, index) => (
                    <div key={index} className="flex justify-between items-center p-2 bg-purple-50 rounded">
                      <span className="text-sm font-medium">{item.time}</span>
                      <span className="text-sm text-purple-700">
                        {salesDataProcessor.formatCurrency(item.managerForecast)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Import Actions */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Import Data</h3>
                <p className="text-gray-600">
                  Import {processedData.hourlyData.length} hourly records for {selectedDate}
                </p>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={handleImportData}
                  disabled={isProcessing || !validation?.isValid}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg flex items-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  {isProcessing ? 'Importing...' : 'Import Sales Data'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesDataImporter;