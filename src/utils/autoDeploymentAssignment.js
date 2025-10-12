import { supabase } from '../lib/supabase';
import { classifyShift } from './scheduleParser';

export async function autoAssignScheduleToDeployments(scheduleId, weekStartDate) {
  try {
    const { data: scheduleShifts, error: shiftsError } = await supabase
      .from('schedule_shifts')
      .select(`
        *,
        schedule_employees (
          name,
          role,
          staff_id
        )
      `)
      .eq('schedule_id', scheduleId)
      .eq('auto_assigned_to_deployment', false);

    if (shiftsError) throw shiftsError;

    const results = {
      success: [],
      failed: [],
      skipped: []
    };

    for (const shift of scheduleShifts) {
      try {
        if (!shift.schedule_employees?.staff_id) {
          results.skipped.push({
            employeeName: shift.schedule_employees?.name,
            reason: 'No staff member matched'
          });
          continue;
        }

        const shiftClassification = classifyShift(shift.start_time, shift.end_time);

        if (shiftClassification === 'Both Shifts') {
          const dayDeployment = await createDeployment(
            shift,
            'Day Shift',
            shift.shift_date
          );

          const nightDeployment = await createDeployment(
            shift,
            'Night Shift',
            shift.shift_date
          );

          if (dayDeployment && nightDeployment) {
            await supabase
              .from('schedule_shifts')
              .update({
                auto_assigned_to_deployment: true,
                deployment_id: dayDeployment.id,
                updated_at: new Date().toISOString()
              })
              .eq('id', shift.id);

            results.success.push({
              employeeName: shift.schedule_employees.name,
              date: shift.shift_date,
              shifts: ['Day Shift', 'Night Shift']
            });
          } else if (!dayDeployment || !nightDeployment) {
            results.skipped.push({
              employeeName: shift.schedule_employees.name,
              date: shift.shift_date,
              reason: 'Maximum deployments reached for one or both shifts'
            });
          }
        } else {
          const deployment = await createDeployment(
            shift,
            shiftClassification,
            shift.shift_date
          );

          if (deployment) {
            await supabase
              .from('schedule_shifts')
              .update({
                auto_assigned_to_deployment: true,
                deployment_id: deployment.id,
                updated_at: new Date().toISOString()
              })
              .eq('id', shift.id);

            results.success.push({
              employeeName: shift.schedule_employees.name,
              date: shift.shift_date,
              shift: shiftClassification
            });
          } else {
            results.skipped.push({
              employeeName: shift.schedule_employees.name,
              date: shift.shift_date,
              reason: `Maximum deployments reached for ${shiftClassification}`
            });
          }
        }
      } catch (error) {
        console.error('Error assigning shift:', error);
        results.failed.push({
          employeeName: shift.schedule_employees?.name,
          error: error.message
        });
      }
    }

    return results;
  } catch (error) {
    console.error('Error in auto assignment:', error);
    throw error;
  }
}

async function createDeployment(shift, shiftType, shiftDate) {
  try {
    const { data: existingDeployment } = await supabase
      .from('deployments')
      .select('id')
      .eq('staff_id', shift.schedule_employees.staff_id)
      .eq('date', shiftDate)
      .eq('shift_type', shiftType)
      .maybeSingle();

    if (existingDeployment) {
      return null;
    }

    const { count: deploymentCount, error: countError } = await supabase
      .from('deployments')
      .select('*', { count: 'exact', head: true })
      .eq('date', shiftDate)
      .eq('shift_type', shiftType);

    if (countError) {
      console.error('Error checking deployment count:', countError);
      return null;
    }

    if (deploymentCount >= 2) {
      console.warn(`Maximum deployments reached for ${shiftType} on ${shiftDate}`);
      return null;
    }

    const { data: deployment, error } = await supabase
      .from('deployments')
      .insert({
        staff_id: shift.schedule_employees.staff_id,
        date: shiftDate,
        shift_type: shiftType,
        start_time: shift.start_time,
        end_time: shift.end_time,
        position: '',
        secondary: '',
        area: '',
        closing: '',
        break_minutes: 0
      })
      .select()
      .single();

    if (error) throw error;

    return deployment;
  } catch (error) {
    console.error('Error creating deployment:', error);
    return null;
  }
}

export async function matchScheduleEmployeesToStaff(scheduleId) {
  try {
    const { data: scheduleEmployees, error: employeesError } = await supabase
      .from('schedule_employees')
      .select('*')
      .eq('schedule_id', scheduleId)
      .is('staff_id', null);

    if (employeesError) throw employeesError;

    const { data: staff, error: staffError } = await supabase
      .from('staff')
      .select('*');

    if (staffError) throw staffError;

    const matches = [];

    for (const employee of scheduleEmployees) {
      const matchedStaff = staff.find(s =>
        s.name.toLowerCase().trim() === employee.name.toLowerCase().trim()
      );

      if (matchedStaff) {
        const { error: updateError } = await supabase
          .from('schedule_employees')
          .update({ staff_id: matchedStaff.id })
          .eq('id', employee.id);

        if (!updateError) {
          matches.push({
            employeeName: employee.name,
            staffName: matchedStaff.name,
            staffId: matchedStaff.id
          });

          await supabase
            .from('schedule_shifts')
            .update({ staff_id: matchedStaff.id })
            .eq('schedule_employee_id', employee.id);
        }
      }
    }

    return matches;
  } catch (error) {
    console.error('Error matching employees to staff:', error);
    throw error;
  }
}
