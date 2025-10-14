import { supabase } from '../lib/supabase';
import { getTrainedStaffForStation } from './trainingManager';
import { buildAssignmentContext, getRequiredPositionsByConfig, isPositionExcluded } from './ruleEngine';
import { validateClosingTraining, positionRequiresClosingTraining, markDeploymentAsClosing } from './closingStationValidator';

const POSITION_TO_STATION_MAP = {
  'Cook': 'BOH Cook',
  'Cook2': 'BOH Cook',
  'DT': 'FOH Cashier',
  'DT2': 'FOH Present',
  'DT Presenter': 'FOH Present',
  'Front': 'FOH Cashier',
  'Mid': 'FOH Cashier',
  'Lobby': 'FOH Guest Host',
  'DT Pack': 'FOH Pack',
  'Rst Pack': 'FOH Pack',
  'Burgers': 'MOH Burgers',
  'Fries': 'MOH Sides',
  'Chick': 'MOH Chicken Pack',
  'Rst': 'Freezer to Fryer'
};

/**
 * Intelligent Auto-Deployment Assignment System with Dynamic Configuration
 *
 * Automatically assigns positions to deployments based on:
 * 1. Dynamic shift configuration (DT type, number of cooks, etc.)
 * 2. Core positions that must be filled
 * 3. Conditional staffing rules
 * 4. Staff default positions (highest priority)
 * 5. Training stations with rankings
 * 6. Sign-off status
 * 7. Position availability
 * 8. Closing training validation for night shifts
 */
export async function intelligentAutoDeployment(date, shiftType, userConfig = null) {
  try {
    const { data: oldConfig } = await supabase
      .from('deployment_auto_assignment_config')
      .select('*')
      .eq('config_name', 'default')
      .maybeSingle();

    if (!oldConfig || !oldConfig.enabled) {
      return {
        error: 'Auto-assignment is disabled',
        assigned: [],
        skipped: [],
        failed: []
      };
    }

    const { data: shiftInfo } = await supabase
      .from('shift_info')
      .select('*')
      .eq('date', date)
      .maybeSingle();

    const { config: dynamicConfig, context, appliedRules } = await buildAssignmentContext(
      date,
      shiftType,
      shiftInfo
    );

    if (userConfig) {
      Object.assign(dynamicConfig, userConfig);
    }

    const requiredPositions = await getRequiredPositionsByConfig(date, shiftType, dynamicConfig);

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
      .or('position.is.null,position.eq.');

    if (deploymentsError) throw deploymentsError;

    const results = {
      assigned: [],
      skipped: [],
      failed: [],
      config: dynamicConfig,
      appliedRules: appliedRules.map(r => r.rule_name),
      requiredPositions: requiredPositions.map(rp => `${rp.position} (${rp.source})`)
    };

    for (const deployment of deployments || []) {
      try {
        const position = await findBestPositionForStaff(
          deployment.staff,
          deployment,
          oldConfig,
          dynamicConfig,
          shiftType
        );

        if (position) {
          if (isPositionExcluded(position.name, dynamicConfig)) {
            results.skipped.push({
              staffName: deployment.staff.name,
              reason: `Position ${position.name} is excluded by configuration`
            });
            continue;
          }

          const updateData = { position: position.name };

          if (shiftType === 'Night Shift' && position.requiresClosing) {
            updateData.is_closing_duty = true;
            updateData.closing_validated = position.closingValidated || false;
          }

          const { error: updateError } = await supabase
            .from('deployments')
            .update(updateData)
            .eq('id', deployment.id);

          if (updateError) throw updateError;

          results.assigned.push({
            staffName: deployment.staff.name,
            position: position.name,
            score: position.score,
            source: position.source,
            closingDuty: updateData.is_closing_duty || false,
            closingValidated: updateData.closing_validated || false
          });
        } else {
          results.skipped.push({
            staffName: deployment.staff.name,
            reason: 'No suitable position found'
          });
        }
      } catch (error) {
        console.error('Error assigning deployment:', error);
        results.failed.push({
          staffName: deployment.staff?.name,
          error: error.message
        });
      }
    }

    return results;
  } catch (error) {
    console.error('Error in intelligent auto deployment:', error);
    throw error;
  }
}

async function findBestPositionForStaff(staff, deployment, config, dynamicConfig, shiftType) {
  const candidates = [];

  if (config.use_default_positions) {
    const defaultCandidates = await getDefaultPositionCandidates(
      staff.id,
      deployment.shift_type,
      deployment.date,
      dynamicConfig
    );
    candidates.push(...defaultCandidates);
  }

  if (config.use_training_stations && candidates.length === 0) {
    const trainingCandidates = await getTrainingBasedCandidates(
      staff.id,
      deployment.shift_type,
      deployment.date,
      config,
      dynamicConfig
    );
    candidates.push(...trainingCandidates);
  }

  if (shiftType === 'Night Shift') {
    for (const candidate of candidates) {
      const { data: position } = await supabase
        .from('positions')
        .select('id')
        .eq('name', candidate.name)
        .eq('type', 'position')
        .maybeSingle();

      if (position) {
        const requiresClosing = await positionRequiresClosingTraining(position.id, shiftType);
        candidate.requiresClosing = requiresClosing;

        if (requiresClosing) {
          const validation = await validateClosingTraining(staff.id, position.id);
          candidate.closingValidated = validation.qualified;

          if (!validation.qualified) {
            candidate.score -= 500;
          } else {
            candidate.score += 100;
          }
        }
      }
    }
  }

  candidates.sort((a, b) => b.score - a.score);

  return candidates[0] || null;
}

async function getDefaultPositionCandidates(staffId, shiftType, date, dynamicConfig) {
  const candidates = [];

  try {
    // Get staff default positions
    const { data: defaultPositions } = await supabase
      .from('staff_default_positions')
      .select(`
        priority,
        shift_type,
        positions (
          id,
          name
        )
      `)
      .eq('staff_id', staffId);

    if (!defaultPositions || defaultPositions.length === 0) {
      return candidates;
    }

    // Check each default position
    for (const dp of defaultPositions) {
      // Check if shift type matches
      if (dp.shift_type !== 'Both' && dp.shift_type !== shiftType) {
        continue;
      }

      // Check if position is available
      const available = await isPositionAvailable(
        dp.positions.name,
        date,
        shiftType
      );

      if (available) {
        candidates.push({
          name: dp.positions.name,
          score: 1000 + (10 - dp.priority), // Base 1000 + priority bonus
          source: 'default',
          priority: dp.priority
        });
      }
    }
  } catch (error) {
    console.error('Error getting default position candidates:', error);
  }

  return candidates;
}

async function getTrainingBasedCandidates(staffId, shiftType, date, config, dynamicConfig) {
  const candidates = [];

  try {
    // Get staff training stations
    const { data: trainings } = await supabase
      .from('staff_training_stations')
      .select('station_name')
      .eq('staff_id', staffId);

    if (!trainings || trainings.length === 0) {
      return candidates;
    }

    // Get rankings for scoring
    const { data: rankings } = await supabase
      .from('staff_rankings')
      .select('station_name, rating')
      .eq('staff_id', staffId);

    const rankingsMap = {};
    rankings?.forEach(r => {
      rankingsMap[r.station_name] = r.rating;
    });

    // Get sign-offs for bonus
    const { data: signOffs } = await supabase
      .from('staff_sign_offs')
      .select('station_name')
      .eq('staff_id', staffId);

    const signOffSet = new Set(signOffs?.map(s => s.station_name) || []);

    // For each training station, get position mappings
    for (const training of trainings) {
      const { data: mappings } = await supabase
        .from('station_position_mappings')
        .select(`
          priority,
          positions (
            id,
            name
          )
        `)
        .eq('station_name', training.station_name)
        .order('priority');

      if (!mappings || mappings.length === 0) continue;

      for (const mapping of mappings) {
        const available = await isPositionAvailable(
          mapping.positions.name,
          date,
          shiftType
        );

        if (!available) continue;

        // Calculate score
        let score = 100; // Base score

        // Add ranking bonus (10-50 points)
        const rating = rankingsMap[training.station_name];
        if (rating && config.use_rankings) {
          score += rating * 10;

          // Check minimum threshold
          if (rating < config.min_ranking_threshold) {
            continue; // Skip if below threshold
          }
        }

        // Add sign-off bonus (20 points)
        if (signOffSet.has(training.station_name)) {
          score += 20;
        } else if (config.prefer_signed_off_only) {
          continue; // Skip if not signed off and config requires it
        }

        // Priority penalty (prefer priority 1)
        score -= mapping.priority * 5;

        candidates.push({
          name: mapping.positions.name,
          score,
          source: 'training',
          station: training.station_name,
          rating: rating || 0,
          signedOff: signOffSet.has(training.station_name)
        });
      }
    }
  } catch (error) {
    console.error('Error getting training-based candidates:', error);
  }

  return candidates;
}

async function isPositionAvailable(positionName, date, shiftType) {
  try {
    // Check if position already has someone assigned
    const { data: existing } = await supabase
      .from('deployments')
      .select('id')
      .eq('date', date)
      .eq('shift_type', shiftType)
      .eq('position', positionName);

    if (!existing || existing.length === 0) {
      return true; // Position is available
    }

    // Check position capacity
    const { data: positions } = await supabase
      .from('positions')
      .select('id')
      .eq('name', positionName)
      .maybeSingle();

    if (!positions) return false;

    const { data: capacity } = await supabase
      .from('position_capacity')
      .select('max_concurrent')
      .eq('position_id', positions.id)
      .or(`shift_type.eq.${shiftType},shift_type.eq.Both`)
      .maybeSingle();

    if (!capacity) {
      // No capacity defined, assume single person
      return existing.length === 0;
    }

    return existing.length < capacity.max_concurrent;
  } catch (error) {
    console.error('Error checking position availability:', error);
    return false;
  }
}

export async function suggestOptimalPositionForStaff(staffId, role, shiftType) {
  try {
    const { data: trainingData } = await supabase
      .from('staff_training_stations')
      .select('*')
      .eq('staff_id', staffId)
      .eq('is_trained', true);

    if (!trainingData || trainingData.length === 0) {
      return { position: '', reason: 'No training data available' };
    }

    const bestTraining = trainingData.find(t => t.is_primary_station) || trainingData[0];

    const position = Object.keys(POSITION_TO_STATION_MAP).find(
      key => POSITION_TO_STATION_MAP[key] === bestTraining.station_name
    ) || '';

    return {
      position,
      stationName: bestTraining.station_name,
      reason: bestTraining.is_primary_station ? 'Primary station' : 'Trained station'
    };
  } catch (error) {
    console.error('Error suggesting optimal position:', error);
    return { position: '', reason: 'Error occurred' };
  }
}

export async function getAvailableStaffForPosition(position, date, shiftType, minimumRating = 5) {
  try {
    const stationName = POSITION_TO_STATION_MAP[position];

    if (!stationName) {
      return { data: [], error: null };
    }

    const { data: trainedStaff, error } = await getTrainedStaffForStation(
      stationName,
      minimumRating,
      false
    );

    if (error) throw error;

    const { data: existingDeployments } = await supabase
      .from('deployments')
      .select('staff_id')
      .eq('date', date)
      .eq('shift_type', shiftType);

    const deployedStaffIds = new Set(
      existingDeployments?.map(d => d.staff_id) || []
    );

    const availableStaff = trainedStaff.filter(
      staff => !deployedStaffIds.has(staff.staff_id)
    );

    return { data: availableStaff, error: null };
  } catch (error) {
    console.error('Error getting available staff for position:', error);
    return { data: [], error };
  }
}

export async function validateDeploymentQualifications(staffId, position, requireSignOff = false) {
  try {
    const stationName = POSITION_TO_STATION_MAP[position];

    if (!stationName) {
      return {
        qualified: true,
        reason: 'Position does not require specific station training'
      };
    }

    const { data: training } = await supabase
      .from('staff_training_stations')
      .select('is_trained')
      .eq('staff_id', staffId)
      .eq('station_name', stationName)
      .maybeSingle();

    if (!training || !training.is_trained) {
      return {
        qualified: false,
        reason: `Not trained on ${stationName}`
      };
    }

    if (requireSignOff) {
      const { data: signOff } = await supabase
        .from('staff_sign_offs')
        .select('id')
        .eq('staff_id', staffId)
        .eq('station_name', stationName)
        .maybeSingle();

      if (!signOff) {
        return {
          qualified: false,
          reason: `No manager sign-off for ${stationName}`
        };
      }
    }

    return {
      qualified: true,
      reason: 'Qualified'
    };
  } catch (error) {
    console.error('Error validating deployment qualifications:', error);
    return {
      qualified: false,
      reason: 'Error validating qualifications'
    };
  }
}

/**
 * Get configuration for intelligent assignment
 */
export async function getAssignmentConfig() {
  const { data, error } = await supabase
    .from('deployment_auto_assignment_config')
    .select('*')
    .eq('config_name', 'default')
    .maybeSingle();

  if (error) {
    console.error('Error getting assignment config:', error);
    return {
      enabled: true,
      use_training_stations: true,
      use_rankings: true,
      use_default_positions: true,
      min_ranking_threshold: 3.0,
      prefer_signed_off_only: false
    };
  }

  return data || {
    enabled: true,
    use_training_stations: true,
    use_rankings: true,
    use_default_positions: true,
    min_ranking_threshold: 3.0,
    prefer_signed_off_only: false
  };
}

/**
 * Update assignment configuration
 */
export async function updateAssignmentConfig(updates) {
  const { data, error } = await supabase
    .from('deployment_auto_assignment_config')
    .update(updates)
    .eq('config_name', 'default')
    .select()
    .maybeSingle();

  if (error) throw error;
  return data;
}
