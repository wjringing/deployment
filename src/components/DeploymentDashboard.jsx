import React, { useState, useEffect } from 'react';
import { Calendar, Users, Clock, ChevronLeft, ChevronRight, Filter, Download } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { formatShiftType, getShiftColor, getRoleColor } from '../utils/shiftClassifier';
import { exportToExcel, exportToPDF, exportToCSV } from '../utils/deploymentExport';

export default function DeploymentDashboard() {
  const [selectedWeek, setSelectedWeek] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedShiftType, setSelectedShiftType] = useState('all');
  const [selectedRole, setSelectedRole] = useState('all');
  const [deployments, setDeployments] = useState([]);
  const [allDeployments, setAllDeployments] = useState([]);
  const [weekOptions, setWeekOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [stats, setStats] = useState({
    totalEmployees: 0,
    dayShifts: 0,
    nightShifts: 0,
    bothShifts: 0
  });

  useEffect(() => {
    loadWeekOptions();
  }, []);

  useEffect(() => {
    if (selectedWeek) {
      loadDeployments();
    }
  }, [selectedWeek, selectedDate, selectedShiftType, selectedRole]);

  const loadWeekOptions = async () => {
    try {
      const { data, error } = await supabase
        .from('schedule_uploads')
        .select('week_start_date, location_id, locations(name)')
        .eq('processing_status', 'completed')
        .order('week_start_date', { ascending: false });

      if (error) throw error;

      setWeekOptions(data || []);
      if (data && data.length > 0) {
        setSelectedWeek(data[0].week_start_date);
      }
    } catch (error) {
      console.error('Error loading weeks:', error);
    }
  };

  const loadDeployments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('shift_deployments')
        .select(`
          *,
          employees(name, role),
          locations(name)
        `)
        .eq('week_start_date', selectedWeek)
        .order('deployment_date', { ascending: true })
        .order('start_time', { ascending: true });

      if (error) throw error;

      setAllDeployments(data || []);
      if (data && data.length > 0) {
        setCurrentLocation(data[0].locations.name);
      }

      const uniqueEmployees = new Set(data.map(d => d.employee_id));
      const dayShifts = data.filter(d => d.shift_type === 'day').length;
      const nightShifts = data.filter(d => d.shift_type === 'night').length;
      const bothShifts = data.filter(d => d.shift_type === 'both').length;

      setStats({
        totalEmployees: uniqueEmployees.size,
        dayShifts,
        nightShifts,
        bothShifts
      });

      let filteredData = data;

      if (selectedDate) {
        filteredData = filteredData.filter(d => d.deployment_date === selectedDate);
      }

      if (selectedShiftType !== 'all') {
        filteredData = filteredData.filter(d => d.shift_type === selectedShiftType);
      }

      if (selectedRole !== 'all') {
        filteredData = filteredData.filter(d => d.role === selectedRole);
      }

      setDeployments(filteredData);
    } catch (error) {
      console.error('Error loading deployments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = (format) => {
    if (!allDeployments || allDeployments.length === 0) {
      alert('No data to export');
      return;
    }

    const locationName = currentLocation || 'Unknown Location';

    switch (format) {
      case 'excel':
        exportToExcel(allDeployments, selectedWeek, locationName);
        break;
      case 'pdf':
        exportToPDF(allDeployments, selectedWeek, locationName);
        break;
      case 'csv':
        exportToCSV(allDeployments, selectedWeek, locationName);
        break;
      default:
        break;
    }
  };

  const getWeekDates = () => {
    if (!selectedWeek) return [];

    const startDate = new Date(selectedWeek + 'T00:00:00');
    const dates = [];
    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      dates.push({
        date: date.toISOString().split('T')[0],
        dayName: dayNames[i],
        displayDate: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      });
    }

    return dates;
  };

  const groupDeploymentsByDate = () => {
    const grouped = {};

    deployments.forEach(deployment => {
      if (!grouped[deployment.deployment_date]) {
        grouped[deployment.deployment_date] = [];
      }
      grouped[deployment.deployment_date].push(deployment);
    });

    return grouped;
  };

  const formatTime = (timeStr) => {
    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const weekDates = getWeekDates();
  const groupedDeployments = groupDeploymentsByDate();

  const navigateWeek = (direction) => {
    const currentIndex = weekOptions.findIndex(w => w.week_start_date === selectedWeek);
    const newIndex = direction === 'next' ? currentIndex - 1 : currentIndex + 1;

    if (newIndex >= 0 && newIndex < weekOptions.length) {
      setSelectedWeek(weekOptions[newIndex].week_start_date);
      setSelectedDate(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Shift Deployment Dashboard</h1>
        <p className="text-gray-600">View and manage weekly staff deployments across all shifts</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigateWeek('prev')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              disabled={weekOptions.findIndex(w => w.week_start_date === selectedWeek) === weekOptions.length - 1}
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>

            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-gray-600" />
              <select
                value={selectedWeek || ''}
                onChange={(e) => {
                  setSelectedWeek(e.target.value);
                  setSelectedDate(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {weekOptions.map(week => (
                  <option key={week.week_start_date} value={week.week_start_date}>
                    Week of {new Date(week.week_start_date + 'T00:00:00').toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => navigateWeek('next')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              disabled={weekOptions.findIndex(w => w.week_start_date === selectedWeek) === 0}
            >
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative group">
              <button
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Download className="w-4 h-4" />
                Export
              </button>
              <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                <button
                  onClick={() => handleExport('excel')}
                  className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm text-gray-700 rounded-t-lg"
                >
                  Export to Excel
                </button>
                <button
                  onClick={() => handleExport('pdf')}
                  className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm text-gray-700"
                >
                  Export to PDF
                </button>
                <button
                  onClick={() => handleExport('csv')}
                  className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm text-gray-700 rounded-b-lg"
                >
                  Export to CSV
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-600" />
              <select
                value={selectedShiftType}
                onChange={(e) => setSelectedShiftType(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Shifts</option>
                <option value="day">Day Shift</option>
                <option value="night">Night Shift</option>
                <option value="both">Both Shifts</option>
              </select>
            </div>

            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Roles</option>
              <option value="Shift Runner">Shift Runners</option>
              <option value="Team Member">Team Members</option>
              <option value="Cook">Cooks</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-4 h-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-600">Total Staff</span>
            </div>
            <p className="text-2xl font-bold text-gray-800">{stats.totalEmployees}</p>
          </div>

          <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-yellow-700" />
              <span className="text-sm font-medium text-yellow-700">Day Shifts</span>
            </div>
            <p className="text-2xl font-bold text-yellow-800">{stats.dayShifts}</p>
          </div>

          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-blue-700" />
              <span className="text-sm font-medium text-blue-700">Night Shifts</span>
            </div>
            <p className="text-2xl font-bold text-blue-800">{stats.nightShifts}</p>
          </div>

          <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-purple-700" />
              <span className="text-sm font-medium text-purple-700">Both Shifts</span>
            </div>
            <p className="text-2xl font-bold text-purple-800">{stats.bothShifts}</p>
          </div>
        </div>

        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setSelectedDate(null)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedDate === null
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All Days
          </button>
          {weekDates.map(({ date, dayName, displayDate }) => (
            <button
              key={date}
              onClick={() => setSelectedDate(date)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedDate === date
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <div>{dayName}</div>
              <div className="text-xs opacity-80">{displayDate}</div>
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading deployments...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {weekDates.map(({ date, dayName }) => {
            const dayDeployments = groupedDeployments[date] || [];

            if (selectedDate && selectedDate !== date) return null;
            if (dayDeployments.length === 0) return null;

            const dayShifts = dayDeployments.filter(d => d.shift_type === 'day');
            const nightShifts = dayDeployments.filter(d => d.shift_type === 'night');
            const bothShifts = dayDeployments.filter(d => d.shift_type === 'both');

            return (
              <div key={date} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-800">{dayName}</h3>
                  <p className="text-sm text-gray-600">
                    {new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </p>
                </div>

                <div className="p-6 grid grid-cols-3 gap-6">
                  {dayShifts.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                        Day Shift ({dayShifts.length})
                      </h4>
                      <div className="space-y-2">
                        {dayShifts.map(deployment => (
                          <div
                            key={deployment.id}
                            className="bg-yellow-50 border border-yellow-200 rounded-lg p-3"
                          >
                            <div className="font-medium text-gray-800 text-sm">{deployment.employees.name}</div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`text-xs px-2 py-0.5 rounded ${getRoleColor(deployment.role)}`}>
                                {deployment.role}
                              </span>
                            </div>
                            <div className="text-xs text-gray-600 mt-1">
                              {formatTime(deployment.start_time)} - {formatTime(deployment.end_time)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {nightShifts.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-blue-600"></div>
                        Night Shift ({nightShifts.length})
                      </h4>
                      <div className="space-y-2">
                        {nightShifts.map(deployment => (
                          <div
                            key={deployment.id}
                            className="bg-blue-50 border border-blue-200 rounded-lg p-3"
                          >
                            <div className="font-medium text-gray-800 text-sm">{deployment.employees.name}</div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`text-xs px-2 py-0.5 rounded ${getRoleColor(deployment.role)}`}>
                                {deployment.role}
                              </span>
                            </div>
                            <div className="text-xs text-gray-600 mt-1">
                              {formatTime(deployment.start_time)} - {formatTime(deployment.end_time)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {bothShifts.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                        Both Shifts ({bothShifts.length})
                      </h4>
                      <div className="space-y-2">
                        {bothShifts.map(deployment => (
                          <div
                            key={deployment.id}
                            className="bg-purple-50 border border-purple-200 rounded-lg p-3"
                          >
                            <div className="font-medium text-gray-800 text-sm">{deployment.employees.name}</div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`text-xs px-2 py-0.5 rounded ${getRoleColor(deployment.role)}`}>
                                {deployment.role}
                              </span>
                            </div>
                            <div className="text-xs text-gray-600 mt-1">
                              {formatTime(deployment.start_time)} - {formatTime(deployment.end_time)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {deployments.length === 0 && (
            <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No deployments found for the selected filters</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
