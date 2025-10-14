import { supabase } from '../lib/supabase';

/**
 * Closing Station Validation Module
 *
 * Validates closing training for night shift assignments and manages closing duties.
 * Ensures only closing-trained staff are assigned to positions requiring closing duties.
 * Priority: Seniority first, then ranking scores.
 */

/**
 * Validate if staff member is closing-trained for a specific position
 * @param {string} staffId - UUID of staff member
 * @param {string} positionId - UUID of position
 * @returns {Promise<Object>} Validation result with qualified status and reason
 */
export async function validateClosingTraining(staffId, positionId) {
  try {
    const { data: training } = await supabase
      .from('staff_closing_training')
      .select('is_trained, trained_date, expiry_date, manager_signoff_date')
      .eq('staff_id', staffId)
      .eq('position_id', positionId)
      .eq('is_trained', true)
      .maybeSingle();

    if (!training) {
      return {
        qualified: false,
        reason: 'No closing training record found'
      };
    }

    if (training.expiry_date && new Date(training.expiry_date) < new Date()) {
      return {
        qualified: false,
        reason: 'Closing training has expired'
      };
    }

    return {
      qualified: true,
      reason: 'Closing training validated',
      trainedDate: training.trained_date,
      managerSignedOff: !!training.manager_signoff_date
    };
  } catch (error) {
    console.error('Error validating closing training:', error);
    return {
      qualified: false,
      reason: 'Error validating training'
    };
  }
}

/**
 * Get all closing-trained staff for a position, ordered by seniority then ranking
 * @param {string} positionId - UUID of position
 * @param {string} date - Date for availability check
 * @param {string} shiftType - Shift type (should be 'Night Shift')
 * @returns {Promise<Array>} Array of closing-trained staff ordered by priority
 */
export async function getClosingTrainedStaff(positionId, date, shiftType = 'Night Shift') {
  try {
    const { data: trainedStaff, error: trainedError } = await supabase
      .from('staff_closing_training')
      .select(`
        staff_id,
        trained_date,
        manager_signoff_date,
        expiry_date,
        staff:staff_id (
          id,
          name,
          is_under_18,
          created_at
        )
      `)
      .eq('position_id', positionId)
      .eq('is_trained', true);

    if (trainedError) throw trainedError;

    if (!trainedStaff || trainedStaff.length === 0) {
      return [];
    }

    const validStaff = trainedStaff.filter(t => {
      if (!t.staff) return false;
      if (t.expiry_date && new Date(t.expiry_date) < new Date(date)) return false;
      return true;
    });

    const { data: existingDeployments } = await supabase
      .from('deployments')
      .select('staff_id')
      .eq('date', date)
      .eq('shift_type', shiftType);

    const deployedStaffIds = new Set(existingDeployments?.map(d => d.staff_id) || []);

    const staffWithScores = await Promise.all(
      validStaff.map(async (t) => {
        const { data: rankings } = await supabase
          .from('staff_rankings')
          .select('rating')
          .eq('staff_id', t.staff.id);

        const averageRanking = rankings && rankings.length > 0
          ? rankings.reduce((sum, r) => sum + r.rating, 0) / rankings.length
          : 0;

        const seniorityDays = Math.floor(
          (new Date() - new Date(t.staff.created_at)) / (1000 * 60 * 60 * 24)
        );

        const seniorityScore = seniorityDays * 0.6;
        const rankingScore = averageRanking * 0.4;
        const totalScore = seniorityScore + rankingScore;

        return {
          staffId: t.staff.id,
          staffName: t.staff.name,
          isUnder18: t.staff.is_under_18,
          seniorityDays,
          averageRanking,
          totalScore,
          trainedDate: t.trained_date,
          managerSignedOff: !!t.manager_signoff_date,
          isAlreadyDeployed: deployedStaffIds.has(t.staff.id)
        };
      })
    );

    staffWithScores.sort((a, b) => {
      if (a.isAlreadyDeployed !== b.isAlreadyDeployed) {
        return a.isAlreadyDeployed ? 1 : -1;
      }
      return b.totalScore - a.totalScore;
    });

    return staffWithScores;
  } catch (error) {
    console.error('Error getting closing-trained staff:', error);
    return [];
  }
}

/**
 * Mark a deployment as requiring closing duties
 * @param {string} deploymentId - UUID of deployment
 * @param {boolean} validated - Whether closing training was validated
 * @returns {Promise<Object>} Result of the operation
 */
export async function markDeploymentAsClosing(deploymentId, validated = true) {
  try {
    const { error: updateError } = await supabase
      .from('deployments')
      .update({
        is_closing_duty: true,
        closing_validated: validated
      })
      .eq('id', deploymentId);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error marking deployment as closing:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get closing coverage report for a specific date and shift
 * @param {string} date - Date in YYYY-MM-DD format
 * @param {string} shiftType - Shift type (typically 'Night Shift')
 * @returns {Promise<Object>} Coverage report with status for each position
 */
export async function getClosingCoverageReport(date, shiftType = 'Night Shift') {
  try {
    const { data: requirements, error: requirementsError } = await supabase
      .from('closing_station_requirements')
      .select(`
        position_id,
        requires_closing_training,
        minimum_trained_staff,
        closing_start_time,
        positions:position_id (
          id,
          name,
          type
        )
      `)
      .eq('shift_type', shiftType)
      .eq('is_active', true);

    if (requirementsError) throw requirementsError;

    if (!requirements || requirements.length === 0) {
      return {
        positions: [],
        summary: {
          totalPositions: 0,
          covered: 0,
          partial: 0,
          notCovered: 0
        }
      };
    }

    const report = await Promise.all(
      requirements.map(async (req) => {
        if (!req.positions) return null;

        const { data: deployments } = await supabase
          .from('deployments')
          .select('id, staff_id, is_closing_duty, closing_validated')
          .eq('date', date)
          .eq('shift_type', shiftType)
          .eq('position', req.positions.name);

        const currentlyAssigned = deployments?.filter(d => d.is_closing_duty).length || 0;

        const { data: trainedStaff } = await supabase
          .from('staff_closing_training')
          .select('staff_id')
          .eq('position_id', req.position_id)
          .eq('is_trained', true);

        const closingTrainedAvailable = trainedStaff?.length || 0;

        let coverageStatus = 'NOT_COVERED';
        if (currentlyAssigned >= req.minimum_trained_staff) {
          coverageStatus = 'COVERED';
        } else if (currentlyAssigned > 0) {
          coverageStatus = 'PARTIAL';
        }

        return {
          positionName: req.positions.name,
          positionId: req.position_id,
          requiresClosing: req.requires_closing_training,
          minimumRequired: req.minimum_trained_staff,
          currentlyAssigned,
          closingTrainedAvailable,
          coverageStatus,
          closingStartTime: req.closing_start_time
        };
      })
    );

    const validReport = report.filter(r => r !== null);

    const summary = {
      totalPositions: validReport.length,
      covered: validReport.filter(r => r.coverageStatus === 'COVERED').length,
      partial: validReport.filter(r => r.coverageStatus === 'PARTIAL').length,
      notCovered: validReport.filter(r => r.coverageStatus === 'NOT_COVERED').length
    };

    return {
      positions: validReport,
      summary
    };
  } catch (error) {
    console.error('Error getting closing coverage report:', error);
    return {
      positions: [],
      summary: {
        totalPositions: 0,
        covered: 0,
        partial: 0,
        notCovered: 0
      }
    };
  }
}

/**
 * Auto-assign closing stations for a shift based on trained staff priority
 * @param {string} date - Date in YYYY-MM-DD format
 * @param {string} shiftType - Shift type (should be 'Night Shift')
 * @returns {Promise<Object>} Results with assigned, skipped, and failed counts
 */
export async function assignClosingStations(date, shiftType = 'Night Shift') {
  try {
    const { data: requirements, error: requirementsError } = await supabase
      .from('closing_station_requirements')
      .select(`
        position_id,
        minimum_trained_staff,
        positions:position_id (
          id,
          name
        )
      `)
      .eq('shift_type', shiftType)
      .eq('is_active', true);

    if (requirementsError) throw requirementsError;

    const results = {
      assigned: [],
      skipped: [],
      failed: []
    };

    if (!requirements || requirements.length === 0) {
      return results;
    }

    for (const req of requirements) {
      if (!req.positions) continue;

      const { data: deployments } = await supabase
        .from('deployments')
        .select('id, staff_id, position, is_closing_duty, closing_validated')
        .eq('date', date)
        .eq('shift_type', shiftType)
        .eq('position', req.positions.name);

      if (!deployments || deployments.length === 0) {
        results.skipped.push({
          position: req.positions.name,
          reason: 'No deployments found for this position'
        });
        continue;
      }

      const unassignedClosing = deployments.filter(d => !d.is_closing_duty);

      for (const deployment of unassignedClosing) {
        const validation = await validateClosingTraining(
          deployment.staff_id,
          req.position_id
        );

        if (validation.qualified) {
          const markResult = await markDeploymentAsClosing(deployment.id, true);

          if (markResult.success) {
            results.assigned.push({
              position: req.positions.name,
              deploymentId: deployment.id,
              validated: true
            });
          } else {
            results.failed.push({
              position: req.positions.name,
              deploymentId: deployment.id,
              error: markResult.error
            });
          }
        } else {
          results.skipped.push({
            position: req.positions.name,
            deploymentId: deployment.id,
            reason: validation.reason
          });
        }
      }
    }

    return results;
  } catch (error) {
    console.error('Error in assignClosingStations:', error);
    throw error;
  }
}

/**
 * Check if a position requires closing training for night shifts
 * @param {string} positionId - UUID of position
 * @param {string} shiftType - Shift type
 * @returns {Promise<boolean>} True if closing training is required
 */
export async function positionRequiresClosingTraining(positionId, shiftType = 'Night Shift') {
  try {
    const { data: requirement } = await supabase
      .from('closing_station_requirements')
      .select('requires_closing_training, is_active')
      .eq('position_id', positionId)
      .eq('shift_type', shiftType)
      .eq('is_active', true)
      .maybeSingle();

    return requirement?.requires_closing_training || false;
  } catch (error) {
    console.error('Error checking closing training requirement:', error);
    return false;
  }
}

/**
 * Get closing-trained staff count for a position
 * @param {string} positionId - UUID of position
 * @returns {Promise<number>} Count of closing-trained staff
 */
export async function getClosingTrainedStaffCount(positionId) {
  try {
    const { data, error } = await supabase
      .from('staff_closing_training')
      .select('staff_id', { count: 'exact', head: true })
      .eq('position_id', positionId)
      .eq('is_trained', true);

    if (error) throw error;

    return data?.length || 0;
  } catch (error) {
    console.error('Error getting closing-trained staff count:', error);
    return 0;
  }
}

/**
 * Add closing training record for a staff member
 * @param {string} staffId - UUID of staff member
 * @param {string} positionId - UUID of position
 * @param {Object} trainingDetails - Training details (trainer, manager, notes, etc.)
 * @returns {Promise<Object>} Result of the operation
 */
export async function addClosingTraining(staffId, positionId, trainingDetails = {}) {
  try {
    const { data, error } = await supabase
      .from('staff_closing_training')
      .insert({
        staff_id: staffId,
        position_id: positionId,
        is_trained: true,
        trained_date: trainingDetails.trainedDate || new Date().toISOString(),
        trainer_staff_id: trainingDetails.trainerId || null,
        manager_signoff_date: trainingDetails.managerSignoffDate || null,
        manager_staff_id: trainingDetails.managerId || null,
        expiry_date: trainingDetails.expiryDate || null,
        certification_notes: trainingDetails.notes || ''
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return { success: false, error: 'Training record already exists' };
      }
      throw error;
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error adding closing training:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Remove closing training record for a staff member
 * @param {string} staffId - UUID of staff member
 * @param {string} positionId - UUID of position
 * @returns {Promise<Object>} Result of the operation
 */
export async function removeClosingTraining(staffId, positionId) {
  try {
    const { error } = await supabase
      .from('staff_closing_training')
      .delete()
      .eq('staff_id', staffId)
      .eq('position_id', positionId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error removing closing training:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get all closing training records for a staff member
 * @param {string} staffId - UUID of staff member
 * @returns {Promise<Array>} Array of training records
 */
export async function getStaffClosingTrainings(staffId) {
  try {
    const { data, error } = await supabase
      .from('staff_closing_training')
      .select(`
        *,
        position:position_id (
          id,
          name,
          type
        ),
        trainer:trainer_staff_id (
          id,
          name
        ),
        manager:manager_staff_id (
          id,
          name
        )
      `)
      .eq('staff_id', staffId)
      .eq('is_trained', true)
      .order('trained_date', { ascending: false });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error getting staff closing trainings:', error);
    return [];
  }
}
