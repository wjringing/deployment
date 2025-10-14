import React, { useState } from 'react';
import { Calendar, Users, Clock, Filter } from 'lucide-react';

export default function ShiftScheduleViewer({ scheduleData }) {
  const [view, setView] = useState('by-day');
  const [selectedDay, setSelectedDay] = useState('monday');
  const [roleFilter, setRoleFilter] = useState('all');

  const schedule = scheduleData;
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  const roleColors = {
    'Cook Deployment': 'bg-orange-100 text-orange-800 border-orange-300',
    'Team Member Deployment': 'bg-green-100 text-green-800 border-green-300',
    'Shift Runner Deployment': 'bg-blue-100 text-blue-800 border-blue-300'
  };

  const getShiftsForDay = (day) => {
    const shifts = [];
    schedule.employees.forEach(employee => {
      const dayShifts = employee.shifts.filter(s => s.day === day);
      dayShifts.forEach(shift => {
        shifts.push({
          ...shift,
          employeeName: employee.name,
          employeeRole: employee.role
        });
      });
    });
    return shifts.sort((a, b) => {
      const timeA = convertTo24Hour(a.start);
      const timeB = convertTo24Hour(b.start);
      return timeA - timeB;
    });
  };

  const convertTo24Hour = (time) => {
    const [timePart, period] = time.split(' ');
    let [hours, minutes = '0'] = timePart.split(':');
    hours = parseInt(hours);
    minutes = parseInt(minutes);

    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;

    return hours * 60 + minutes;
  };

  const filteredEmployees = roleFilter === 'all'
    ? schedule.employees
    : schedule.employees.filter(e => e.role === roleFilter);

  const roles = [...new Set(schedule.employees.map(e => e.role))];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                <Calendar className="w-8 h-8 text-red-600" />
                {schedule.location}
              </h1>
              <p className="text-gray-600 mt-1">
                Week of Oct {schedule.week.monday} - {schedule.week.sunday}, 2025
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setView('by-day')}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  view === 'by-day'
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                By Day
              </button>
              <button
                onClick={() => setView('by-employee')}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  view === 'by-employee'
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                By Employee
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-4 h-4 text-gray-600" />
            <span className="text-sm text-gray-600">Filter by role:</span>
            <button
              onClick={() => setRoleFilter('all')}
              className={`px-3 py-1 rounded-full text-sm font-medium transition ${
                roleFilter === 'all'
                  ? 'bg-gray-800 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              All
            </button>
            {roles.map(role => (
              <button
                key={role}
                onClick={() => setRoleFilter(role)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition ${
                  roleFilter === role
                    ? roleColors[role].replace('100', '600').replace('800', 'white')
                    : roleColors[role]
                }`}
              >
                {role.replace(' Deployment', '')}
              </button>
            ))}
          </div>
        </div>

        {view === 'by-day' && (
          <div>
            <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
              {days.map(day => {
                const dayShifts = getShiftsForDay(day);
                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDay(day)}
                    className={`px-4 py-3 rounded-lg font-medium transition flex-shrink-0 ${
                      selectedDay === day
                        ? 'bg-red-600 text-white shadow-lg'
                        : 'bg-white text-gray-700 hover:bg-gray-100 shadow'
                    }`}
                  >
                    <div className="text-sm">
                      {day.charAt(0).toUpperCase() + day.slice(1)}
                    </div>
                    <div className="text-xs opacity-75">
                      Oct {schedule.week[day]}
                    </div>
                    <div className="text-xs font-bold mt-1">
                      {dayShifts.length} shifts
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 capitalize">
                {selectedDay} Schedule
              </h2>
              <div className="space-y-3">
                {getShiftsForDay(selectedDay).length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No shifts scheduled</p>
                ) : (
                  getShiftsForDay(selectedDay).map((shift, idx) => (
                    <div
                      key={idx}
                      className={`p-4 rounded-lg border-2 ${roleColors[shift.employeeRole]} transition hover:shadow-md`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-bold text-lg">{shift.employeeName}</div>
                          <div className="text-sm opacity-75">
                            {shift.employeeRole.replace(' Deployment', '')}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-2 justify-end">
                            <Clock className="w-4 h-4" />
                            <span className="font-bold">{shift.start} - {shift.end}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {view === 'by-employee' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Users className="w-6 h-6" />
              Employee Schedules
            </h2>
            <div className="space-y-4">
              {filteredEmployees.map((employee, idx) => (
                <div
                  key={idx}
                  className="border-2 border-gray-200 rounded-lg p-4 hover:shadow-md transition"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">{employee.name}</h3>
                      <span className={`inline-block mt-1 px-3 py-1 rounded-full text-sm font-medium ${roleColors[employee.role]}`}>
                        {employee.role.replace(' Deployment', '')}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-red-600">
                        {employee.shifts.length}
                      </div>
                      <div className="text-sm text-gray-600">shifts</div>
                    </div>
                  </div>

                  {employee.shifts.length === 0 ? (
                    <p className="text-gray-500 text-sm">No shifts this week</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                      {employee.shifts.map((shift, shiftIdx) => (
                        <div
                          key={shiftIdx}
                          className="bg-gray-50 p-3 rounded border border-gray-200"
                        >
                          <div className="font-semibold text-gray-900 capitalize text-sm">
                            {shift.day}
                          </div>
                          <div className="text-xs text-gray-600 flex items-center gap-1 mt-1">
                            <Clock className="w-3 h-3" />
                            {shift.start} - {shift.end}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
