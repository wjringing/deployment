import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { convertTo24Hour } from './timeCalculations';

export const exportEnhancedPDF = (deployments, shiftInfo, selectedDate, targets, exportType = 'all') => {
  // Create jsPDF instance with landscape orientation for better space utilization
  const doc = new jsPDF('landscape', 'mm', 'a4');
  
  // Page dimensions for landscape A4
  const pageWidth = 297;
  const pageHeight = 210;
  const margin = 10;
  const usableWidth = pageWidth - (margin * 2);
  const usableHeight = pageHeight - (margin * 2);
  
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
  
  // Calculate dynamic font sizes based on content amount
  const deploymentCount = safeDeployments.length;
  const targetCount = safeTargets.length;
  
  // Dynamic scaling based on content density
  let headerFontSize = Math.max(8, Math.min(12, 12 - (deploymentCount * 0.2)));
  let bodyFontSize = Math.max(6, Math.min(10, 10 - (deploymentCount * 0.15)));
  let tableFontSize = Math.max(6, Math.min(9, 9 - (deploymentCount * 0.1)));
  
  // Helper function to calculate work hours
  const calculateWorkHours = (startTime, endTime) => {
    if (!startTime || !endTime || typeof startTime !== 'string' || typeof endTime !== 'string') {
      return '0.00';
    }

    const startConverted = convertTo24Hour(startTime);
    const endConverted = convertTo24Hour(endTime);

    if (!startConverted || !endConverted) {
      return '0.00';
    }

    if (isNaN(startConverted.hours) || isNaN(startConverted.minutes) ||
        isNaN(endConverted.hours) || isNaN(endConverted.minutes)) {
      return '0.00';
    }

    let start = startConverted.hours + startConverted.minutes / 60;
    let end = endConverted.hours + endConverted.minutes / 60;

    if (end < start) {
      end += 24;
    }

    return (end - start).toFixed(2);
  };

  // Get day name from date
  const getDayName = (dateString) => {
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('en-GB', { weekday: 'long' });
  };

  let yPosition = margin;

  // Header section - compact layout
  doc.setFontSize(headerFontSize);
  doc.setFont('helvetica', 'normal');
  
  // Create compact header table
  const headerData = [
    ['Day', 'Date', 'Total Forecast', safeShiftInfo.forecast || '£0.00', 'Weather'],
    [getDayName(selectedDate), selectedDate, 'Night Shift Forecast', safeShiftInfo.night_shift_forecast || '£0.00', safeShiftInfo.weather || 'Wet, cold and miserable.'],
    ['', '', 'Day Shift Forecast', safeShiftInfo.day_shift_forecast || '£0.00', '']
  ];

  // Use autoTable with compact settings
  autoTable(doc, {
    body: headerData,
    startY: yPosition,
    theme: 'grid',
    styles: {
      fontSize: bodyFontSize,
      cellPadding: 1.5,
      lineColor: [0, 0, 0],
      lineWidth: 0.1
    },
    columnStyles: {
      0: { cellWidth: 25 },
      1: { cellWidth: 35 },
      2: { cellWidth: 35 },
      3: { cellWidth: 25 },
      4: { cellWidth: usableWidth - 120 }
    },
    margin: { left: margin, right: margin }
  });

  yPosition = doc.lastAutoTable.finalY + 5;

  // Calculate remaining space for staff table and bottom sections
  const remainingHeight = usableHeight - (yPosition - margin) - 40; // Reserve 40mm for targets and notes
  
  // Staff deployment table with dynamic sizing
  if (safeDeployments.length > 0) {
    // Hide Closing column for Day Shift exports
    const isDayShift = exportType === 'day';
    const staffHeaders = isDayShift
      ? ['Staff Name', 'Start Time', 'End Time', 'Work Hours', 'Position', 'Secondary', 'Break Min']
      : ['Staff Name', 'Start Time', 'End Time', 'Work Hours', 'Position', 'Secondary', 'Closing', 'Break Min'];

    const staffData = safeDeployments.map(deployment => {
      const baseData = [
        deployment.staff?.name || 'Unknown',
        deployment.start_time,
        deployment.end_time,
        calculateWorkHours(deployment.start_time, deployment.end_time),
        deployment.position,
        deployment.secondary || ''
      ];

      // Only add Closing column for non-day shift exports
      if (!isDayShift) {
        baseData.push(deployment.closing || '');
      }

      baseData.push(deployment.break_minutes || 0);
      return baseData;
    });

    // Calculate dynamic row height based on available space (more generous spacing)
    const availableTableHeight = usableHeight - (yPosition - margin) - 60; // Reserve 60mm for targets and notes
    const maxRowHeight = Math.max(5, Math.min(10, availableTableHeight / (staffData.length + 1)));

    autoTable(doc, {
      head: [staffHeaders],
      body: staffData,
      startY: yPosition,
      theme: 'grid',
      headStyles: {
        fillColor: [221, 221, 221],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        fontSize: Math.max(7, tableFontSize),
        cellPadding: 1
      },
      bodyStyles: {
        fontSize: Math.max(6, tableFontSize),
        cellPadding: 1,
        minCellHeight: maxRowHeight
      },
      columnStyles: isDayShift ? {
        0: { cellWidth: usableWidth * 0.22 }, // Staff Name - 22%
        1: { cellWidth: usableWidth * 0.12 }, // Start Time - 12%
        2: { cellWidth: usableWidth * 0.12 }, // End Time - 12%
        3: { cellWidth: usableWidth * 0.10 }, // Work Hours - 10%
        4: { cellWidth: usableWidth * 0.18 }, // Position - 18%
        5: { cellWidth: usableWidth * 0.18 }, // Secondary - 18%
        6: { cellWidth: usableWidth * 0.08 }  // Break Min - 8%
      } : {
        0: { cellWidth: usableWidth * 0.20 }, // Staff Name - 20%
        1: { cellWidth: usableWidth * 0.10 }, // Start Time - 10%
        2: { cellWidth: usableWidth * 0.10 }, // End Time - 10%
        3: { cellWidth: usableWidth * 0.08 }, // Work Hours - 8%
        4: { cellWidth: usableWidth * 0.15 }, // Position - 15%
        5: { cellWidth: usableWidth * 0.17 }, // Secondary - 17%
        6: { cellWidth: usableWidth * 0.12 }, // Closing - 12%
        7: { cellWidth: usableWidth * 0.08 }  // Break Min - 8%
      },
      margin: { left: margin, right: margin },
      tableWidth: usableWidth
    });

    yPosition = doc.lastAutoTable.finalY + 3; // Minimal spacing after table
  }

  // Targets and Shift Notes section directly under the table
  const bottomSectionY = yPosition;
  
  // Calculate column widths for targets and notes (side by side layout)
  const targetsWidth = usableWidth * 0.35; // 35% for targets
  const notesWidth = usableWidth * 0.60;   // 60% for notes
  const gapWidth = usableWidth * 0.05;     // 5% gap between sections
  
  // Targets section (left side)
  doc.setFontSize(Math.max(8, bodyFontSize + 1));
  doc.setFont('helvetica', 'bold');
  doc.text('Targets:', margin, bottomSectionY);
  
  // Shift Notes section header (right side, aligned with Targets header)
  doc.text('Shift Notes:', margin + targetsWidth + gapWidth, bottomSectionY);
  
  // Targets content
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(Math.max(7, bodyFontSize));
  
  let targetsY = bottomSectionY + 5;
  const maxTargetsHeight = 30; // Increased available height
  const targetLineHeight = 4.5;
  
  // Display targets with dynamic spacing
  safeTargets.slice(0, Math.floor(maxTargetsHeight / targetLineHeight)).forEach((target, index) => {
    if (targetsY < bottomSectionY + maxTargetsHeight) {
      const targetText = `${target.name}: ${target.value}`;
      const wrappedText = doc.splitTextToSize(targetText, targetsWidth - 3);
      doc.text(wrappedText, margin + 3, targetsY);
      targetsY += targetLineHeight * wrappedText.length;
    }
  });

  // Shift Notes content (spans remaining width)
  const notesX = margin + targetsWidth + gapWidth;
  let notesY = bottomSectionY + 5;
  
  const notes = safeShiftInfo.notes || 'Lets really go for upselling today guys and lets get a fantastic DT Time. Mention the Survey and lets leave the customers with a fantastic experience';
  
  // Split notes to fit in the available width and height
  const maxNotesHeight = 30; // Increased available height
  const noteLineHeight = 4;
  const maxNotesLines = Math.floor(maxNotesHeight / noteLineHeight);
  
  const splitNotes = doc.splitTextToSize(notes, notesWidth);
  const displayNotes = splitNotes.slice(0, maxNotesLines);
  
  doc.setFontSize(Math.max(7, bodyFontSize));
  displayNotes.forEach((line, index) => {
    if (notesY < bottomSectionY + maxNotesHeight) {
      doc.text(line, notesX, notesY);
      notesY += noteLineHeight;
    }
  });

  // Add visual separator between targets and notes
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.2);
  doc.line(margin + targetsWidth + (gapWidth/2), bottomSectionY - 1, margin + targetsWidth + (gapWidth/2), bottomSectionY + Math.max(maxTargetsHeight, maxNotesHeight));

  // Generate filename
  const dateStr = selectedDate.replace(/\//g, '-');
  const shiftSuffix = exportType === 'day' ? '-Day-Shift' : exportType === 'night' ? '-Night-Shift' : '';
  const filename = `Deployment-Schedule-${dateStr}${shiftSuffix}.pdf`;

  // Save the PDF
  doc.save(filename);
};