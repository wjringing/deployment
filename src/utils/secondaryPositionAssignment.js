import { supabase } from '../lib/supabase';

/**
 * Secondary Position Auto-Deployment Module
 *
 * Automatically assigns secondary positions to deployments after primary positions are set.
 * Uses position_secondary_mappings to determine which secondary positions to deploy.
 */

/**
 * Main entry point: Auto-assign secondary positions for all deployments on a given date/shift
 * @param {string} date - Date in YYYY-MM-DD format
 * @param {string} shiftType - 'Day Shift' or 'Night Shift'
 * @returns {Promise<Object>} Results with assigned, skipped, and failed counts
 */
export async function autoAssignSecondaryPositions(date, shiftType) {
  try {
    const { data: deployments, error: deploymentsError } = await supabase
      .from('deployments')
      .select(`
        *,
        staff:staff_id (
          id,
          name
        )
      `)
      .eq('date', date)
      .eq('shift_type', shiftType)
      .not('position', 'is', null)
      .neq('position', '')
      .eq('has_secondary', false);

    if (deploymentsError) throw deploymentsError;

    if (!deployments || deployments.length === 0) {
      return {
        assigned: [],
        skipped: [],
        failed: [],
        message: 'No deployments found requiring secondary position assignment'
      };
    }

    const results = {
      assigned: [],
      skipped: [],
      failed: []
    };

    for (const deployment of deployments) {
      try {
        const secondaryPosition = await assignBestSecondaryPosition(
          deployment,
          date,
          shiftType
        );

        if (secondaryPosition) {
          results.assigned.push({
            staffName: deployment.staff?.name,
            primaryPosition: deployment.position,
            secondaryPosition: secondaryPosition.name,
            priority: secondaryPosition.priority
          });
        } else {
          results.skipped.push({
            staffName: deployment.staff?.name,
            primaryPosition: deployment.position,
            reason: 'No available secondary position found'
          });
        }
      } catch (error) {
        console.error('Error assigning secondary for deployment:', error);
        results.failed.push({
          staffName: deployment.staff?.name,
          primaryPosition: deployment.position,
          error: error.message
        });
      }
    }

    return results;
  } catch (error) {
    console.error('Error in autoAssignSecondaryPositions:', error);
    throw error;
  }
}

/**
 * Assign the best available secondary position to a deployment
 * @param {Object} deployment - Deployment object with position and staff info
 * @param {string} date - Date of the deployment
 * @param {string} shiftType - Shift type
 * @returns {Promise<Object|null>} Assigned secondary position or null
 */
async function assignBestSecondaryPosition(deployment, date, shiftType) {
  try {
    const { data: position } = await supabase
      .from('positions')
      .select('id')
      .eq('name', deployment.position)
      .eq('type', 'position')
      .maybeSingle();

    if (!position) {
      return null;
    }

    const candidates = await getSecondaryPositionCandidates(
      position.id,
      deployment.staff.id,
      shiftType
    );

    for (const candidate of candidates) {
      const isAvailable = await validateSecondaryPositionAvailability(
        candidate.name,
        date,
        shiftType
      );

      if (isAvailable) {
        const { error: updateError } = await supabase
          .from('deployments')
          .update({
            secondary: candidate.name,
            has_secondary: true
          })
          .eq('id', deployment.id);

        if (updateError) {
          console.error('Error updating deployment with secondary:', updateError);
          continue;
        }

        return candidate;
      }
    }

    return null;
  } catch (error) {
    console.error('Error in assignBestSecondaryPosition:', error);
    return null;
  }
}

/**
 * Get eligible secondary position candidates for a primary position
 * @param {string} primaryPositionId - UUID of primary position
 * @param {string} staffId - UUID of staff member
 * @param {string} shiftType - Shift type
 * @returns {Promise<Array>} Array of secondary position candidates ordered by priority
 */
export async function getSecondaryPositionCandidates(primaryPositionId, staffId, shiftType) {
  try {
    const { data: mappings, error: mappingsError } = await supabase
      .from('position_secondary_mappings')
      .select(`
        priority,
        auto_deploy,
        notes,
        secondary_position:secondary_position_id (
          id,
          name,
          type
        )
      `)
      .eq('primary_position_id', primaryPositionId)
      .eq('is_enabled', true)
      .eq('auto_deploy', true)
      .or(`shift_type.eq.${shiftType},shift_type.eq.Both`)
      .order('priority', { ascending: true });

    if (mappingsError) throw mappingsError;

    if (!mappings || mappings.length === 0) {
      return [];
    }

    const candidates = [];

    for (const mapping of mappings) {
      if (!mapping.secondary_position) continue;

      const isQualified = await checkStaffQualificationForPosition(
        staffId,
        mapping.secondary_position.id
      );

      if (isQualified) {
        candidates.push({
          id: mapping.secondary_position.id,
          name: mapping.secondary_position.name,
          type: mapping.secondary_position.type,
          priority: mapping.priority,
          notes: mapping.notes
        });
      }
    }

    return candidates;
  } catch (error) {
    console.error('Error getting secondary position candidates:', error);
    return [];
  }
}

/**
 * Check if staff member is qualified for a secondary position
 * @param {string} staffId - UUID of staff member
 * @param {string} positionId - UUID of position
 * @returns {Promise<boolean>} True if qualified
 */
async function checkStaffQualificationForPosition(staffId, positionId) {
  try {
    const { data: position } = await supabase
      .from('positions')
      .select('name, type')
      .eq('id', positionId)
      .maybeSingle();

    if (!position) return false;

    if (position.type === 'pack_position') {
      return true;
    }

    const { data: trainings } = await supabase
      .from('staff_training_stations')
      .select('station_name, is_trained')
      .eq('staff_id', staffId)
      .eq('is_trained', true);

    if (!trainings || trainings.length === 0) {
      return true;
    }

    const stationMapping = {
      'DT': 'FOH Cashier',
      'DT2': 'FOH Present',
      'Cook': 'BOH Cook',
      'Cook2': 'BOH Cook',
      'Front': 'FOH Cashier',
      'Mid': 'FOH Cashier',
      'Lobby': 'FOH Guest Host',
      'Burgers': 'MOH Burgers',
      'Fries': 'MOH Sides',
      'Chick': 'MOH Chicken Pack',
      'Rst': 'Freezer to Fryer'
    };

    const requiredStation = stationMapping[position.name];
    if (!requiredStation) return true;

    return trainings.some(t => t.station_name === requiredStation);
  } catch (error) {
    console.error('Error checking staff qualification:', error);
    return false;
  }
}

/**
 * Validate if a secondary position is available for assignment
 * @param {string} positionName - Name of the position
 * @param {string} date - Date of deployment
 * @param {string} shiftType - Shift type
 * @returns {Promise<boolean>} True if available
 */
export async function validateSecondaryPositionAvailability(positionName, date, shiftType) {
  try {
    const { data: existingAssignments } = await supabase
      .from('deployments')
      .select('id')
      .eq('secondary', positionName)
      .eq('date', date)
      .eq('shift_type', shiftType);

    const { data: position } = await supabase
      .from('positions')
      .select('id, type')
      .eq('name', positionName)
      .maybeSingle();

    if (!position) return false;

    if (position.type === 'pack_position') {
      const { data: capacity } = await supabase
        .from('position_capacity')
        .select('max_concurrent')
        .eq('position_id', position.id)
        .or(`shift_type.eq.${shiftType},shift_type.eq.Both`)
        .maybeSingle();

      const maxConcurrent = capacity?.max_concurrent || 2;
      return !existingAssignments || existingAssignments.length < maxConcurrent;
    }

    return !existingAssignments || existingAssignments.length === 0;
  } catch (error) {
    console.error('Error validating secondary position availability:', error);
    return false;
  }
}

/**
 * Assign a specific secondary position to a deployment
 * @param {string} deploymentId - UUID of deployment
 * @param {string} secondaryPositionName - Name of secondary position to assign
 * @returns {Promise<Object>} Result of the assignment
 */
export async function assignSecondaryToDeployment(deploymentId, secondaryPositionName) {
  try {
    const { data: deployment } = await supabase
      .from('deployments')
      .select('date, shift_type')
      .eq('id', deploymentId)
      .maybeSingle();

    if (!deployment) {
      return { success: false, error: 'Deployment not found' };
    }

    const isAvailable = await validateSecondaryPositionAvailability(
      secondaryPositionName,
      deployment.date,
      deployment.shift_type
    );

    if (!isAvailable) {
      return {
        success: false,
        error: 'Secondary position is not available'
      };
    }

    const { error: updateError } = await supabase
      .from('deployments')
      .update({
        secondary: secondaryPositionName,
        has_secondary: true
      })
      .eq('id', deploymentId);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error in assignSecondaryToDeployment:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Remove secondary position assignment from a deployment
 * @param {string} deploymentId - UUID of deployment
 * @returns {Promise<Object>} Result of the removal
 */
export async function removeSecondaryFromDeployment(deploymentId) {
  try {
    const { error: updateError } = await supabase
      .from('deployments')
      .update({
        secondary: '',
        has_secondary: false
      })
      .eq('id', deploymentId);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error in removeSecondaryFromDeployment:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get secondary position statistics for a date/shift
 * @param {string} date - Date in YYYY-MM-DD format
 * @param {string} shiftType - Shift type
 * @returns {Promise<Object>} Statistics object
 */
export async function getSecondaryPositionStats(date, shiftType) {
  try {
    const { data: deployments } = await supabase
      .from('deployments')
      .select('position, secondary, has_secondary')
      .eq('date', date)
      .eq('shift_type', shiftType);

    if (!deployments) {
      return {
        total: 0,
        withSecondary: 0,
        withoutSecondary: 0,
        coveragePercent: 0
      };
    }

    const total = deployments.length;
    const withSecondary = deployments.filter(d => d.has_secondary).length;
    const withoutSecondary = total - withSecondary;
    const coveragePercent = total > 0 ? Math.round((withSecondary / total) * 100) : 0;

    return {
      total,
      withSecondary,
      withoutSecondary,
      coveragePercent
    };
  } catch (error) {
    console.error('Error getting secondary position stats:', error);
    return {
      total: 0,
      withSecondary: 0,
      withoutSecondary: 0,
      coveragePercent: 0
    };
  }
}
