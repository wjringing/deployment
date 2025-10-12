export function parseSchedulePDF(pdfData) {
  const scheduleData = {
    location: '',
    locationCode: '',
    weekStart: null,
    weekEnd: null,
    employees: []
  };

  if (!pdfData.pages || pdfData.pages.length === 0) {
    throw new Error('No pages found in PDF');
  }

  console.log('=== POSITION-BASED PDF PARSER ===');
  console.log('Total pages:', pdfData.pages.length);

  // Collect all items from all pages
  let allItems = [];
  pdfData.pages.forEach((page, pageIndex) => {
    console.log(`\nPage ${pageIndex + 1}: ${page.width}x${page.height}, ${page.items.length} items`);
    allItems = allItems.concat(page.items);
  });

  console.log('Total items across all pages:', allItems.length);

  // Group items by Y position (rows)
  const rows = [];
  let currentRow = [];
  let currentY = null;

  const sortedItems = [...allItems].sort((a, b) => {
    if (Math.abs(a.y - b.y) > 5) {
      return a.y - b.y;
    }
    return a.x - b.x;
  });

  sortedItems.forEach(item => {
    if (currentY === null || Math.abs(item.y - currentY) > 5) {
      if (currentRow.length > 0) {
        rows.push(currentRow);
      }
      currentRow = [item];
      currentY = item.y;
    } else {
      currentRow.push(item);
    }
  });

  if (currentRow.length > 0) {
    rows.push(currentRow);
  }

  console.log('Total rows:', rows.length);

  // Debug: Print first 30 rows
  console.log('\n=== FIRST 30 ROWS ===');
  for (let i = 0; i < Math.min(30, rows.length); i++) {
    const rowText = rows[i].map(item => item.text).join(' ');
    console.log(`Row ${i}: ${rowText}`);
  }

  // Extract location
  for (let i = 0; i < Math.min(5, rows.length); i++) {
    const rowText = rows[i].map(item => item.text).join(' ');
    if (rowText.includes('KFC') || rowText.includes('Oswestry')) {
      const match = rowText.match(/([A-Za-z\s-]+)\s+(\d+)/);
      if (match) {
        scheduleData.location = match[1].trim();
        scheduleData.locationCode = match[2];
        console.log('Location:', scheduleData.location, scheduleData.locationCode);
      }
      break;
    }
  }

  // Find day column headers - look for "Mon 6 Tue 7 Wed 8" pattern
  let dayColumnPositions = [];
  let headerRowIndex = -1;

  for (let i = 0; i < rows.length; i++) {
    const rowText = rows[i].map(item => item.text).join(' ');

    // Look for day abbreviations with numbers
    if (rowText.match(/Mon\s+\d+/) && rowText.match(/Tue\s+\d+/)) {
      headerRowIndex = i;
      console.log('\n✓ Found day header row at index', i, ':', rowText);

      const dayMap = {
        'Mon': 'Monday',
        'Tue': 'Tuesday',
        'Wed': 'Wednesday',
        'Thu': 'Thursday',
        'Fri': 'Friday',
        'Sat': 'Saturday',
        'Sun': 'Sunday'
      };

      const dayPositions = {};
      const dayDates = {};

      // Find day positions and extract dates
      rows[i].forEach(item => {
        for (const [abbr, fullName] of Object.entries(dayMap)) {
          if (item.text === abbr && !dayPositions[fullName]) {
            dayPositions[fullName] = item.x;
            console.log(`  ${fullName} at X=${item.x}`);
          }
        }
      });

      // Extract the starting date (Monday's date)
      const mondayDateMatch = rowText.match(/Mon\s+(\d+)/);
      if (mondayDateMatch) {
        const mondayDay = parseInt(mondayDateMatch[1]);
        // Assuming October 2025 based on the PDF
        scheduleData.weekStart = new Date(2025, 9, mondayDay); // Month 9 = October

        const sundayDateMatch = rowText.match(/Sun\s+(\d+)/);
        if (sundayDateMatch) {
          const sundayDay = parseInt(sundayDateMatch[1]);
          scheduleData.weekEnd = new Date(2025, 9, sundayDay);
        }

        console.log('Week start:', scheduleData.weekStart.toISOString().split('T')[0]);
        if (scheduleData.weekEnd) {
          console.log('Week end:', scheduleData.weekEnd.toISOString().split('T')[0]);
        }
      }

      // Build column boundaries
      const sortedDays = Object.values(dayMap).filter(day => dayPositions[day]);
      for (let j = 0; j < sortedDays.length; j++) {
        const day = sortedDays[j];
        const startX = dayPositions[day];
        const endX = j < sortedDays.length - 1 ? dayPositions[sortedDays[j + 1]] : 9999;
        dayColumnPositions.push({
          day,
          startX,
          endX,
          centerX: startX + (endX - startX) / 2
        });
      }

      console.log('Day columns:', dayColumnPositions);
      break;
    }
  }

  if (headerRowIndex === -1 || dayColumnPositions.length === 0) {
    console.error('ERROR: Could not find day column headers');
    throw new Error('Could not find day column headers in PDF. Expected format: "Mon 6 Tue 7 Wed 8..."');
  }

  // Find sections and parse employees
  let currentSection = '';

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowText = row.map(item => item.text).join(' ');

    // Check for section headers
    if (rowText.match(/Shift Runner|Team Member|Cook/i) && rowText.match(/Deployment/i)) {
      currentSection = rowText.replace(/Deployment.*$/i, '').trim();
      console.log('\n--- Section:', currentSection, '---');
      continue;
    }

    // Skip non-employee rows
    if (!currentSection || rowText.includes('Unassigned')) {
      continue;
    }

    // Find employee name (leftmost text items before first day column)
    const nameItems = [];
    for (const item of row) {
      if (item.x < dayColumnPositions[0].startX - 20) {
        nameItems.push(item.text);
      }
    }

    let employeeName = nameItems.join(' ').trim();

    // Clean up role suffix from name
    employeeName = employeeName
      .replace(/Shift Runner Deployment/gi, '')
      .replace(/Cook Deployment/gi, '')
      .replace(/Team Member Deploym.*$/gi, '')
      .trim();

    // Skip invalid names
    if (employeeName.length < 3 ||
        employeeName.match(/^\d/) ||
        employeeName.includes('Deployment') ||
        employeeName.includes('Position then') ||
        employeeName === 'KFC' ||
        employeeName.includes('Oswestry')) {
      continue;
    }

    const employee = {
      name: employeeName,
      role: currentSection,
      schedule: {}
    };

    console.log(`\nEmployee: ${employeeName}`);

    // Map items to day columns
    let hasAnyShift = false;
    for (const dayCol of dayColumnPositions) {
      const itemsInColumn = row.filter(item =>
        item.x >= dayCol.startX - 15 && item.x < dayCol.endX
      );

      if (itemsInColumn.length === 0) {
        console.log(`  ${dayCol.day}: OFF (no data)`);
        continue;
      }

      const columnText = itemsInColumn.map(i => i.text).join('');

      // Skip if empty or just spacing
      if (!columnText.trim() || columnText.length < 3) {
        console.log(`  ${dayCol.day}: OFF`);
        continue;
      }

      // Extract time range - handle both 12hr (3pm) and variations
      const timeMatch = columnText.match(/(\d{1,2}(?::\d{2})?(?:am|pm))\s*-\s*(\d{1,2}(?::\d{2})?(?:am|pm))/i);
      if (timeMatch) {
        const startTime = normalizeTime(timeMatch[1]);
        const endTime = normalizeTime(timeMatch[2]);

        employee.schedule[dayCol.day] = {
          startTime,
          endTime
        };
        hasAnyShift = true;
        console.log(`  ${dayCol.day}: ${startTime} - ${endTime}`);
      } else {
        console.log(`  ${dayCol.day}: Could not parse "${columnText}"`);
      }
    }

    // Add employee if they have at least one shift
    if (hasAnyShift) {
      scheduleData.employees.push(employee);
      console.log(`✓ Added ${employeeName} with ${Object.keys(employee.schedule).length} shifts`);
    }
  }

  console.log('\n=== PARSING COMPLETE ===');
  console.log('Total employees parsed:', scheduleData.employees.length);

  return scheduleData;
}

function normalizeTime(timeStr) {
  // Convert times like "3pm" to "3:00pm" and "11:30am" stays as is
  const match = timeStr.match(/(\d{1,2})(?::(\d{2}))?([ap]m?)/i);
  if (!match) return timeStr;

  const hours = match[1];
  const minutes = match[2] || '00';
  const meridiem = match[3].toLowerCase().replace('m', '') + 'm';

  return `${hours}:${minutes}${meridiem}`;
}

function parseDateString(dateStr) {
  const cleaned = dateStr.replace(/(\d+)(st|nd|rd|th)/, '$1');
  return new Date(cleaned);
}

export function convertTimeToMilitary(timeStr) {
  const match = timeStr.match(/(\d{1,2}):(\d{2})([ap])m?/i);
  if (!match) return null;

  let hours = parseInt(match[1]);
  const minutes = match[2];
  const meridiem = match[3].toLowerCase();

  if (meridiem === 'a') {
    if (hours === 12) hours = 0;
  } else {
    if (hours !== 12) hours += 12;
  }

  return `${String(hours).padStart(2, '0')}:${minutes}:00`;
}

export function getDateForDayOfWeek(weekStartDate, dayName) {
  const dayMap = {
    'Monday': 0,
    'Tuesday': 1,
    'Wednesday': 2,
    'Thursday': 3,
    'Friday': 4,
    'Saturday': 5,
    'Sunday': 6
  };

  const offset = dayMap[dayName];
  const date = new Date(weekStartDate);
  date.setDate(date.getDate() + offset);

  return date.toISOString().split('T')[0];
}
