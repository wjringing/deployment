import * as XLSX from 'xlsx';

export const exportToExcel = (deployments, shiftInfo, selectedDate, staff, exportType = 'all') => {
  // Create a new workbook
  const workbook = XLSX.utils.book_new();
  
  // Helper function to calculate work hours
  const calculateWorkHours = (startTime, endTime) => {
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    
    let start = startHour + startMin / 60;
    let end = endHour + endMin / 60;
    
    if (end < start) {
      end += 24;
    }
    
    return (end - start).toFixed(1);
  };

  // Group deployments by shift type
  const dayShiftDeployments = deployments.filter(d => d.shift_type === 'Day Shift');
  const nightShiftDeployments = deployments.filter(d => d.shift_type === 'Night Shift');

  // Create shift info data
  const shiftInfoData = [
    ['Date', selectedDate],
    ['Total Forecast', shiftInfo.forecast || '£0.00'],
    ['Day Shift Forecast', shiftInfo.day_shift_forecast || '£0.00'],
    ['Night Shift Forecast', shiftInfo.night_shift_forecast || '£0.00'],
    ['Weather', shiftInfo.weather || ''],
    ['Notes', shiftInfo.notes || '']
  ];

  // Create shift info worksheet
  const shiftInfoWS = XLSX.utils.aoa_to_sheet(shiftInfoData);
  XLSX.utils.book_append_sheet(workbook, shiftInfoWS, 'Shift Info');

  // Helper function to create deployment worksheet
  const createDeploymentSheet = (deployments, shiftType) => {
    if (deployments.length === 0) return null;

    // Define headers based on shift type
    const baseHeaders = [
      'Staff Name',
      'Start Time',
      'End Time',
      'Hours',
      'Position',
      'Secondary',
      'Area',
      'Break (min)'
    ];

    // Add Closing Position column only for Night Shift
    const headers = shiftType === 'Night Shift' 
      ? [...baseHeaders, 'Closing Position']
      : baseHeaders;

    // Create data rows
    const data = deployments.map(deployment => {
      const baseRow = [
        deployment.staff?.name || 'Unknown',
        deployment.start_time,
        deployment.end_time,
        calculateWorkHours(deployment.start_time, deployment.end_time),
        deployment.position,
        deployment.secondary || '',
        deployment.area || '',
        deployment.break_minutes || 0
      ];

      // Add closing position only for Night Shift
      if (shiftType === 'Night Shift') {
        baseRow.push(deployment.closing || '');
      }

      return baseRow;
    });

    // Combine headers and data
    const worksheetData = [headers, ...data];
    
    // Create worksheet
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    
    // Set column widths
    const columnWidths = [
      { wch: 20 }, // Staff Name
      { wch: 12 }, // Start Time
      { wch: 12 }, // End Time
      { wch: 8 },  // Hours
      { wch: 15 }, // Position
      { wch: 15 }, // Secondary
      { wch: 20 }, // Area
      { wch: 12 }  // Break
    ];

    if (shiftType === 'Night Shift') {
      columnWidths.push({ wch: 20 }); // Closing Position
    }

    worksheet['!cols'] = columnWidths;

    // Style the header row
    const headerRange = XLSX.utils.decode_range(worksheet['!ref']);
    for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
      if (!worksheet[cellAddress]) continue;
      
      worksheet[cellAddress].s = {
        font: { bold: true },
        fill: { fgColor: { rgb: "DDDDDD" } },
        alignment: { horizontal: "center" }
      };
    }

    return worksheet;
  };

  // Add Day Shift worksheet
  if (dayShiftDeployments.length > 0) {
    const dayShiftWS = createDeploymentSheet(dayShiftDeployments, 'Day Shift');
    if (dayShiftWS) {
      XLSX.utils.book_append_sheet(workbook, dayShiftWS, 'Day Shift');
    }
  }

  // Add Night Shift worksheet
  if (nightShiftDeployments.length > 0) {
    const nightShiftWS = createDeploymentSheet(nightShiftDeployments, 'Night Shift');
    if (nightShiftWS) {
      XLSX.utils.book_append_sheet(workbook, nightShiftWS, 'Night Shift');
    }
  }

  // Create summary worksheet with all deployments
  if (deployments.length > 0) {
    const allHeaders = [
      'Staff Name',
      'Shift Type',
      'Start Time',
      'End Time',
      'Hours',
      'Position',
      'Secondary',
      'Area',
      'Closing Position',
      'Break (min)'
    ];

    const allData = deployments.map(deployment => [
      deployment.staff?.name || 'Unknown',
      deployment.shift_type,
      deployment.start_time,
      deployment.end_time,
      calculateWorkHours(deployment.start_time, deployment.end_time),
      deployment.position,
      deployment.secondary || '',
      deployment.area || '',
      deployment.closing || '',
      deployment.break_minutes || 0
    ]);

    const summaryData = [allHeaders, ...allData];
    const summaryWS = XLSX.utils.aoa_to_sheet(summaryData);
    
    // Set column widths for summary
    summaryWS['!cols'] = [
      { wch: 20 }, // Staff Name
      { wch: 12 }, // Shift Type
      { wch: 12 }, // Start Time
      { wch: 12 }, // End Time
      { wch: 8 },  // Hours
      { wch: 15 }, // Position
      { wch: 15 }, // Secondary
      { wch: 20 }, // Area
      { wch: 20 }, // Closing Position
      { wch: 12 }  // Break
    ];

    XLSX.utils.book_append_sheet(workbook, summaryWS, 'All Deployments');
  }

  // Generate filename
  const dateStr = selectedDate.replace(/\//g, '-');
  const typeStr = exportType === 'all' ? 'All-Shifts' : 
                  exportType === 'Day Shift' ? 'Day-Shift' : 'Night-Shift';
  const filename = `Deployment-Schedule-${dateStr}-${typeStr}.xlsx`;

  // Save the file
  XLSX.writeFile(workbook, filename);
};