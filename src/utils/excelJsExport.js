import ExcelJS from 'exceljs';

export const exportDeploymentsToExcel = async (deployments, date, locationName = 'Location') => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'KFC Deployment Management System';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet(`Deployments ${date}`, {
    properties: { tabColor: { argb: 'FFC0000' } }
  });

  worksheet.columns = [
    { header: 'Staff Name', key: 'staffName', width: 25 },
    { header: 'Start Time', key: 'startTime', width: 12 },
    { header: 'End Time', key: 'endTime', width: 12 },
    { header: 'Hours', key: 'hours', width: 10 },
    { header: 'Shift Type', key: 'shiftType', width: 15 },
    { header: 'Position', key: 'position', width: 15 },
    { header: 'Secondary', key: 'secondary', width: 15 },
    { header: 'Area', key: 'area', width: 15 },
    { header: 'Break (mins)', key: 'breakMinutes', width: 12 },
  ];

  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFC0000' }
  };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  headerRow.height = 25;

  deployments.forEach((deployment) => {
    const start = deployment.start_time || '';
    const end = deployment.end_time || '';
    const hours = calculateHours(start, end);

    worksheet.addRow({
      staffName: deployment.staff?.name || 'Unknown',
      startTime: start,
      endTime: end,
      hours: hours,
      shiftType: deployment.shift_type || 'Day Shift',
      position: deployment.position || '',
      secondary: deployment.secondary || '',
      area: deployment.area || '',
      breakMinutes: deployment.break_minutes || 0,
    });
  });

  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber > 1) {
      row.alignment = { vertical: 'middle', horizontal: 'left' };
      row.border = {
        top: { style: 'thin', color: { argb: 'FFD3D3D3' } },
        left: { style: 'thin', color: { argb: 'FFD3D3D3' } },
        bottom: { style: 'thin', color: { argb: 'FFD3D3D3' } },
        right: { style: 'thin', color: { argb: 'FFD3D3D3' } }
      };
    }
  });

  const totalHours = deployments.reduce((sum, d) => {
    return sum + calculateHours(d.start_time, d.end_time);
  }, 0);

  const summaryRow = worksheet.addRow({
    staffName: 'TOTAL',
    hours: totalHours.toFixed(2),
  });
  summaryRow.font = { bold: true };
  summaryRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFF0F0F0' }
  };

  worksheet.views = [{ state: 'frozen', xSplit: 0, ySplit: 1 }];

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });

  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${locationName}_Deployments_${date}.xlsx`;
  link.click();
  window.URL.revokeObjectURL(url);
};

export const exportStaffListToExcel = async (staff, locationName = 'Location') => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'KFC Deployment Management System';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('Staff List', {
    properties: { tabColor: { argb: 'FFC0000' } }
  });

  worksheet.columns = [
    { header: 'Staff Name', key: 'name', width: 30 },
    { header: 'Under 18', key: 'isUnder18', width: 12 },
    { header: 'Hourly Rate', key: 'hourlyRate', width: 15 },
    { header: 'Created Date', key: 'createdAt', width: 20 },
  ];

  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFC0000' }
  };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  headerRow.height = 25;

  staff.forEach((member) => {
    worksheet.addRow({
      name: member.name,
      isUnder18: member.is_under_18 ? 'Yes' : 'No',
      hourlyRate: member.hourly_rate ? `£${member.hourly_rate.toFixed(2)}` : 'N/A',
      createdAt: member.created_at ? new Date(member.created_at).toLocaleDateString() : '',
    });
  });

  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber > 1) {
      row.alignment = { vertical: 'middle', horizontal: 'left' };
      row.border = {
        top: { style: 'thin', color: { argb: 'FFD3D3D3' } },
        left: { style: 'thin', color: { argb: 'FFD3D3D3' } },
        bottom: { style: 'thin', color: { argb: 'FFD3D3D3' } },
        right: { style: 'thin', color: { argb: 'FFD3D3D3' } }
      };
    }
  });

  worksheet.views = [{ state: 'frozen', xSplit: 0, ySplit: 1 }];

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });

  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${locationName}_Staff_List_${new Date().toISOString().split('T')[0]}.xlsx`;
  link.click();
  window.URL.revokeObjectURL(url);
};

export const exportPerformanceReport = async (data, locationName = 'Location', dateRange) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'KFC Deployment Management System';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('Performance Report', {
    properties: { tabColor: { argb: 'FFC0000' } }
  });

  worksheet.columns = [
    { header: 'Date', key: 'date', width: 15 },
    { header: 'Sales', key: 'sales', width: 15 },
    { header: 'Labor Hours', key: 'laborHours', width: 15 },
    { header: 'Labor Cost', key: 'laborCost', width: 15 },
    { header: 'Labor %', key: 'laborPercentage', width: 12 },
    { header: 'Staff Count', key: 'staffCount', width: 15 },
  ];

  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFC0000' }
  };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  headerRow.height = 25;

  data.forEach((record) => {
    worksheet.addRow({
      date: record.date,
      sales: `£${record.sales.toFixed(2)}`,
      laborHours: record.laborHours.toFixed(2),
      laborCost: `£${record.laborCost.toFixed(2)}`,
      laborPercentage: `${record.laborPercentage.toFixed(2)}%`,
      staffCount: record.staffCount,
    });
  });

  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber > 1) {
      row.alignment = { vertical: 'middle', horizontal: 'right' };
      row.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' };
      row.border = {
        top: { style: 'thin', color: { argb: 'FFD3D3D3' } },
        left: { style: 'thin', color: { argb: 'FFD3D3D3' } },
        bottom: { style: 'thin', color: { argb: 'FFD3D3D3' } },
        right: { style: 'thin', color: { argb: 'FFD3D3D3' } }
      };
    }
  });

  worksheet.views = [{ state: 'frozen', xSplit: 0, ySplit: 1 }];

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });

  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${locationName}_Performance_Report_${dateRange}.xlsx`;
  link.click();
  window.URL.revokeObjectURL(url);
};

function calculateHours(startTime, endTime) {
  if (!startTime || !endTime) return 0;

  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);

  let hours = endHour - startHour;
  let minutes = endMin - startMin;

  if (minutes < 0) {
    hours--;
    minutes += 60;
  }

  if (hours < 0) {
    hours += 24;
  }

  return hours + minutes / 60;
}
