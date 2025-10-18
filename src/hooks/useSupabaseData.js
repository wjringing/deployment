import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export const useSupabaseData = () => {
  const [staff, setStaff] = useState([]);
  const [positions, setPositions] = useState([]);
  const [deploymentsByDate, setDeploymentsByDate] = useState({});
  const [shiftInfoByDate, setShiftInfoByDate] = useState({});
  const [salesRecordsByDate, setSalesRecordsByDate] = useState({});
  const [targets, setTargets] = useState([]);
  const [templateShifts, setTemplateShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load initial data
  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
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
      console.error('Error loading data:', err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadStaff = async () => {
    const { data, error } = await supabase
      .from('staff')
      .select('*')
      .order('name');
    
    if (error) throw error;
    setStaff(data || []);
  };

  const loadPositions = async () => {
    const { data, error } = await supabase
      .from('positions')
      .select('*')
      .order('name');
    
    if (error) throw error;
    setPositions(data || []);
  };

  const loadDeployments = async () => {
    const { data, error } = await supabase
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
    
    if (error) throw error;
    
    // Group deployments by date
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
    const { data, error } = await supabase
      .from('shift_info')
      .select('*')
      .order('date', { ascending: false });
    
    if (error) throw error;
    
    // Group shift info by date
    const grouped = {};
    data?.forEach(info => {
      grouped[info.date] = info;
    });
    
    setShiftInfoByDate(grouped);
  };

  const loadSalesRecords = async () => {
    const { data, error } = await supabase
      .from('sales_records')
      .select('*')
      .order('date', { ascending: false })
      .order('time');
    
    if (error) throw error;
    
    // Group sales records by date
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
    const { data, error } = await supabase
      .from('targets')
      .select('*')
      .eq('is_active', true)
      .order('priority');
    
    if (error) throw error;
    setTargets(data || []);
  };

  const loadTemplateShifts = async () => {
    const { data, error } = await supabase
      .from('template_shifts')
      .select('*')
      .eq('is_active', true)
      .order('shift_type', { ascending: true })
      .order('start_time', { ascending: true });
    
    if (error) throw error;
    
    // Convert database format to component format
    const formattedShifts = (data || []).map(shift => ({
      id: shift.id,
      name: shift.name,
      startTime: shift.start_time,
      endTime: shift.end_time,
      type: shift.shift_type
    }));
    
    setTemplateShifts(formattedShifts);
  };

  // Staff operations
  const addStaff = async (staffData) => {
    const { data, error } = await supabase
      .from('staff')
      .insert([staffData])
      .select()
      .single();
    
    if (error) throw error;
    
    setStaff(prev => [...prev, data]);
    return data;
  };

  const removeStaff = async (id) => {
    const { error } = await supabase
      .from('staff')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    
    setStaff(prev => prev.filter(s => s.id !== id));
    
    // Remove from deployments state (cascade delete should handle DB)
    setDeploymentsByDate(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(date => {
        updated[date] = updated[date].filter(d => d.staff_id !== id);
      });
      return updated;
    });
  };

  // Deployment operations
  const addDeployment = async (deploymentData) => {
    console.log('🚀 addDeployment called with data:', deploymentData);
    console.log('📊 Deployment data structure:', {
      keys: Object.keys(deploymentData),
      values: Object.values(deploymentData)
    });
    
    const { data, error } = await supabase
      .from('deployments')
      .insert([deploymentData])
      .select(`
        *,
        staff:staff_id (
          id,
          name,
          is_under_18
        )
      `)
      .single();
    
    console.log('📥 Supabase response - data:', data);
    console.log('❌ Supabase response - error:', error?.message);
    
    if (error) {
      console.error('💥 Database insertion failed:', error.message);
      console.error('🔍 Error details:', {
        message: error.message,
        code: error.code,
        details: error.details
      });
      throw error;
    }
    
    setDeploymentsByDate(prev => ({
      ...prev,
      [data.date]: [...(prev[data.date] || []), data]
    }));
    
    console.log('✅ Deployment successfully added to state');
    return data;
  };

  const removeDeployment = async (id) => {
    const { error } = await supabase
      .from('deployments')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    
    // Remove from state
    setDeploymentsByDate(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(date => {
        updated[date] = updated[date].filter(d => d.id !== id);
      });
      return updated;
    });
  };

  const updateDeployment = async (id, updates) => {
    const { data, error } = await supabase
      .from('deployments')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        staff:staff_id (
          id,
          name,
          is_under_18
        )
      `)
      .single();
    
    if (error) throw error;
    
    // Update state
    setDeploymentsByDate(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(date => {
        updated[date] = updated[date].map(d => d.id === id ? { ...d, ...data } : d);
      });
      return updated;
    });
    
    return data;
  };

  // Shift info operations
  const updateShiftInfo = async (date, shiftData) => {
    // Ensure we have a proper object with the correct structure
    const dataToUpsert = {
      date,
      forecast: shiftData.forecast || '£0.00',
      day_shift_forecast: shiftData.day_shift_forecast || shiftData.dayShiftForecast || '£0.00',
      night_shift_forecast: shiftData.night_shift_forecast || shiftData.nightShiftForecast || '£0.00',
      weather: shiftData.weather || '',
      notes: shiftData.notes || ''
    };

    const { data, error } = await supabase
      .from('shift_info')
      .upsert([dataToUpsert], { onConflict: 'date' })
      .select('id, date, forecast, day_shift_forecast, night_shift_forecast, weather, notes, created_at, updated_at')
      .single();
    
    if (error) throw error;
    
    setShiftInfoByDate(prev => ({
      ...prev,
      [date]: data
    }));
    
    return data;
  };

  const deleteShiftInfo = async (date) => {
    const { error } = await supabase
      .from('shift_info')
      .delete()
      .eq('date', date);
    
    if (error) throw error;
    
    setShiftInfoByDate(prev => {
      const updated = { ...prev };
      delete updated[date];
      return updated;
    });
  };

  // Sales records operations
  const updateSalesRecords = async (date, records) => {
    console.log('Updating sales records for date:', date, 'Records:', records); // Debug log
    
    // Delete existing records for this date
    const { error: deleteError } = await supabase
      .from('sales_records')
      .delete()
      .eq('date', date);
    
    if (deleteError) {
      console.error('Error deleting existing records:', deleteError.message);
      throw deleteError;
    }
    
    // Insert new records
    if (records && records.length > 0) {
      const recordsToInsert = records.map(record => ({
        date,
        time: record.time,
        forecast: parseFloat(record.forecast) || 0
      }));
      
      console.log('Inserting records:', recordsToInsert); // Debug log
      
      const { data, error } = await supabase
        .from('sales_records')
        .insert(recordsToInsert)
        .select('*');
      
      if (error) {
        console.error('Error inserting records:', error.message);
        throw error;
      }
      
      console.log('Successfully inserted records:', data); // Debug log
      
      setSalesRecordsByDate(prev => ({
        ...prev,
        [date]: data
      }));
      
      // Auto-update shift information with calculated forecasts
      await autoUpdateShiftForecasts(date, data);
      
      return data;
    } else {
      // No records to insert, just clear from state
      setSalesRecordsByDate(prev => {
        const updated = { ...prev };
        delete updated[date];
        return updated;
      });
      
      // Clear forecasts when no sales data
      await autoUpdateShiftForecasts(date, []);
      
      return [];
    }
  };

  const calculateForecastTotals = (date) => {
    const records = salesRecordsByDate[date] || [];
    
    console.log('Calculating totals for date:', date, 'Records:', records); // Debug log
    
    let totalForecast = 0;
    let dayShiftForecast = 0;
    let nightShiftForecast = 0;
    
    records.forEach(record => {
      const forecast = parseFloat(record.forecast) || 0;
      totalForecast += forecast;
      
      // Parse time to determine if it's day or night shift  
      const [hours, minutes] = record.time.split(':').map(Number);
      const timeInMinutes = hours * 60 + minutes;
      
      // Day shift is 10:00-16:00 (600-960 minutes), night shift is 16:00-23:00 (960-1380 minutes)
      if (timeInMinutes >= 600 && timeInMinutes < 960) {
        dayShiftForecast += forecast;
      } else if (timeInMinutes >= 960 && timeInMinutes < 1380) {
        nightShiftForecast += forecast;
      }
    });
    
    console.log('Calculated totals:', { total: totalForecast, dayShift: dayShiftForecast, nightShift: nightShiftForecast }); // Debug log
    
    return {
      total: totalForecast,
      dayShift: dayShiftForecast,
      nightShift: nightShiftForecast
    };
  };
  
  // Auto-update shift information forecasts based on sales data
  const autoUpdateShiftForecasts = async (date, salesRecords) => {
    try {
      console.log('Auto-updating shift forecasts for date:', date, 'with', salesRecords.length, 'records');
      
      // Calculate forecasts directly from provided sales records
      let totalForecast = 0;
      let dayShiftForecast = 0;
      let nightShiftForecast = 0;
      
      salesRecords.forEach(record => {
        const forecast = parseFloat(record.forecast) || 0;
        totalForecast += forecast;
        
        // Parse time to determine if it's day or night shift  
        const [hours, minutes] = record.time.split(':').map(Number);
        const timeInMinutes = hours * 60 + minutes;
        
        // Day shift is 10:00-16:00 (600-960 minutes), night shift is 16:00-23:00 (960-1380 minutes)
        if (timeInMinutes >= 600 && timeInMinutes < 960) {
          dayShiftForecast += forecast;
        } else if (timeInMinutes >= 960 && timeInMinutes < 1380) {
          nightShiftForecast += forecast;
        }
      });
      
      // Get existing shift info or create default
      const existingShiftInfo = shiftInfoByDate[date] || {
        weather: '',
        notes: ''
      };
      
      // Prepare updated shift info with calculated forecasts
      const updatedShiftInfo = {
        ...existingShiftInfo,
        forecast: `£${totalForecast.toFixed(2)}`,
        day_shift_forecast: `£${dayShiftForecast.toFixed(2)}`,
        night_shift_forecast: `£${nightShiftForecast.toFixed(2)}`
      };
      
      console.log('Calculated forecasts:', {
        total: totalForecast,
        dayShift: dayShiftForecast,
        nightShift: nightShiftForecast
      });
      
      // Update shift info in database
      const { data, error } = await supabase
        .from('shift_info')
        .upsert([{
          date,
          forecast: updatedShiftInfo.forecast,
          day_shift_forecast: updatedShiftInfo.day_shift_forecast,
          night_shift_forecast: updatedShiftInfo.night_shift_forecast,
          weather: updatedShiftInfo.weather,
          notes: updatedShiftInfo.notes
        }], { onConflict: 'date' })
        .select('*')
        .single();
      
      if (error) {
        console.error('Error updating shift forecasts:', error);
        throw error;
      }
      
      console.log('Successfully updated shift forecasts:', data);
      
      // Update local state immediately
      setShiftInfoByDate(prev => ({
        ...prev,
        [date]: data
      }));
      
      return {
        success: true,
        recordsProcessed: salesRecords.length,
        forecastsUpdated: {
          total: updatedShiftInfo.forecast,
          dayShift: updatedShiftInfo.day_shift_forecast,
          nightShift: updatedShiftInfo.night_shift_forecast
        },
        date: date
      };
      
    } catch (error) {
      console.error('Failed to auto-update shift forecasts:', error.message);
      throw new Error(`Failed to update shift forecasts: ${error.message}`);
    }
  };

  // Position operations
  const addPosition = async (positionData) => {
    const { data, error } = await supabase
      .from('positions')
      .insert([positionData])
      .select()
      .single();
    
    if (error) throw error;
    
    setPositions(prev => [...prev, data]);
    return data;
  };

  const removePosition = async (id) => {
    const { error } = await supabase
      .from('positions')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    
    setPositions(prev => prev.filter(p => p.id !== id));
  };

  const updatePosition = async (id, updates) => {
    const { data, error } = await supabase
      .from('positions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    
    setPositions(prev => prev.map(p => p.id === id ? data : p));
    return data;
  };

  // Helper functions
  const getPositionsByType = (type) => {
    return positions.filter(p => p.type === type).map(p => p.name);
  };

  const getDeploymentsByShift = (date, shiftType) => {
    const deployments = deploymentsByDate[date] || [];
    return deployments.filter(d => d.shift_type === shiftType);
  };

  const canAddDeployment = (date, shiftType) => {
    const existingDeployments = getDeploymentsByShift(date, shiftType);
    return existingDeployments.length < 2;
  };
  const getPositionsWithAreas = () => {
    return positions.map(position => {
      const area = positions.find(p => p.id === position.area_id);
      return {
        ...position,
        area_name: area ? area.name : null
      };
    });
  };

  const getAreaPositions = (areaId) => {
    return positions.filter(p => p.area_id === areaId);
  };

  const duplicateDeployments = async (fromDate, toDate) => {
    const deploymentsToCopy = deploymentsByDate[fromDate] || [];
    
    if (deploymentsToCopy.length === 0) return;
    
    // Group deployments by shift type to respect limits
    const dayShiftDeployments = deploymentsToCopy.filter(d => d.shift_type === 'Day Shift');
    const nightShiftDeployments = deploymentsToCopy.filter(d => d.shift_type === 'Night Shift');
    
    // Limit to 2 deployments per shift type
    const deploymentsToCreate = [
      ...dayShiftDeployments.slice(0, 2),
      ...nightShiftDeployments.slice(0, 2)
    ];

    // Create new deployments for the target date
    const newDeployments = deploymentsToCreate.map(d => ({
      date: toDate,
      staff_id: d.staff_id,
      start_time: d.start_time,
      end_time: d.end_time,
      position: d.position,
      secondary: d.secondary || '',
      area: d.area || '',
      closing: d.closing || '',
      break_minutes: d.break_minutes || 0,
      shift_type: d.shift_type
    }));
    
    const { data, error } = await supabase
      .from('deployments')
      .insert(newDeployments)
      .select(`
        *,
        staff:staff_id (
          id,
          name,
          is_under_18
        )
      `);
    
    if (error) throw error;
    
    setDeploymentsByDate(prev => ({
      ...prev,
      [toDate]: data
    }));
    
    // Also copy shift info if it exists
    const shiftInfoToCopy = shiftInfoByDate[fromDate];
    if (shiftInfoToCopy) {
      await updateShiftInfo(toDate, {
        forecast: shiftInfoToCopy.forecast || '£0.00',
        day_shift_forecast: shiftInfoToCopy.day_shift_forecast || '£0.00',
        night_shift_forecast: shiftInfoToCopy.night_shift_forecast || '£0.00',
        weather: shiftInfoToCopy.weather || '',
        notes: shiftInfoToCopy.notes || ''
      });
    }
    
    return data;
  };

  // Delete all deployments for a specific date
  const deleteAllDeployments = async (date) => {
    const { error } = await supabase
      .from('deployments')
      .delete()
      .eq('date', date);
    
    if (error) throw error;
    
    // Update state
    setDeploymentsByDate(prev => {
      const updated = { ...prev };
      delete updated[date];
      return updated;
    });
  };
  // Target operations
  const addTarget = async (targetData) => {
    const { data, error } = await supabase
      .from('targets')
      .insert([targetData])
      .select()
      .single();
    
    if (error) throw error;
    
    setTargets(prev => [...prev, data].sort((a, b) => a.priority - b.priority));
    return data;
  };

  const updateTarget = async (id, updates) => {
    const { data, error } = await supabase
      .from('targets')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    
    setTargets(prev => prev.map(t => t.id === id ? data : t).sort((a, b) => a.priority - b.priority));
    return data;
  };

  const removeTarget = async (id) => {
    const { error } = await supabase
      .from('targets')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    
    setTargets(prev => prev.filter(t => t.id !== id));
  };

  // Template shift operations
  const addTemplateShift = async (templateShift) => {
    const { data, error } = await supabase
      .from('template_shifts')
      .insert([{
        name: templateShift.name,
        start_time: templateShift.startTime,
        end_time: templateShift.endTime,
        shift_type: templateShift.type
      }])
      .select()
      .single();
    
    if (error) throw error;
    
    // Convert to component format and add to state
    const formattedShift = {
      id: data.id,
      name: data.name,
      startTime: data.start_time,
      endTime: data.end_time,
      type: data.shift_type
    };
    
    setTemplateShifts(prev => [...prev, formattedShift]);
    return formattedShift;
  };

  const removeTemplateShift = async (id) => {
    const { error } = await supabase
      .from('template_shifts')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    
    setTemplateShifts(prev => prev.filter(t => t.id !== id));
  };

  return {
    // Data
    staff,
    positions,
    deploymentsByDate,
    shiftInfoByDate,
    salesRecordsByDate,
    targets,
    templateShifts,
    loading,
    error,
    
    // Staff operations
    addStaff,
    removeStaff,
    
    // Deployment operations
    addDeployment,
    removeDeployment,
    updateDeployment,
    duplicateDeployments,
    deleteAllDeployments,
    
    // Shift info operations
    updateShiftInfo,
    deleteShiftInfo,
    deleteAllDeployments,
    
    // Sales records operations
    updateSalesRecords,
    calculateForecastTotals,
    
    // Position operations
    addPosition,
    removePosition,
    updatePosition,
    getDeploymentsByShift,
    canAddDeployment,
    
    // Target operations
    addTarget,
    updateTarget,
    removeTarget,
    loadTargets,
    
    // Template shift operations
    addTemplateShift,
    removeTemplateShift,
    
    // Utility
    loadAllData,
    deleteAllDeployments,
    
    // Auto-update functions
    autoUpdateShiftForecasts
  };
};