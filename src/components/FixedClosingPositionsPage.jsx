import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Shield, Calendar, Users, AlertCircle, RefreshCw, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function FixedClosingPositionsPage() {
  const [staff, setStaff] = useState([]);
  const [positions, setPositions] = useState([]);
  const [fixedAssignments, setFixedAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const [newAssignment, setNewAssignment] = useState({
    staff_id: '',
    position_id: '',
    shift_type: 'Night Shift',
    day_of_week: '',
    priority: 1,
    notes: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [staffRes, positionsRes, assignmentsRes] = await Promise.all([
        supabase.from('staff').select('*').order('name'),
        supabase.from('positions').select('*').eq('type', 'position').order('name'),
        supabase.from('staff_fixed_closing_positions').select(`
          *,
          staff:staff_id (id, name),
          position:position_id (id, name),
          assigned_by_staff:assigned_by (name)
        `).order('priority')
      ]);

      if (staffRes.data) setStaff(staffRes.data);
      if (positionsRes.data) setPositions(positionsRes.data);
      if (assignmentsRes.data) setFixedAssignments(assignmentsRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function createAssignment() {
    try {
      if (!newAssignment.staff_id || !newAssignment.position_id) {
        alert('Please select both staff member and position');
        return;
      }

      const { error } = await supabase
        .from('staff_fixed_closing_positions')
        .insert({
          ...newAssignment,
          day_of_week: newAssignment.day_of_week || null,
          assigned_by: staff[0]?.id,
          is_active: true
        });

      if (error) throw error;

      setShowModal(false);
      setNewAssignment({
        staff_id: '',
        position_id: '',
        shift_type: 'Night Shift',
        day_of_week: '',
        priority: 1,
        notes: ''
      });
      await loadData();
    } catch (error) {
      console.error('Error creating assignment:', error);
      alert('Error creating assignment: ' + error.message);
    }
  }

  async function toggleAssignment(id, currentActive) {
    try {
      const { error } = await supabase
        .from('staff_fixed_closing_positions')
        .update({ is_active: !currentActive })
        .eq('id', id);

      if (error) throw error;
      await loadData();
    } catch (error) {
      console.error('Error toggling assignment:', error);
    }
  }

  async function deleteAssignment(id) {
    if (!confirm('Are you sure you want to delete this fixed closing assignment?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('staff_fixed_closing_positions')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await loadData();
    } catch (error) {
      console.error('Error deleting assignment:', error);
      alert('Error deleting assignment: ' + error.message);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="w-8 h-8 text-blue-600" />
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Fixed Closing Positions</h2>
            <p className="text-sm text-gray-600 mt-1">
              Assign specific staff members to fixed closing positions that override auto-assignment
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => loadData()}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Fixed Assignment
          </button>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">How Fixed Closing Positions Work:</p>
            <ul className="list-disc list-inside space-y-1 text-blue-700">
              <li>Fixed assignments have <strong>highest priority</strong> and override auto-assignment logic</li>
              <li>Staff members will <strong>always</strong> be assigned to their fixed closing position when working that shift</li>
              <li>You can set fixed assignments for specific days of the week or all days</li>
              <li>Multiple fixed positions can be assigned with different priorities</li>
              <li>This is useful for experienced closers or shift leaders</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Fixed Closing Assignments</h3>

          {fixedAssignments.length === 0 ? (
            <div className="text-center py-12">
              <Shield className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500 mb-1">No fixed closing assignments configured yet.</p>
              <p className="text-sm text-gray-400 mb-4">
                Add fixed assignments to ensure specific staff members are always assigned to closing positions.
              </p>
              <button
                onClick={() => setShowModal(true)}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Create your first fixed assignment
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {fixedAssignments.map((assignment) => (
                <div
                  key={assignment.id}
                  className={`flex items-center justify-between p-4 rounded-lg border ${
                    assignment.is_active ? 'bg-white' : 'bg-gray-50 opacity-60'
                  }`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Shield className={`w-5 h-5 ${assignment.is_active ? 'text-blue-600' : 'text-gray-400'}`} />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900">{assignment.staff?.name || 'Unknown'}</span>
                          <span className="text-gray-400">→</span>
                          <span className="font-semibold text-blue-600">{assignment.position?.name || 'Unknown'}</span>
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {assignment.shift_type}
                            {assignment.day_of_week && ` - ${assignment.day_of_week}`}
                          </span>
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">
                            Priority: {assignment.priority}
                          </span>
                          {assignment.is_active && (
                            <span className="flex items-center gap-1 text-green-600">
                              <CheckCircle className="w-4 h-4" />
                              Active
                            </span>
                          )}
                        </div>
                        {assignment.notes && (
                          <p className="text-sm text-gray-600 mt-1">{assignment.notes}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleAssignment(assignment.id, assignment.is_active)}
                      className={`px-3 py-1 rounded text-xs font-medium ${
                        assignment.is_active
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                      }`}
                    >
                      {assignment.is_active ? 'Active' : 'Inactive'}
                    </button>
                    <button
                      onClick={() => deleteAssignment(assignment.id)}
                      className="text-red-600 hover:text-red-800 p-2"
                      title="Delete assignment"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Create Fixed Closing Assignment</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Staff Member *</label>
                  <select
                    value={newAssignment.staff_id}
                    onChange={(e) => setNewAssignment({ ...newAssignment, staff_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Staff Member</option>
                    {staff.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Closing Position *</label>
                  <select
                    value={newAssignment.position_id}
                    onChange={(e) => setNewAssignment({ ...newAssignment, position_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Position</option>
                    {positions.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Shift Type</label>
                    <select
                      value={newAssignment.shift_type}
                      onChange={(e) => setNewAssignment({ ...newAssignment, shift_type: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Night Shift">Night Shift</option>
                      <option value="Day Shift">Day Shift</option>
                      <option value="Both">Both Shifts</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Day of Week (Optional)</label>
                    <select
                      value={newAssignment.day_of_week}
                      onChange={(e) => setNewAssignment({ ...newAssignment, day_of_week: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">All Days</option>
                      <option value="Monday">Monday</option>
                      <option value="Tuesday">Tuesday</option>
                      <option value="Wednesday">Wednesday</option>
                      <option value="Thursday">Thursday</option>
                      <option value="Friday">Friday</option>
                      <option value="Saturday">Saturday</option>
                      <option value="Sunday">Sunday</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <input
                    type="number"
                    min="1"
                    value={newAssignment.priority}
                    onChange={(e) => setNewAssignment({ ...newAssignment, priority: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Lower numbers = higher priority (1 is highest)</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
                  <textarea
                    value={newAssignment.notes}
                    onChange={(e) => setNewAssignment({ ...newAssignment, notes: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    rows="2"
                    placeholder="Add any notes about this assignment..."
                  ></textarea>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={createAssignment}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
                >
                  Create Assignment
                </button>
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
