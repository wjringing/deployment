import { supabase } from '../lib/supabase';

export async function getAllTrainingStations() {
  try {
    const { data, error } = await supabase
      .from('training_stations_master')
      .select('*')
      .eq('is_active', true)
      .order('sort_order');

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching training stations:', error);
    return { data: null, error };
  }
}

export async function getStaffTrainingData(staffId) {
  try {
    const { data, error } = await supabase
      .from('staff_training_stations')
      .select('*')
      .eq('staff_id', staffId)
      .order('station_name');

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching staff training data:', error);
    return { data: null, error };
  }
}

export async function getAllStaffTrainingOverview() {
  try {
    const { data, error } = await supabase
      .from('v_staff_training_overview')
      .select('*')
      .order('staff_name');

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching staff training overview:', error);
    return { data: null, error };
  }
}

export async function toggleStaffTraining(staffId, stationName, isTrained, jobCode = 'Team Member') {
  try {
    const updateData = {
      staff_id: staffId,
      station_name: stationName,
      is_trained: isTrained,
      trained_date: isTrained ? new Date().toISOString() : null,
      job_code: jobCode,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('staff_training_stations')
      .upsert(updateData, {
        onConflict: 'staff_id,station_name'
      })
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error toggling staff training:', error);
    return { data: null, error };
  }
}

export async function setPrimaryStation(staffId, stationName) {
  try {
    await supabase
      .from('staff_training_stations')
      .update({ is_primary_station: false })
      .eq('staff_id', staffId);

    const { data, error } = await supabase
      .from('staff_training_stations')
      .update({ is_primary_station: true })
      .eq('staff_id', staffId)
      .eq('station_name', stationName)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error setting primary station:', error);
    return { data: null, error };
  }
}

export async function addStaffRanking(staffId, raterStaffId, stationName, rating, notes = '') {
  try {
    const { data, error } = await supabase
      .from('staff_rankings')
      .upsert({
        staff_id: staffId,
        rater_staff_id: raterStaffId,
        station_name: stationName,
        rating: rating,
        rating_notes: notes,
        rating_date: new Date().toISOString()
      }, {
        onConflict: 'staff_id,rater_staff_id,station_name'
      })
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error adding staff ranking:', error);
    return { data: null, error };
  }
}

export async function getStaffRankings(staffId) {
  try {
    const { data, error } = await supabase
      .from('staff_rankings')
      .select('*')
      .eq('staff_id', staffId)
      .order('rating_date', { ascending: false });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching staff rankings:', error);
    return { data: null, error };
  }
}

export async function addStaffSignOff(staffId, managerStaffId, stationName, notes = '') {
  try {
    const { data, error} = await supabase
      .from('staff_sign_offs')
      .insert({
        staff_id: staffId,
        manager_staff_id: managerStaffId,
        station_name: stationName,
        sign_off_notes: notes,
        sign_off_date: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error adding staff sign-off:', error);
    return { data: null, error };
  }
}

export async function getStaffSignOffs(staffId) {
  try {
    const { data, error } = await supabase
      .from('staff_sign_offs')
      .select('*')
      .eq('staff_id', staffId)
      .order('sign_off_date', { ascending: false });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching staff sign-offs:', error);
    return { data: null, error };
  }
}

export async function getStationCoverage() {
  try {
    const { data, error } = await supabase
      .from('v_station_coverage')
      .select('*')
      .order('station_category, display_name');

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching station coverage:', error);
    return { data: null, error };
  }
}

export async function getTrainedStaffForStation(stationName, minimumRating = 1, excludeUnder18 = false) {
  try {
    const { data, error } = await supabase
      .rpc('get_trained_staff_for_station', {
        target_station: stationName,
        minimum_rating: minimumRating,
        exclude_under_18: excludeUnder18
      });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching trained staff for station:', error);
    return { data: null, error };
  }
}
