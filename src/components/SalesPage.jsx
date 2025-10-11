import React, { useState, useEffect } from 'react';
import { Calendar, TrendingUp, Save, Plus, Trash2, Edit2, DollarSign, Clock, BarChart3, Upload, FileText } from 'lucide-react';
import SalesDataImporter from './SalesDataImporter';

const SalesPage = ({
  selectedDate,
  setSelectedDate,
  salesRecordsByDate,
  onUpdateSalesRecords,
  formatDate,
  onDataRefresh
}) => {
  const [newRecord, setNewRecord] = useState({
    time: '',
    forecast: ''
  });
  const [editingRecord, setEditingRecord] = useState(null);
  const [showImporter, setShowImporter] = useState(false);

  const currentRecords = salesRecordsByDate[selectedDate] || [];

  const handleAddRecord = async () => {
    if (!newRecord.time || !newRecord.forecast) {
      return;
    }

    try {
      const updatedRecords = [
        ...currentRecords,
        {
          id: Date.now(),
          date: selectedDate,
          time: newRecord.time,
          forecast: parseFloat(newRecord.forecast) || 0
        }
      ];
      
      await onUpdateSalesRecords(selectedDate, updatedRecords);
      setNewRecord({ time: '', forecast: '' });
    } catch (error) {
      console.error('Failed to add sales record:', error);
    }
  };

  const handleUpdateRecord = async (recordId, updatedData) => {
    try {
      const updatedRecords = currentRecords.map(record =>
        record.id === recordId ? { ...record, ...updatedData } : record
      );
      
      await onUpdateSalesRecords(selectedDate, updatedRecords);
      setEditingRecord(null);
    } catch (error) {
      console.error('Failed to update sales record:', error);
    }
  };

  const handleDeleteRecord = async (recordId) => {
    try {
      const updatedRecords = currentRecords.filter(record => record.id !== recordId);
      await onUpdateSalesRecords(selectedDate, updatedRecords);
    } catch (error) {
      console.error('Failed to delete sales record:', error);
    }
  };

  const handleDeleteAllRecords = async () => {
    if (currentRecords.length === 0) return;
    
    const confirmDelete = window.confirm(
      `Are you sure you want to delete all ${currentRecords.length} sales records for ${formatDate(selectedDate)}? This action cannot be undone.`
    );
    
    if (confirmDelete) {
      try {
        await onUpdateSalesRecords(selectedDate, []);
      } catch (error) {
        console.error('Failed to delete all sales records:', error);
      }
    }
  };

  const handleImportSalesData = async (salesRecords) => {
    try {
      // Convert imported records to the expected format
      const formattedRecords = salesRecords.map(record => ({
        id: Date.now() + Math.random(),
        date: record.date,
        time: record.time,
        forecast: record.forecast
      }));
      
      console.log('Importing sales records:', formattedRecords);
      
      await onUpdateSalesRecords(selectedDate, formattedRecords);
      setShowImporter(false);
      
      // Multiple refresh attempts to ensure data synchronization
      for (let i = 0; i < 3; i++) {
        if (onDataRefresh) {
          await onDataRefresh();
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      
      // Show success message with forecast update confirmation
      const totalForecast = formattedRecords.reduce((sum, record) => sum + record.forecast, 0);
      alert(`Successfully imported ${formattedRecords.length} sales records with total forecast of £${totalForecast.toFixed(2)} for ${formatDate(selectedDate)}. Please check the Deployment page for updated forecasts.`);
    } catch (error) {
      console.error('Failed to import sales data:', error);
      alert(`Failed to import sales data: ${error.message}`);
    }
  };

  const totalForecast = currentRecords.reduce((sum, record) => sum + (record.forecast || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-green-600" />
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Sales Data Management</h2>
              <p className="text-gray-600">Track and manage sales forecasts</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-gray-500" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={() => setShowImporter(!showImporter)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              {showImporter ? 'Hide Importer' : 'Import Data'}
            </button>
            {currentRecords.length > 0 && (
              <button
                onClick={handleDeleteAllRecords}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete All ({currentRecords.length})
              </button>
            )}
          </div>
        </div>

        <div className="text-center py-4 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900">
            {formatDate(selectedDate)}
          </h3>
        </div>
      </div>

      {/* Sales Data Importer */}
      {showImporter && (
        <SalesDataImporter
          onDataImported={handleImportSalesData}
          selectedDate={selectedDate}
        />
      )}

      {/* Summary Card */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center gap-3 mb-4">
          <BarChart3 className="w-6 h-6 text-green-600" />
          <h3 className="text-lg font-semibold text-gray-900">Daily Summary</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-600" />
              <span className="text-sm font-medium text-green-800">Total Forecast</span>
            </div>
            <p className="text-2xl font-bold text-green-900">£{totalForecast.toFixed(2)}</p>
          </div>
          
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">Records Count</span>
            </div>
            <p className="text-2xl font-bold text-blue-900">{currentRecords.length}</p>
          </div>
          
          <div className="bg-purple-50 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-purple-600" />
              <span className="text-sm font-medium text-purple-800">Average per Record</span>
            </div>
            <p className="text-2xl font-bold text-purple-900">
              £{currentRecords.length > 0 ? (totalForecast / currentRecords.length).toFixed(2) : '0.00'}
            </p>
          </div>
        </div>
      </div>

      {/* Add New Record */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center gap-3 mb-4">
          <Plus className="w-6 h-6 text-green-600" />
          <h3 className="text-lg font-semibold text-gray-900">Add Sales Record</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Time</label>
            <input
              type="time"
              value={newRecord.time}
              onChange={(e) => setNewRecord({ ...newRecord, time: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Forecast (£)</label>
            <input
              type="number"
              step="0.01"
              value={newRecord.forecast}
              onChange={(e) => setNewRecord({ ...newRecord, forecast: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="0.00"
            />
          </div>
          
          <div className="flex items-end">
            <button
              onClick={handleAddRecord}
              disabled={!newRecord.time || !newRecord.forecast}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Record
            </button>
          </div>
        </div>
      </div>

      {/* Sales Records List */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center gap-3 mb-4">
          <Clock className="w-6 h-6 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Sales Records</h3>
        </div>
        
        {currentRecords.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <TrendingUp className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No sales records for this date</p>
            <p className="text-sm">Add your first record above</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Time</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Forecast</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentRecords
                  .sort((a, b) => a.time.localeCompare(b.time))
                  .map((record) => (
                    <tr key={record.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        {editingRecord === record.id ? (
                          <input
                            type="time"
                            defaultValue={record.time}
                            onBlur={(e) => handleUpdateRecord(record.id, { time: e.target.value })}
                            className="border border-gray-300 rounded px-2 py-1 text-sm"
                            autoFocus
                          />
                        ) : (
                          <span className="font-mono">{record.time}</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {editingRecord === record.id ? (
                          <input
                            type="number"
                            step="0.01"
                            defaultValue={record.forecast}
                            onBlur={(e) => handleUpdateRecord(record.id, { forecast: parseFloat(e.target.value) || 0 })}
                            className="border border-gray-300 rounded px-2 py-1 text-sm w-24"
                          />
                        ) : (
                          <span className="font-semibold text-green-600">£{record.forecast.toFixed(2)}</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setEditingRecord(editingRecord === record.id ? null : record.id)}
                            className="text-blue-600 hover:text-blue-800 p-1 rounded"
                            title="Edit record"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteRecord(record.id)}
                            className="text-red-600 hover:text-red-800 p-1 rounded"
                            title="Delete record"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default SalesPage;