import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useLocation } from '../contexts/LocationContext';
import { useAuth } from '../contexts/AuthContext';

export const useLocationData = () => {
  const { currentLocation } = useLocation();
  const { isSuperAdmin } = useAuth();

  const [staff, setStaff] = useState([]);
  const [positions, setPositions] = useState([]);
  const [deploymentsByDate, setDeploymentsByDate] = useState({});
  const [shiftInfoByDate, setShiftInfoByDate] = useState({});
  const [salesRecordsByDate, setSalesRecordsByDate] = useState({});
  const [targets, setTargets] = useState([]);
  const [templateShifts, setTemplateShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const locationId = currentLocation?.id;

  const loadAllData = useCallback(async () => {
    if (!locationId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      await Promise.all([
        loadStaff(),
        loadPositions(),
        loadDeployments(),
        loadShiftInfo(),
        loadSalesRecords(),
        loadTargets(),
        loadTemplateShifts()
      ]);
    } catch (err) {
      console.error('Error loading data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [locationId]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  const loadStaff = async () => {
    let query = supabase
      .from('staff')
      .select('*')
      .order('name');

    if (!isSuperAdmin() && locationId) {
      query = query.eq('location_id', locationId);
    }

    const { data, error } = await query;

    if (error) throw error;
    setStaff(data || []);
  };

  const loadPositions = async () => {
    let query = supabase
      .from('positions')
      .select('*')
      .order('name');

    if (!isSuperAdmin() && locationId) {
      query = query.eq('location_id', locationId);
    }

    const { data, error } = await query;

    if (error) throw error;
    setPositions(data || []);
  };

  const loadDeployments = async () => {
    let query = supabase
      .from('deployments')
      .select(`
        *,
        staff:staff_id (
          id,
          name,
          is_under_18
        )
      `)
      .order('date', { ascending: false });

    if (!isSuperAdmin() && locationId) {
      query = query.eq('location_id', locationId);
    }

    const { data, error } = await query;

    if (error) throw error;

    const grouped = {};
    data?.forEach(deployment => {
      if (!grouped[deployment.date]) {
        grouped[deployment.date] = [];
      }
      grouped[deployment.date].push(deployment);
    });

    setDeploymentsByDate(grouped);
  };

  const loadShiftInfo = async () => {
    let query = supabase
      .from('shift_info')
      .select('*')
      .order('date', { ascending: false });

    if (!isSuperAdmin() && locationId) {
      query = query.eq('location_id', locationId);
    }

    const { data, error } = await query;

    if (error) throw error;

    const grouped = {};
    data?.forEach(info => {
      grouped[info.date] = info;
    });

    setShiftInfoByDate(grouped);
  };

  const loadSalesRecords = async () => {
    let query = supabase
      .from('sales_records')
      .select('*')
      .order('date', { ascending: false })
      .order('time');

    if (!isSuperAdmin() && locationId) {
      query = query.eq('location_id', locationId);
    }

    const { data, error } = await query;

    if (error) throw error;

    const grouped = {};
    data?.forEach(record => {
      if (!grouped[record.date]) {
        grouped[record.date] = [];
      }
      grouped[record.date].push(record);
    });

    setSalesRecordsByDate(grouped);
  };

  const loadTargets = async () => {
    let query = supabase
      .from('targets')
      .select('*')
      .eq('is_active', true)
      .order('priority');

    if (!isSuperAdmin() && locationId) {
      query = query.eq('location_id', locationId);
    }

    const { data, error } = await query;

    if (error) throw error;
    setTargets(data || []);
  };

  const loadTemplateShifts = async () => {
    let query = supabase
      .from('template_shifts')
      .select('*')
      .order('name');

    if (!isSuperAdmin() && locationId) {
      query = query.eq('location_id', locationId);
    }

    const { data, error } = await query;

    if (error) throw error;
    setTemplateShifts(data || []);
  };

  const addStaff = async (staffData) => {
    const dataWithLocation = { ...staffData, location_id: locationId };
    const { data, error } = await supabase
      .from('staff')
      .insert([dataWithLocation])
      .select()
      .single();

    if (error) throw error;
    await loadStaff();
    return data;
  };

  const removeStaff = async (id) => {
    const { error } = await supabase
      .from('staff')
      .delete()
      .eq('id', id);

    if (error) throw error;
    await loadStaff();
  };

  const addPosition = async (positionData) => {
    const dataWithLocation = { ...positionData, location_id: locationId };
    const { data, error } = await supabase
      .from('positions')
      .insert([dataWithLocation])
      .select()
      .single();

    if (error) throw error;
    await loadPositions();
    return data;
  };

  const removePosition = async (id) => {
    const { error } = await supabase
      .from('positions')
      .delete()
      .eq('id', id);

    if (error) throw error;
    await loadPositions();
  };

  const updatePosition = async (id, updates) => {
    const { error } = await supabase
      .from('positions')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
    await loadPositions();
  };

  const addDeployment = async (deploymentData) => {
    const dataWithLocation = { ...deploymentData, location_id: locationId };
    const { data, error } = await supabase
      .from('deployments')
      .insert([dataWithLocation])
      .select()
      .single();

    if (error) throw error;
    await loadDeployments();
    return data;
  };

  const removeDeployment = async (id) => {
    const { error } = await supabase
      .from('deployments')
      .delete()
      .eq('id', id);

    if (error) throw error;
    await loadDeployments();
  };

  const updateDeployment = async (id, updates) => {
    const { error } = await supabase
      .from('deployments')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
    await loadDeployments();
  };

  const updateShiftInfo = async (date, updates) => {
    const dataWithLocation = { ...updates, date, location_id: locationId };
    const { error } = await supabase
      .from('shift_info')
      .upsert(dataWithLocation, { onConflict: 'date,location_id' });

    if (error) throw error;
    await loadShiftInfo();
  };

  const deleteAllDeployments = async (date) => {
    let query = supabase
      .from('deployments')
      .delete()
      .eq('date', date);

    if (!isSuperAdmin() && locationId) {
      query = query.eq('location_id', locationId);
    }

    const { error } = await query;

    if (error) throw error;
    await loadDeployments();
  };

  const duplicateDeployments = async (fromDate, toDate) => {
    let query = supabase
      .from('deployments')
      .select('*')
      .eq('date', fromDate);

    if (!isSuperAdmin() && locationId) {
      query = query.eq('location_id', locationId);
    }

    const { data, error } = await query;

    if (error) throw error;

    if (data && data.length > 0) {
      const newDeployments = data.map(d => {
        const { id, created_at, updated_at, ...rest } = d;
        return {
          ...rest,
          date: toDate,
          location_id: locationId
        };
      });

      const { error: insertError } = await supabase
        .from('deployments')
        .insert(newDeployments);

      if (insertError) throw insertError;
      await loadDeployments();
    }
  };

  const getPositionsByType = (type) => {
    return positions.filter(p => p.type === type);
  };

  const calculateForecastTotals = (date) => {
    const info = shiftInfoByDate[date];
    if (!info) return { day: 0, night: 0, total: 0 };

    const parseAmount = (str) => {
      if (!str) return 0;
      const cleaned = str.replace(/[£,]/g, '');
      return parseFloat(cleaned) || 0;
    };

    const day = parseAmount(info.day_shift_forecast);
    const night = parseAmount(info.night_shift_forecast);
    const total = parseAmount(info.forecast);

    return { day, night, total };
  };

  return {
    staff,
    positions,
    deploymentsByDate,
    shiftInfoByDate,
    salesRecordsByDate,
    targets,
    templateShifts,
    loading,
    error,
    locationId,
    locationName: currentLocation?.location_name || '',
    addStaff,
    removeStaff,
    addPosition,
    removePosition,
    updatePosition,
    addDeployment,
    removeDeployment,
    updateDeployment,
    updateShiftInfo,
    deleteAllDeployments,
    duplicateDeployments,
    getPositionsByType,
    calculateForecastTotals,
    loadAllData,
  };
};
