import React, { useState, useEffect } from 'react';
import { History, FileText, Users, TrendingUp, Calendar, Download, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function HistoryPage() {
  const [uploads, setUploads] = useState([]);
  const [selectedUpload, setSelectedUpload] = useState(null);
  const [uploadDetails, setUploadDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => {
    loadUploadHistory();
    loadAnalytics();
  }, []);

  useEffect(() => {
    if (selectedUpload) {
      loadUploadDetails(selectedUpload);
    }
  }, [selectedUpload]);

  const loadUploadHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('schedule_uploads')
        .select(`
          *,
          locations(name, location_code)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUploads(data || []);
    } catch (error) {
      console.error('Error loading upload history:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUploadDetails = async (uploadId) => {
    try {
      const upload = uploads.find(u => u.id === uploadId);
      if (!upload) return;

      const { data: deployments, error } = await supabase
        .from('shift_deployments')
        .select(`
          *,
          employees(name, role)
        `)
        .eq('week_start_date', upload.week_start_date)
        .eq('location_id', upload.location_id);

      if (error) throw error;

      const uniqueEmployees = new Set(deployments.map(d => d.employee_id));
      const shiftTypes = {
        day: deployments.filter(d => d.shift_type === 'day').length,
        night: deployments.filter(d => d.shift_type === 'night').length,
        both: deployments.filter(d => d.shift_type === 'both').length
      };

      const roles = {
        'Shift Runner': deployments.filter(d => d.role === 'Shift Runner').length,
        'Team Member': deployments.filter(d => d.role === 'Team Member').length,
        'Cook': deployments.filter(d => d.role === 'Cook').length
      };

      const byDate = {};
      deployments.forEach(d => {
        if (!byDate[d.deployment_date]) {
          byDate[d.deployment_date] = { day: 0, night: 0, both: 0 };
        }
        byDate[d.deployment_date][d.shift_type]++;
      });

      setUploadDetails({
        upload,
        deployments,
        totalEmployees: uniqueEmployees.size,
        shiftTypes,
        roles,
        byDate
      });
    } catch (error) {
      console.error('Error loading upload details:', error);
    }
  };

  const loadAnalytics = async () => {
    try {
      const { data: allDeployments, error } = await supabase
        .from('shift_deployments')
        .select('*');

      if (error) throw error;

      const totalShifts = allDeployments.length;
      const uniqueEmployees = new Set(allDeployments.map(d => d.employee_id));
      const uniqueWeeks = new Set(allDeployments.map(d => d.week_start_date));

      const shiftDistribution = {
        day: allDeployments.filter(d => d.shift_type === 'day').length,
        night: allDeployments.filter(d => d.shift_type === 'night').length,
        both: allDeployments.filter(d => d.shift_type === 'both').length
      };

      setAnalytics({
        totalShifts,
        totalEmployees: uniqueEmployees.size,
        totalWeeks: uniqueWeeks.size,
        shiftDistribution
      });
    } catch (error) {
      console.error('Error loading analytics:', error);
    }
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatDateTime = (dateStr) => {
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status) => {
    const colors = {
      'completed': 'bg-green-100 text-green-800 border-green-300',
      'processing': 'bg-blue-100 text-blue-800 border-blue-300',
      'failed': 'bg-red-100 text-red-800 border-red-300'
    };
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-300';
  };

  const deleteWeek = async (upload) => {
    try {
      const { error: deploymentsError } = await supabase
        .from('shift_deployments')
        .delete()
        .eq('week_start_date', upload.week_start_date)
        .eq('location_id', upload.location_id);

      if (deploymentsError) throw deploymentsError;

      const { error: uploadError } = await supabase
        .from('schedule_uploads')
        .delete()
        .eq('id', upload.id);

      if (uploadError) throw uploadError;

      setUploads(uploads.filter(u => u.id !== upload.id));
      if (selectedUpload === upload.id) {
        setSelectedUpload(null);
        setUploadDetails(null);
      }
      setDeleteConfirm(null);

      await loadAnalytics();
    } catch (error) {
      console.error('Error deleting week:', error);
      alert('Failed to delete week. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Historical Tracking</h1>
        <p className="text-gray-600">View past schedule uploads and deployment analytics</p>
      </div>

      {analytics && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-medium text-gray-600">Total Weeks</span>
            </div>
            <p className="text-3xl font-bold text-gray-800">{analytics.totalWeeks}</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-5 h-5 text-green-600" />
              <span className="text-sm font-medium text-gray-600">Total Employees</span>
            </div>
            <p className="text-3xl font-bold text-gray-800">{analytics.totalEmployees}</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5 text-purple-600" />
              <span className="text-sm font-medium text-gray-600">Total Shifts</span>
            </div>
            <p className="text-3xl font-bold text-gray-800">{analytics.totalShifts}</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-5 h-5 text-orange-600" />
              <span className="text-sm font-medium text-gray-600">Uploads</span>
            </div>
            <p className="text-3xl font-bold text-gray-800">{uploads.length}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-1">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <History className="w-5 h-5" />
                Upload History
              </h2>
            </div>

            <div className="max-h-[600px] overflow-y-auto">
              {uploads.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  No uploads yet
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {uploads.map(upload => (
                    <button
                      key={upload.id}
                      onClick={() => setSelectedUpload(upload.id)}
                      className={`w-full text-left p-4 hover:bg-gray-50 transition-colors ${
                        selectedUpload === upload.id ? 'bg-blue-50' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="font-medium text-gray-800 text-sm">
                          Week of {formatDate(upload.week_start_date)}
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded border ${getStatusColor(upload.processing_status)}`}>
                          {upload.processing_status}
                        </span>
                      </div>

                      <div className="text-xs text-gray-600 mb-1">
                        {upload.locations?.name || 'Unknown Location'}
                      </div>

                      <div className="text-xs text-gray-500">
                        {formatDateTime(upload.created_at)}
                      </div>

                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-600">
                        <span>{upload.total_employees} employees</span>
                        <span>{upload.total_shifts} shifts</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="col-span-2">
          {uploadDetails ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-800">Upload Details</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Week of {formatDate(uploadDetails.upload.week_start_date)}
                </p>
              </div>

              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="grid grid-cols-2 gap-4 flex-1">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-sm font-medium text-gray-600 mb-1">Location</div>
                      <div className="text-gray-800">{uploadDetails.upload.locations?.name}</div>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-sm font-medium text-gray-600 mb-1">Uploaded</div>
                      <div className="text-gray-800">{formatDateTime(uploadDetails.upload.created_at)}</div>
                    </div>
                  </div>

                  <button
                    onClick={() => setDeleteConfirm(uploadDetails.upload)}
                    className="ml-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center gap-2 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Week
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">

                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-sm font-medium text-gray-600 mb-1">Total Employees</div>
                    <div className="text-2xl font-bold text-gray-800">{uploadDetails.totalEmployees}</div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-sm font-medium text-gray-600 mb-1">Total Shifts</div>
                    <div className="text-2xl font-bold text-gray-800">{uploadDetails.deployments.length}</div>
                  </div>
                </div>

                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Shift Type Distribution</h3>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                      <div className="text-xs text-yellow-700 mb-1">Day Shifts</div>
                      <div className="text-xl font-bold text-yellow-800">{uploadDetails.shiftTypes.day}</div>
                    </div>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <div className="text-xs text-blue-700 mb-1">Night Shifts</div>
                      <div className="text-xl font-bold text-blue-800">{uploadDetails.shiftTypes.night}</div>
                    </div>
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                      <div className="text-xs text-purple-700 mb-1">Both Shifts</div>
                      <div className="text-xl font-bold text-purple-800">{uploadDetails.shiftTypes.both}</div>
                    </div>
                  </div>
                </div>

                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Role Distribution</h3>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <div className="text-xs text-red-700 mb-1">Shift Runners</div>
                      <div className="text-xl font-bold text-red-800">{uploadDetails.roles['Shift Runner']}</div>
                    </div>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <div className="text-xs text-green-700 mb-1">Team Members</div>
                      <div className="text-xl font-bold text-green-800">{uploadDetails.roles['Team Member']}</div>
                    </div>
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                      <div className="text-xs text-orange-700 mb-1">Cooks</div>
                      <div className="text-xl font-bold text-orange-800">{uploadDetails.roles['Cook']}</div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Daily Breakdown</h3>
                  <div className="space-y-2">
                    {Object.entries(uploadDetails.byDate)
                      .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
                      .map(([date, counts]) => (
                        <div key={date} className="bg-gray-50 rounded-lg p-3">
                          <div className="flex items-center justify-between">
                            <div className="font-medium text-gray-800 text-sm">
                              {new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
                                weekday: 'long',
                                month: 'short',
                                day: 'numeric'
                              })}
                            </div>
                            <div className="flex items-center gap-3 text-xs">
                              <span className="text-yellow-700">
                                Day: <span className="font-semibold">{counts.day}</span>
                              </span>
                              <span className="text-blue-700">
                                Night: <span className="font-semibold">{counts.night}</span>
                              </span>
                              <span className="text-purple-700">
                                Both: <span className="font-semibold">{counts.both}</span>
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Select an upload from the history to view details</p>
            </div>
          )}
        </div>
      </div>

      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-800">Delete Week</h3>
                <p className="text-sm text-gray-600">This action cannot be undone</p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-700 mb-2">
                You are about to delete the schedule for:
              </p>
              <div className="font-medium text-gray-800">
                Week of {formatDate(deleteConfirm.week_start_date)}
              </div>
              <div className="text-sm text-gray-600 mt-1">
                {deleteConfirm.locations?.name}
              </div>
              <div className="text-sm text-gray-500 mt-2">
                This will remove {deleteConfirm.total_shifts} shifts for {deleteConfirm.total_employees} employees.
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteWeek(deleteConfirm)}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete Week
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
