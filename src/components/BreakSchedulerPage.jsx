import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { toast } from '../lib/toast';
import {
  Coffee, Clock, CheckCircle, AlertTriangle, Users, Calendar, Plus, X, Zap
} from 'lucide-react';

export default function BreakSchedulerPage() {
  const [breaks, setBreaks] = useState([]);
  const [deployments, setDeployments] = useState([]);
  const [gaps, setGaps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedShift, setSelectedShift] = useState('Day Shift');

  useEffect(() => {
    loadData();
  }, [selectedDate, selectedShift]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [breaksRes, deploymentsRes, gapsRes] = await Promise.all([
        supabase
          .from('break_schedules')
          .select(`
            *,
            staff:staff(id, name, is_under_18),
            deployment:deployments(position),
            coverage_staff:staff!break_schedules_coverage_staff_id_fkey(name)
          `)
          .eq('date', selectedDate)
          .eq('shift_type', selectedShift)
          .order('scheduled_start_time'),
        supabase
          .from('deployments')
          .select(`*, staff:staff(id, name, is_under_18)`)
          .eq('date', selectedDate)
          .eq('shift_type', selectedShift),
        supabase
          .from('break_coverage_gaps')
          .select('*')
          .eq('date', selectedDate)
          .eq('shift_type', selectedShift)
          .is('resolved_at', null)
      ]);

      if (breaksRes.error) throw breaksRes.error;
      if (deploymentsRes.error) throw deploymentsRes.error;
      if (gapsRes.error) throw gapsRes.error;

      setBreaks(breaksRes.data || []);
      setDeployments(deploymentsRes.data || []);
      setGaps(gapsRes.data || []);
    } catch (error) {
      toast.error('Failed to load data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const calculateWorkHours = (startTime, endTime) => {
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);
    let hours = (endH + endM / 60) - (startH + startM / 60);
    if (hours < 0) hours += 24;
    return hours;
  };

  const handleAutoScheduleBreaks = async () => {
    if (!confirm(`Auto-schedule breaks for ${deployments.length} staff members?`)) return;

    try {
      const newBreaks = [];

      for (const deployment of deployments) {
        const existingBreak = breaks.find(b => b.staff_id === deployment.staff_id);
        if (existingBreak) continue;

        const workHours = calculateWorkHours(deployment.start_time, deployment.end_time);
        let breakDuration = 0;
        let breakType = 'rest_break';

        if (deployment.staff.is_under_18) {
          if (workHours >= 4.5) {
            breakDuration = 30;
            breakType = 'rest_break';
          }
        } else {
          if (workHours >= 6) {
            breakDuration = 30;
            breakType = 'meal_break';
          } else if (workHours >= 4.5) {
            breakDuration = 15;
            breakType = 'rest_break';
          }
        }

        if (breakDuration > 0) {
          const startHour = parseInt(deployment.start_time.split(':')[0]);
          const breakStartHour = startHour + Math.floor(workHours / 2);
          const breakStart = `${String(breakStartHour).padStart(2, '0')}:00`;

          newBreaks.push({
            deployment_id: deployment.id,
            staff_id: deployment.staff_id,
            date: selectedDate,
            shift_type: selectedShift,
            break_type: breakType,
            break_duration_minutes: breakDuration,
            scheduled_start_time: breakStart,
            uk_compliance_checked: true,
            notes: deployment.staff.is_under_18 ? 'Under-18 compliance break' : 'Standard break'
          });
        }
      }

      if (newBreaks.length > 0) {
        const { error } = await supabase
          .from('break_schedules')
          .insert(newBreaks);

        if (error) throw error;

        toast.success(`Auto-scheduled ${newBreaks.length} breaks with UK compliance`);
        await loadData();
      } else {
        toast.info('No additional breaks needed');
      }
    } catch (error) {
      toast.error('Failed to auto-schedule: ' + error.message);
    }
  };

  const handleStartBreak = async (breakId) => {
    try {
      const { error } = await supabase
        .from('break_schedules')
        .update({
          status: 'in_progress',
          actual_start_time: new Date().toISOString()
        })
        .eq('id', breakId);

      if (error) throw error;
      toast.success('Break started');
      await loadData();
    } catch (error) {
      toast.error('Failed to start break: ' + error.message);
    }
  };

  const handleCompleteBreak = async (breakId) => {
    try {
      const { error } = await supabase
        .from('break_schedules')
        .update({
          status: 'completed',
          actual_end_time: new Date().toISOString()
        })
        .eq('id', breakId);

      if (error) throw error;
      toast.success('Break completed');
      await loadData();
    } catch (error) {
      toast.error('Failed to complete break: ' + error.message);
    }
  };

  const handleDeleteBreak = async (breakId) => {
    if (!confirm('Delete this break schedule?')) return;

    try {
      const { error } = await supabase
        .from('break_schedules')
        .delete()
        .eq('id', breakId);

      if (error) throw error;
      toast.success('Break deleted');
      await loadData();
    } catch (error) {
      toast.error('Failed to delete: ' + error.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Break Rotation Scheduler</h2>
          <p className="text-gray-600">Automated break scheduling with UK labor compliance</p>
        </div>
        <Button onClick={handleAutoScheduleBreaks}>
          <Zap className="w-4 h-4 mr-2" />
          Auto-Schedule Breaks
        </Button>
      </div>

      <Card className="p-4">
        <div className="flex gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Date</label>
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Shift</label>
            <select
              value={selectedShift}
              onChange={(e) => setSelectedShift(e.target.value)}
              className="border rounded px-3 py-2"
            >
              <option value="Day Shift">Day Shift</option>
              <option value="Night Shift">Night Shift</option>
            </select>
          </div>
          <div className="flex-1" />
          <div className="flex items-end gap-4 text-sm">
            <div>
              <span className="font-bold text-lg">{breaks.length}</span>
              <div className="text-gray-600">Total Breaks</div>
            </div>
            <div>
              <span className="font-bold text-lg text-orange-600">
                {breaks.filter(b => b.status === 'in_progress').length}
              </span>
              <div className="text-gray-600">In Progress</div>
            </div>
            <div>
              <span className="font-bold text-lg text-green-600">
                {breaks.filter(b => b.status === 'completed').length}
              </span>
              <div className="text-gray-600">Completed</div>
            </div>
          </div>
        </div>
      </Card>

      {gaps.length > 0 && (
        <Card className="p-4 bg-orange-50 border-orange-200">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
            <div>
              <h3 className="font-bold text-orange-900">Coverage Gaps ({gaps.length})</h3>
              <ul className="mt-2 space-y-1">
                {gaps.map((gap) => (
                  <li key={gap.id} className="text-sm text-orange-800">
                    <span className="font-medium">{gap.position}</span> at {gap.time_slot}
                    {' - '}
                    <span className="uppercase text-xs">{gap.severity}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {breaks.map((breakItem) => (
          <Card
            key={breakItem.id}
            className={`p-4 ${
              breakItem.status === 'completed'
                ? 'bg-green-50 border-green-200'
                : breakItem.status === 'in_progress'
                ? 'bg-orange-50 border-orange-200'
                : 'bg-white'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Coffee className="w-5 h-5" />
                <span className="font-bold">{breakItem.staff?.name}</span>
              </div>
              <div className="flex gap-1">
                {breakItem.uk_compliance_checked && (
                  <div className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded" title="UK Compliant">
                    <CheckCircle className="w-3 h-3" />
                  </div>
                )}
                {breakItem.staff?.is_under_18 && (
                  <div className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded" title="Under 18">
                    U18
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2 text-sm mb-3">
              {breakItem.deployment?.position && (
                <div>
                  <span className="font-medium">Position:</span> {breakItem.deployment.position}
                </div>
              )}
              <div>
                <span className="font-medium">Time:</span> {breakItem.scheduled_start_time}
              </div>
              <div>
                <span className="font-medium">Duration:</span> {breakItem.break_duration_minutes} min
              </div>
              <div>
                <span className="font-medium">Type:</span>{' '}
                <span className="capitalize">{breakItem.break_type.replace('_', ' ')}</span>
              </div>
              {breakItem.coverage_staff && (
                <div>
                  <span className="font-medium">Coverage:</span> {breakItem.coverage_staff.name}
                </div>
              )}
              {breakItem.notes && (
                <div className="text-xs text-gray-600 italic">{breakItem.notes}</div>
              )}
            </div>

            <div className="flex gap-2">
              {breakItem.status === 'scheduled' && (
                <>
                  <Button
                    size="sm"
                    onClick={() => handleStartBreak(breakItem.id)}
                    className="flex-1 bg-orange-600 hover:bg-orange-700"
                  >
                    Start Break
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDeleteBreak(breakItem.id)}
                    className="text-red-600"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </>
              )}
              {breakItem.status === 'in_progress' && (
                <Button
                  size="sm"
                  onClick={() => handleCompleteBreak(breakItem.id)}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  Complete
                </Button>
              )}
              {breakItem.status === 'completed' && (
                <div className="flex-1 text-sm text-green-700 font-medium flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Completed
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>

      {breaks.length === 0 && (
        <Card className="p-12 text-center">
          <Coffee className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-bold text-gray-600 mb-2">No Breaks Scheduled</h3>
          <p className="text-gray-500 mb-4">
            Click "Auto-Schedule Breaks" to generate breaks with UK compliance
          </p>
          <Button onClick={handleAutoScheduleBreaks}>
            <Zap className="w-4 h-4 mr-2" />
            Auto-Schedule Breaks
          </Button>
        </Card>
      )}

      <Card className="p-4 bg-blue-50 border-blue-200">
        <h3 className="font-bold text-blue-900 mb-2">UK Labor Law Compliance</h3>
        <div className="space-y-2 text-sm text-blue-800">
          <div className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 mt-0.5 text-blue-600" />
            <div>
              <strong>Under-18 Workers:</strong> 30-minute break required after 4.5 hours of work
            </div>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 mt-0.5 text-blue-600" />
            <div>
              <strong>Adult Workers:</strong> 20-minute break required after 6 hours of work
            </div>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 mt-0.5 text-blue-600" />
            <div>
              <strong>Auto-Scheduler:</strong> Automatically calculates compliant break times
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
