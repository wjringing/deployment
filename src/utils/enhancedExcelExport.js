import * as XLSX from 'xlsx';

export const exportEnhancedExcel = (deployments, shiftInfo, selectedDate, targets) => {
  // Create a new workbook
  const workbook = XLSX.utils.book_new();
  
  // Ensure we have default values for all parameters
  const safeDeployments = deployments || [];
  const safeShiftInfo = shiftInfo || {
    forecast: '£0.00',
    day_shift_forecast: '£0.00', 
    night_shift_forecast: '£0.00',
    weather: '',
    notes: ''
  };
  const safeTargets = targets || [];
  
  // Helper function to calculate work hours
  const calculateWorkHours = (startTime, endTime) => {
    if (!startTime || !endTime || typeof startTime !== 'string' || typeof endTime !== 'string') {
      return '0.00';
    }

    const startParts = startTime.split(':');
    const endParts = endTime.split(':');

    if (startParts.length !== 2 || endParts.length !== 2) {
      return '0.00';
    }

    const startHour = parseInt(startParts[0]);
    const startMin = parseInt(startParts[1]);
    const endHour = parseInt(endParts[0]);
    const endMin = parseInt(endParts[1]);

    if (isNaN(startHour) || isNaN(startMin) || isNaN(endHour) || isNaN(endMin)) {
      return '0.00';
    }

    let start = startHour + startMin / 60;
    let end = endHour + endMin / 60;

    if (end < start) {
      end += 24;
    }

    return (end - start).toFixed(2);
  };

  // Get day name from date
  const getDayName = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { weekday: 'long' });
  };

  // Create the data structure matching the screenshot
  const data = [];
  
  // Header row 1 - Day and Date
  data.push(['Day', '', 'Date', '', 'Total Forecast', safeShiftInfo.forecast || '£0.00', 'Weather', safeShiftInfo.weather || 'Wet, cold and miserable.']);
  data.push([getDayName(selectedDate), '', selectedDate, '', 'Night Shift Forecast', safeShiftInfo.night_shift_forecast || '£0.00', '', '']);
  data.push(['', '', '', '', 'Day Shift Forecast', safeShiftInfo.day_shift_forecast || '£0.00', '', '']);
  data.push(['', '', '', '', '', '', '', '']);
  
  // Staff table header
  data.push(['Staff Name', 'Start Time', 'End Time', 'Work Hours', 'Position', 'Secondary', 'Closing', 'Break Minutes']);
  
  // Staff data
  safeDeployments.forEach(deployment => {
    const workHours = calculateWorkHours(deployment.start_time, deployment.end_time);
    data.push([
      deployment.staff?.name || 'Unknown',
      deployment.start_time,
      deployment.end_time,
      workHours,
      deployment.position,
      deployment.secondary || '',
      deployment.closing || '',
      deployment.break_minutes || 0
    ]);
  });
  
  // Add empty row
  data.push(['', '', '', '', '', '', '', '']);
  
  // Targets section
  data.push(['Targets:', '', '', '', '', '', '', '']);
  
  // Add targets data
  safeTargets.forEach(target => {
    data.push(['', `${target.name || 'Target'}: ${target.value || 'N/A'}`, '', '', '', '', '', '']);
  });
  
  // Add empty rows for spacing
  data.push(['', '', '', '', '', '', '', '']);
  data.push(['', '', '', '', '', '', '', '']);
  
  // Notes section
  data.push(['Notes:', '', '', '', '', '', '', '']);
  data.push(['', safeShiftInfo.notes || 'Lets really go for upselling today guys and lets get a fantastic DT Time.', '', '', '', '', '', '']);
  data.push(['', 'Mention the Survey and lets leave the customers with a fantastic experience', '', '', '', '', '', '']);

  // Create worksheet
  const worksheet = XLSX.utils.aoa_to_sheet(data);
  
  // Set column widths
  worksheet['!cols'] = [
    { wch: 15 }, // Staff Name
    { wch: 10 }, // Start Time
    { wch: 10 }, // End Time
    { wch: 12 }, // Work Hours
    { wch: 15 }, // Position
    { wch: 20 }, // Secondary
    { wch: 15 }, // Closing
    { wch: 15 }  // Break Minutes
  ];

  // Apply merges to match the screenshot format
  const merges = [
    // Day cell merge
    { s: { r: 0, c: 0 }, e: { r: 1, c: 0 } },
    // Date merge
    { s: { r: 0, c: 2 }, e: { r: 0, c: 3 } },
    { s: { r: 1, c: 2 }, e: { r: 1, c: 3 } },
    { s: { r: 2, c: 2 }, e: { r: 2, c: 3 } },
    // Forecast values merge
    { s: { r: 0, c: 5 }, e: { r: 0, c: 5 } },
    { s: { r: 1, c: 5 }, e: { r: 1, c: 5 } },
    { s: { r: 2, c: 5 }, e: { r: 2, c: 5 } },
    // Weather merge
    { s: { r: 0, c: 6 }, e: { r: 2, c: 7 } },
    // Targets merge
    { s: { r: data.length - 6, c: 0 }, e: { r: data.length - 6, c: 1 } },
    // Notes merge
    { s: { r: data.length - 3, c: 0 }, e: { r: data.length - 3, c: 1 } },
    { s: { r: data.length - 2, c: 1 }, e: { r: data.length - 2, c: 7 } },
    { s: { r: data.length - 1, c: 1 }, e: { r: data.length - 1, c: 7 } }
  ];

  worksheet['!merges'] = merges;

  // Apply borders and styling
  const range = XLSX.utils.decode_range(worksheet['!ref']);
  for (let R = range.s.r; R <= range.e.r; ++R) {
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
      if (!worksheet[cellAddress]) worksheet[cellAddress] = { t: 's', v: '' };
      
      // Add borders to all cells
      worksheet[cellAddress].s = {
        border: {
          top: { style: 'thin', color: { rgb: '000000' } },
          bottom: { style: 'thin', color: { rgb: '000000' } },
          left: { style: 'thin', color: { rgb: '000000' } },
          right: { style: 'thin', color: { rgb: '000000' } }
        }
      };
      
      // Header styling
      if (R === 4) { // Staff table header
        worksheet[cellAddress].s.font = { bold: true };
        worksheet[cellAddress].s.fill = { fgColor: { rgb: 'DDDDDD' } };
      }
    }
  }

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Deployment Schedule');

  // Generate filename
  const dateStr = selectedDate.replace(/\//g, '-');
  const filename = `Deployment-Schedule-${dateStr}.xlsx`;

  // Save the file
  XLSX.writeFile(workbook, filename);
};