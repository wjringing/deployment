import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export function exportToExcel(deployments, weekStartDate, locationName) {
  const workbook = XLSX.utils.book_new();

  const groupedByDate = {};
  deployments.forEach(d => {
    if (!groupedByDate[d.deployment_date]) {
      groupedByDate[d.deployment_date] = [];
    }
    groupedByDate[d.deployment_date].push(d);
  });

  const summaryData = [
    ['Shift Deployment Report'],
    ['Location:', locationName],
    ['Week Starting:', new Date(weekStartDate + 'T00:00:00').toLocaleDateString()],
    ['Generated:', new Date().toLocaleString()],
    [],
    ['Summary Statistics'],
    ['Metric', 'Count'],
    ['Total Employees', new Set(deployments.map(d => d.employee_id)).size],
    ['Total Shifts', deployments.length],
    ['Day Shifts', deployments.filter(d => d.shift_type === 'day').length],
    ['Night Shifts', deployments.filter(d => d.shift_type === 'night').length],
    ['Both Shifts', deployments.filter(d => d.shift_type === 'both').length],
  ];

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

  Object.keys(groupedByDate).sort().forEach(date => {
    const dayDeployments = groupedByDate[date];
    const dayName = new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long' });

    const sheetData = [
      [dayName + ' - ' + new Date(date + 'T00:00:00').toLocaleDateString()],
      [],
      ['Employee Name', 'Role', 'Shift Type', 'Start Time', 'End Time']
    ];

    dayDeployments.forEach(d => {
      sheetData.push([
        d.employees.name,
        d.role,
        d.shift_type.charAt(0).toUpperCase() + d.shift_type.slice(1),
        formatTime(d.start_time),
        formatTime(d.end_time)
      ]);
    });

    const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
    XLSX.utils.book_append_sheet(workbook, worksheet, dayName.substring(0, 31));
  });

  const byShiftType = [
    ['Deployment by Shift Type'],
    [],
    ['Day Shifts'],
    ['Employee Name', 'Role', 'Date', 'Start Time', 'End Time']
  ];

  deployments.filter(d => d.shift_type === 'day').forEach(d => {
    byShiftType.push([
      d.employees.name,
      d.role,
      new Date(d.deployment_date + 'T00:00:00').toLocaleDateString(),
      formatTime(d.start_time),
      formatTime(d.end_time)
    ]);
  });

  byShiftType.push([], ['Night Shifts'], ['Employee Name', 'Role', 'Date', 'Start Time', 'End Time']);

  deployments.filter(d => d.shift_type === 'night').forEach(d => {
    byShiftType.push([
      d.employees.name,
      d.role,
      new Date(d.deployment_date + 'T00:00:00').toLocaleDateString(),
      formatTime(d.start_time),
      formatTime(d.end_time)
    ]);
  });

  byShiftType.push([], ['Both Shifts'], ['Employee Name', 'Role', 'Date', 'Start Time', 'End Time']);

  deployments.filter(d => d.shift_type === 'both').forEach(d => {
    byShiftType.push([
      d.employees.name,
      d.role,
      new Date(d.deployment_date + 'T00:00:00').toLocaleDateString(),
      formatTime(d.start_time),
      formatTime(d.end_time)
    ]);
  });

  const shiftTypeSheet = XLSX.utils.aoa_to_sheet(byShiftType);
  XLSX.utils.book_append_sheet(workbook, shiftTypeSheet, 'By Shift Type');

  const fileName = `Deployment_Report_${weekStartDate}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}

export function exportToPDF(deployments, weekStartDate, locationName) {
  const doc = new jsPDF();

  doc.setFontSize(18);
  doc.text('Shift Deployment Report', 14, 20);

  doc.setFontSize(11);
  doc.text(`Location: ${locationName}`, 14, 30);
  doc.text(`Week Starting: ${new Date(weekStartDate + 'T00:00:00').toLocaleDateString()}`, 14, 37);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 44);

  const uniqueEmployees = new Set(deployments.map(d => d.employee_id)).size;
  const dayShifts = deployments.filter(d => d.shift_type === 'day').length;
  const nightShifts = deployments.filter(d => d.shift_type === 'night').length;
  const bothShifts = deployments.filter(d => d.shift_type === 'both').length;

  const summaryData = [
    ['Total Employees', uniqueEmployees.toString()],
    ['Total Shifts', deployments.length.toString()],
    ['Day Shifts', dayShifts.toString()],
    ['Night Shifts', nightShifts.toString()],
    ['Both Shifts', bothShifts.toString()]
  ];

  doc.autoTable({
    startY: 52,
    head: [['Metric', 'Count']],
    body: summaryData,
    theme: 'grid',
    headStyles: { fillColor: [59, 130, 246] }
  });

  const groupedByDate = {};
  deployments.forEach(d => {
    if (!groupedByDate[d.deployment_date]) {
      groupedByDate[d.deployment_date] = [];
    }
    groupedByDate[d.deployment_date].push(d);
  });

  let currentY = doc.lastAutoTable.finalY + 15;

  Object.keys(groupedByDate).sort().forEach((date, index) => {
    const dayDeployments = groupedByDate[date];
    const dayName = new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    });

    if (currentY > 250 || index > 0) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFontSize(14);
    doc.text(dayName, 14, currentY);

    const tableData = dayDeployments.map(d => [
      d.employees.name,
      d.role,
      d.shift_type.charAt(0).toUpperCase() + d.shift_type.slice(1),
      formatTime(d.start_time),
      formatTime(d.end_time)
    ]);

    doc.autoTable({
      startY: currentY + 5,
      head: [['Employee', 'Role', 'Shift Type', 'Start', 'End']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246] },
      styles: { fontSize: 9 }
    });

    currentY = doc.lastAutoTable.finalY + 15;
  });

  doc.addPage();
  doc.setFontSize(14);
  doc.text('Deployment by Shift Type', 14, 20);

  const shiftTypes = ['day', 'night', 'both'];
  const shiftLabels = { day: 'Day Shifts', night: 'Night Shifts', both: 'Both Shifts' };
  let shiftY = 30;

  shiftTypes.forEach(shiftType => {
    const shiftDeployments = deployments.filter(d => d.shift_type === shiftType);

    if (shiftDeployments.length === 0) return;

    if (shiftY > 250) {
      doc.addPage();
      shiftY = 20;
    }

    doc.setFontSize(12);
    doc.text(shiftLabels[shiftType], 14, shiftY);

    const tableData = shiftDeployments.map(d => [
      d.employees.name,
      d.role,
      new Date(d.deployment_date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
      formatTime(d.start_time),
      formatTime(d.end_time)
    ]);

    doc.autoTable({
      startY: shiftY + 5,
      head: [['Employee', 'Role', 'Date', 'Start', 'End']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246] },
      styles: { fontSize: 9 }
    });

    shiftY = doc.lastAutoTable.finalY + 15;
  });

  const fileName = `Deployment_Report_${weekStartDate}.pdf`;
  doc.save(fileName);
}

export function exportToCSV(deployments, weekStartDate, locationName) {
  const csvData = [
    ['Shift Deployment Report'],
    ['Location', locationName],
    ['Week Starting', new Date(weekStartDate + 'T00:00:00').toLocaleDateString()],
    ['Generated', new Date().toLocaleString()],
    [],
    ['Employee Name', 'Role', 'Date', 'Day', 'Shift Type', 'Start Time', 'End Time']
  ];

  deployments.forEach(d => {
    csvData.push([
      d.employees.name,
      d.role,
      d.deployment_date,
      new Date(d.deployment_date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long' }),
      d.shift_type.charAt(0).toUpperCase() + d.shift_type.slice(1),
      formatTime(d.start_time),
      formatTime(d.end_time)
    ]);
  });

  const csvContent = csvData.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', `Deployment_Report_${weekStartDate}.csv`);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function formatTime(timeStr) {
  const [hours, minutes] = timeStr.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes} ${ampm}`;
}
