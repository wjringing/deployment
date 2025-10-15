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
  const diagnostics = {
    startTime: new Date().toISOString(),
    date,
    shiftType,
    steps: [],
    staffProcessing: []
  };

  console.group(`🚀 AUTO-ASSIGNMENT DIAGNOSTICS: ${date} - ${shiftType}`);

  try {
    diagnostics.steps.push({ step: 'Loading config', time: new Date().toISOString() });

    const { data: oldConfig } = await supabase
      .from('deployment_auto_assignment_config')
      .select('*')
      .eq('config_name', 'default')
      .maybeSingle();

    console.log('📋 Config loaded:', oldConfig);
    diagnostics.config = oldConfig;

    if (!oldConfig || !oldConfig.enabled) {
      console.warn('⚠️ Auto-assignment is DISABLED');
      console.groupEnd();
      return {
        error: 'Auto-assignment is disabled',
        assigned: [],
        skipped: [],
        failed: [],
        diagnostics
      };
    }

    diagnostics.steps.push({ step: 'Loading shift info', time: new Date().toISOString() });

    const { data: shiftInfo } = await supabase
      .from('shift_info')
      .select('*')
      .eq('date', date)
      .maybeSingle();

    console.log('📊 Shift info:', shiftInfo);
    diagnostics.shiftInfo = shiftInfo;

    diagnostics.steps.push({ step: 'Building assignment context', time: new Date().toISOString() });

    const { config: dynamicConfig, context, appliedRules } = await buildAssignmentContext(
      date,
      shiftType,
      shiftInfo
    );

    console.log('⚙️ Dynamic config:', dynamicConfig);
    console.log('📜 Applied rules:', appliedRules.map(r => r.rule_name));
    diagnostics.dynamicConfig = dynamicConfig;
    diagnostics.appliedRules = appliedRules;

    if (userConfig) {
      Object.assign(dynamicConfig, userConfig);
      console.log('🔧 User config override applied:', userConfig);
    }

    diagnostics.steps.push({ step: 'Getting required positions', time: new Date().toISOString() });

    const requiredPositions = await getRequiredPositionsByConfig(date, shiftType, dynamicConfig);
    console.log('✅ Required positions:', requiredPositions);
    diagnostics.requiredPositions = requiredPositions;

    diagnostics.steps.push({ step: 'Loading deployments', time: new Date().toISOString() });

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

    console.log(`👥 Found ${deployments?.length || 0} deployments to process`);
    diagnostics.deploymentsCount = deployments?.length || 0;

    const results = {
      assigned: [],
      skipped: [],
      failed: [],
      config: dynamicConfig,
      appliedRules: appliedRules.map(r => r.rule_name),
      requiredPositions: requiredPositions.map(rp => `${rp.position} (${rp.source})`),
      diagnostics
    };

    console.log('\n👤 Processing staff assignments...');
    diagnostics.steps.push({ step: 'Processing staff', time: new Date().toISOString() });

    for (const deployment of deployments || []) {
      const staffDiag = {
        staffName: deployment.staff.name,
        staffId: deployment.staff.id,
        deploymentId: deployment.id,
        steps: []
      };

      console.group(`\n👤 ${deployment.staff.name}`);

      try {
        staffDiag.steps.push('Finding best position');
        console.log('🔍 Finding best position...');

        const position = await findBestPositionForStaff(
          deployment.staff,
          deployment,
          oldConfig,
          dynamicConfig,
          shiftType
        );

        console.log('📍 Best position found:', position);
        staffDiag.positionFound = position;

        if (position) {
          if (isPositionExcluded(position.name, dynamicConfig)) {
            console.warn(`⚠️ Position ${position.name} is EXCLUDED by configuration`);
            staffDiag.result = 'excluded';
            staffDiag.reason = `Position ${position.name} is excluded`;
            results.skipped.push({
              staffName: deployment.staff.name,
              reason: `Position ${position.name} is excluded by configuration`
            });
            diagnostics.staffProcessing.push(staffDiag);
            console.groupEnd();
            continue;
          }

          const updateData = { position: position.name };
          staffDiag.primaryPosition = position.name;
          staffDiag.primaryScore = position.score;
          staffDiag.primarySource = position.source;

          console.log('🔄 Looking for secondary position...');
          const secondaryPosition = await findSecondaryPosition(deployment.staff.id, position.name, date, shiftType);
          if (secondaryPosition) {
            updateData.secondary_position = secondaryPosition;
            console.log(`✅ Secondary position: ${secondaryPosition}`);
            staffDiag.secondaryPosition = secondaryPosition;
          } else {
            console.log('❌ No secondary position found');
            staffDiag.secondaryPosition = null;
          }

          if (shiftType === 'Night Shift' || shiftType === 'closing') {
            console.log('🌙 Processing closing position (Night Shift)...');
            const closingPosition = await findClosingPosition(deployment.staff.id, date, shiftType);
            if (closingPosition) {
              updateData.closing_position = closingPosition;
              console.log(`✅ Closing position: ${closingPosition}`);
              staffDiag.closingPosition = closingPosition;
            } else {
              console.log('❌ No closing position found');
              staffDiag.closingPosition = null;
            }

            if (position.requiresClosing) {
              updateData.is_closing_duty = true;
              updateData.closing_validated = position.closingValidated || false;
              console.log(`🔒 Closing duty required: validated=${position.closingValidated || false}`);
              staffDiag.closingDuty = true;
              staffDiag.closingValidated = position.closingValidated || false;
            }
          }

          console.log('💾 Updating deployment with:', updateData);
          const { error: updateError } = await supabase
            .from('deployments')
            .update(updateData)
            .eq('id', deployment.id);

          if (updateError) throw updateError;

          console.log('✅ Successfully assigned!');
          staffDiag.result = 'success';

          results.assigned.push({
            staffName: deployment.staff.name,
            position: position.name,
            secondaryPosition: updateData.secondary_position || null,
            closingPosition: updateData.closing_position || null,
            score: position.score,
            source: position.source,
            closingDuty: updateData.is_closing_duty || false,
            closingValidated: updateData.closing_validated || false
          });
        } else {
          console.warn('⚠️ No suitable position found');
          staffDiag.result = 'no_position';
          results.skipped.push({
            staffName: deployment.staff.name,
            reason: 'No suitable position found'
          });
        }
      } catch (error) {
        console.error('❌ Error assigning deployment:', error);
        staffDiag.result = 'error';
        staffDiag.error = error.message;
        results.failed.push({
          staffName: deployment.staff?.name,
          error: error.message
        });
      }

      diagnostics.staffProcessing.push(staffDiag);
      console.groupEnd();
    }

    diagnostics.endTime = new Date().toISOString();
    diagnostics.summary = {
      assigned: results.assigned.length,
      skipped: results.skipped.length,
      failed: results.failed.length
    };

    console.log('\n📊 ASSIGNMENT SUMMARY:');
    console.log(`✅ Assigned: ${results.assigned.length}`);
    console.log(`⚠️ Skipped: ${results.skipped.length}`);
    console.log(`❌ Failed: ${results.failed.length}`);
    console.groupEnd();

    return results;
  } catch (error) {
    console.error('Error in intelligent auto deployment:', error);
    throw error;
  }
}

async function findBestPositionForStaff(staff, deployment, config, dynamicConfig, shiftType) {
  const candidates = [];

  console.log(`  ⚙️ Config: use_default=${config.use_default_positions}, use_training=${config.use_training_stations}`);

  if (config.use_default_positions) {
    console.log('  🔍 Looking for default position candidates...');
    const defaultCandidates = await getDefaultPositionCandidates(
      staff.id,
      deployment.shift_type,
      deployment.date,
      dynamicConfig
    );
    console.log(`  📍 Default candidates found: ${defaultCandidates.length}`, defaultCandidates.map(c => `${c.name} (score: ${c.score})`));
    candidates.push(...defaultCandidates);
  }

  if (config.use_training_stations && candidates.length === 0) {
    console.log('  🎓 Looking for training-based candidates...');
    const trainingCandidates = await getTrainingBasedCandidates(
      staff.id,
      deployment.shift_type,
      deployment.date,
      config,
      dynamicConfig
    );
    console.log(`  📍 Training candidates found: ${trainingCandidates.length}`, trainingCandidates.map(c => `${c.name} (score: ${c.score})`));
    candidates.push(...trainingCandidates);
  }

  console.log(`  📊 Total candidates before validation: ${candidates.length}`);

  if (shiftType === 'Night Shift') {
    console.log('  🌙 Validating closing training for Night Shift...');
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
          console.log(`    🔒 Position ${candidate.name} requires closing training`);
          const validation = await validateClosingTraining(staff.id, position.id);
          candidate.closingValidated = validation.qualified;

          if (!validation.qualified) {
            console.log(`    ❌ Closing training NOT validated - score penalty -500`);
            candidate.score -= 500;
          } else {
            console.log(`    ✅ Closing training validated - score bonus +100`);
            candidate.score += 100;
          }
        }
      }
    }
  }

  candidates.sort((a, b) => b.score - a.score);

  console.log('  🏆 Sorted candidates (best first):');
  candidates.slice(0, 3).forEach((c, i) => {
    console.log(`    ${i + 1}. ${c.name} - Score: ${c.score} (${c.source})`);
  });

  const winner = candidates[0] || null;
  if (winner) {
    console.log(`  ✅ Winner: ${winner.name} with score ${winner.score}`);
  } else {
    console.log('  ❌ No suitable candidate found');
  }

  return winner;
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

/**
 * Find secondary position for staff based on position mappings
 */
async function findSecondaryPosition(staffId, primaryPositionName, date, shiftType) {
  try {
    const { data: primaryPos } = await supabase
      .from('positions')
      .select('id')
      .eq('name', primaryPositionName)
      .eq('type', 'position')
      .maybeSingle();

    if (!primaryPos) return null;

    const { data: mappings } = await supabase
      .from('position_secondary_mappings')
      .select(`
        priority,
        secondary_position:secondary_position_id (
          id,
          name
        )
      `)
      .eq('primary_position_id', primaryPos.id)
      .eq('is_enabled', true)
      .eq('auto_deploy', true)
      .or(`shift_type.eq.${shiftType},shift_type.eq.Both`)
      .order('priority');

    if (!mappings || mappings.length === 0) {
      return null;
    }

    for (const mapping of mappings) {
      const secondaryPosName = mapping.secondary_position?.name;
      if (!secondaryPosName || secondaryPosName === primaryPositionName) continue;

      const available = await isPositionAvailable(secondaryPosName, date, shiftType);
      if (available) {
        return secondaryPosName;
      }
    }

    return mappings[0]?.secondary_position?.name || null;
  } catch (error) {
    console.error('Error finding secondary position:', error);
    return null;
  }
}

/**
 * Find closing position for staff based on their closing training
 */
async function findClosingPosition(staffId, date, shiftType) {
  try {
    console.log(`  🔍 Finding closing position for staff ${staffId}...`);

    const { data: closingTraining, error: trainingError } = await supabase
      .from('staff_closing_training')
      .select(`
        position:position_id (
          id,
          name
        )
      `)
      .eq('staff_id', staffId)
      .eq('is_trained', true);

    if (trainingError) {
      console.error('  ❌ Error loading closing training:', trainingError);
      return null;
    }

    console.log(`  📚 Closing training records:`, closingTraining);

    if (!closingTraining || closingTraining.length === 0) {
      console.log('  ⚠️ No closing training found for this staff member');
      return null;
    }

    const trainedPositionIds = closingTraining
      .map(ct => ct.position?.id)
      .filter(Boolean);

    console.log(`  ✅ Trained for closing positions:`, closingTraining.map(ct => ct.position?.name));
    console.log(`  🆔 Position IDs:`, trainedPositionIds);

    if (trainedPositionIds.length === 0) {
      console.log('  ⚠️ No valid position IDs found');
      return null;
    }

    const { data: closingConfig, error: configError } = await supabase
      .from('closing_position_config')
      .select(`
        deployable_position:deployable_position_id (
          id,
          name
        ),
        cleaning_area_position_id,
        priority
      `)
      .in('cleaning_area_position_id', trainedPositionIds)
      .eq('is_active', true)
      .or(`shift_type.eq.${shiftType},shift_type.eq.Night Shift,shift_type.eq.Both`)
      .order('priority')
      .limit(1)
      .maybeSingle();

    if (configError) {
      console.error('  ❌ Error loading closing config:', configError);
      return null;
    }

    console.log(`  ⚙️ Closing config found:`, closingConfig);

    const result = closingConfig?.deployable_position?.name || null;
    if (result) {
      console.log(`  ✅ Closing position assigned: ${result}`);
    } else {
      console.log('  ⚠️ No closing position config matched');
    }

    return result;
  } catch (error) {
    console.error('  ❌ Error finding closing position:', error);
    return null;
  }
}
