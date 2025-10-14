import { supabase } from '../lib/supabase';
import { getTrainedStaffForStation } from './trainingManager';

const POSITION_TO_STATION_MAP = {
  'Cook': 'BOH Cook',
  'Cook2': 'BOH Cook2',
  'DT': 'DT Order Taker',
  'DT2': 'DT Window',
  'Front': 'FOH Cashier',
  'Mid': 'FOH Pack',
  'Lobby': 'Lobby',
  'DT Pack': 'FOH Pack',
  'Rst Pack': 'FOH Pack',
  'Burgers': 'MOH Burgers',
  'Fries': 'MOH Sides',
  'Chick': 'MOH Chicken Pack'
};

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
