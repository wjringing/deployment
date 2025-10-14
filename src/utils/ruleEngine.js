import { supabase } from '../lib/supabase';

export async function getShiftConfiguration(shiftType, date = null) {
  try {
    let query = supabase
      .from('shift_configuration_rules')
      .select('*')
      .eq('config_name', 'default')
      .eq('is_active', true)
      .or(`shift_type.eq.${shiftType},shift_type.eq.Both`)
      .order('created_at', { ascending: false });

    if (date) {
      query = query.or(`effective_date.is.null,effective_date.lte.${date}`);
    }

    const { data, error } = await query.limit(1).maybeSingle();

    if (error) throw error;

    return data || {
      dt_type: 'DT1',
      num_cooks: 1,
      num_pack_stations: 2,
      require_shift_runner: true,
      require_manager: true,
      additional_settings: {}
    };
  } catch (error) {
    console.error('Error getting shift configuration:', error);
    return {
      dt_type: 'DT1',
      num_cooks: 1,
      num_pack_stations: 2,
      require_shift_runner: true,
      require_manager: true,
      additional_settings: {}
    };
  }
}

export async function getCorePositions(shiftType) {
  try {
    const { data, error } = await supabase
      .from('core_positions')
      .select(`
        *,
        positions (
          id,
          name
        )
      `)
      .eq('is_active', true)
      .or(`shift_type.eq.${shiftType},shift_type.eq.Both`)
      .order('priority');

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error getting core positions:', error);
    return [];
  }
}

export async function getConditionalRules() {
  try {
    const { data, error } = await supabase
      .from('conditional_staffing_rules')
      .select('*')
      .eq('is_active', true)
      .order('priority');

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error getting conditional rules:', error);
    return [];
  }
}

export function evaluateCondition(condition, context) {
  try {
    if (!condition || typeof condition !== 'object') {
      return false;
    }

    if (condition.and) {
      return condition.and.every(c => evaluateCondition(c, context));
    }

    if (condition.or) {
      return condition.or.some(c => evaluateCondition(c, context));
    }

    if (condition.not) {
      return !evaluateCondition(condition.not, context);
    }

    for (const [key, value] of Object.entries(condition)) {
      const contextValue = context[key];

      if (typeof value === 'object') {
        if (value.eq !== undefined && contextValue !== value.eq) return false;
        if (value.ne !== undefined && contextValue === value.ne) return false;
        if (value.gt !== undefined && !(contextValue > value.gt)) return false;
        if (value.gte !== undefined && !(contextValue >= value.gte)) return false;
        if (value.lt !== undefined && !(contextValue < value.lt)) return false;
        if (value.lte !== undefined && !(contextValue <= value.lte)) return false;
        if (value.in !== undefined && !value.in.includes(contextValue)) return false;
        if (value.nin !== undefined && value.nin.includes(contextValue)) return false;
      } else {
        if (contextValue !== value) return false;
      }
    }

    return true;
  } catch (error) {
    console.error('Error evaluating condition:', error);
    return false;
  }
}

export function applyConditionalRules(rules, config, context) {
  const appliedRules = [];
  const modifiedConfig = { ...config };

  for (const rule of rules) {
    if (!rule.is_active) continue;

    if (evaluateCondition(rule.condition, context)) {
      appliedRules.push(rule);

      if (rule.action && typeof rule.action === 'object') {
        if (rule.action.require_position) {
          if (!modifiedConfig.required_positions) {
            modifiedConfig.required_positions = [];
          }
          modifiedConfig.required_positions.push({
            position: rule.action.require_position,
            count: rule.action.count || 1,
            source: rule.rule_name
          });
        }

        if (rule.action.exclude_position) {
          if (!modifiedConfig.excluded_positions) {
            modifiedConfig.excluded_positions = [];
          }
          modifiedConfig.excluded_positions.push(rule.action.exclude_position);
        }

        if (rule.action.adjust_position_count) {
          if (!modifiedConfig.position_adjustments) {
            modifiedConfig.position_adjustments = {};
          }
          Object.assign(modifiedConfig.position_adjustments, rule.action.adjust_position_count);
        }
      }
    }
  }

  return { modifiedConfig, appliedRules };
}

export async function buildAssignmentContext(date, shiftType, shiftInfo = null) {
  const config = await getShiftConfiguration(shiftType, date);

  const dateObj = new Date(date);
  const dayOfWeek = dateObj.toLocaleDateString('en-US', { weekday: 'long' });

  let forecast = 0;
  if (shiftInfo) {
    const forecastStr = shiftType === 'Day Shift'
      ? shiftInfo.day_shift_forecast
      : shiftInfo.night_shift_forecast;
    forecast = parseFloat(forecastStr?.replace(/[£,]/g, '') || '0');
  }

  const context = {
    date,
    day_of_week: dayOfWeek,
    shift_type: shiftType,
    dt_type: config.dt_type,
    num_cooks: config.num_cooks,
    num_pack_stations: config.num_pack_stations,
    require_shift_runner: config.require_shift_runner,
    require_manager: config.require_manager,
    forecast,
    ...config.additional_settings
  };

  const rules = await getConditionalRules();
  const { modifiedConfig, appliedRules } = applyConditionalRules(rules, config, context);

  return {
    config: modifiedConfig,
    context,
    appliedRules
  };
}

export async function getRequiredPositionsByConfig(date, shiftType, shiftConfig) {
  const requiredPositions = [];

  const corePositions = await getCorePositions(shiftType);
  for (const cp of corePositions) {
    if (cp.is_mandatory && cp.positions?.name) {
      requiredPositions.push({
        position: cp.positions.name,
        min_count: cp.min_count,
        max_count: cp.max_count,
        priority: cp.priority,
        source: 'core'
      });
    }
  }

  if (shiftConfig.required_positions) {
    requiredPositions.push(...shiftConfig.required_positions);
  }

  if (shiftConfig.dt_type === 'DT1') {
    const hasDTPresenter = requiredPositions.some(rp => rp.position === 'DT Presenter');
    if (!hasDTPresenter) {
      requiredPositions.push({
        position: 'DT Presenter',
        min_count: 1,
        max_count: 1,
        priority: 10,
        source: 'dt1_config'
      });
    }
  }

  if (shiftConfig.num_cooks > 0) {
    const cookPositions = requiredPositions.filter(rp => rp.position === 'Cook' || rp.position === 'Cook2');
    if (cookPositions.length === 0) {
      for (let i = 0; i < shiftConfig.num_cooks; i++) {
        requiredPositions.push({
          position: i === 0 ? 'Cook' : `Cook${i + 1}`,
          min_count: 1,
          max_count: 1,
          priority: 5,
          source: 'cook_config'
        });
      }
    }
  }

  if (shiftConfig.require_shift_runner) {
    const hasShiftRunner = requiredPositions.some(rp =>
      rp.position.toLowerCase().includes('shift runner') ||
      rp.position.toLowerCase().includes('sr')
    );
    if (!hasShiftRunner) {
      requiredPositions.push({
        position: 'Shift Runner',
        min_count: 1,
        max_count: 1,
        priority: 3,
        source: 'shift_runner_config'
      });
    }
  }

  if (shiftConfig.require_manager) {
    const hasManager = requiredPositions.some(rp =>
      rp.position.toLowerCase().includes('manager') ||
      rp.position.toLowerCase().includes('am')
    );
    if (!hasManager) {
      requiredPositions.push({
        position: 'Manager',
        min_count: 1,
        max_count: 1,
        priority: 2,
        source: 'manager_config'
      });
    }
  }

  return requiredPositions.sort((a, b) => a.priority - b.priority);
}

export function isPositionExcluded(position, config) {
  if (!config.excluded_positions) return false;
  return config.excluded_positions.some(ep =>
    ep.toLowerCase() === position.toLowerCase()
  );
}

export function getPositionCountAdjustment(position, config) {
  if (!config.position_adjustments) return 0;
  return config.position_adjustments[position] || 0;
}

export async function validateConfigurationBeforeAssignment(date, shiftType, config) {
  const errors = [];
  const warnings = [];

  if (!config.dt_type) {
    warnings.push('Drive-through type not specified, defaulting to DT1');
  }

  if (config.num_cooks === 0) {
    warnings.push('No cooks configured for this shift');
  }

  if (!config.require_manager) {
    warnings.push('Manager is not required for this shift');
  }

  const { data: deployments } = await supabase
    .from('deployments')
    .select('id')
    .eq('date', date)
    .eq('shift_type', shiftType);

  if (!deployments || deployments.length === 0) {
    errors.push('No deployments found for this shift. Add staff deployments first.');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}
