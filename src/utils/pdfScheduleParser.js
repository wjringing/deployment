export function parseSchedulePDF(extractedData) {
  const scheduleData = {
    location: '',
    locationCode: '',
    weekStart: null,
    weekEnd: null,
    employees: []
  };

  console.log('=== POSITION-BASED PDF PARSER ===');
  console.log('Total pages:', extractedData.pages.length);

  // Group all text items by Y position across all pages
  const allItems = [];
  extractedData.pages.forEach((page, pageIndex) => {
    console.log(`\nPage ${pageIndex + 1}: ${page.width}x${page.height}, ${page.items.length} items`);
    page.items.forEach(item => {
      allItems.push({
        ...item,
        pageIndex
      });
    });
  });

  console.log('\nTotal items across all pages:', allItems.length);

  // Group items into rows by Y position (within 2px tolerance)
  const rows = [];
  const sortedItems = [...allItems].sort((a, b) => {
    if (Math.abs(a.y - b.y) < 2) return a.x - b.x;
    return a.y - b.y;
  });

  let currentRow = [];
  let currentY = null;

  for (const item of sortedItems) {
    if (currentY === null || Math.abs(item.y - currentY) < 2) {
      currentRow.push(item);
      currentY = item.y;
    } else {
      if (currentRow.length > 0) rows.push(currentRow);
      currentRow = [item];
      currentY = item.y;
    }
  }
  if (currentRow.length > 0) rows.push(currentRow);

  console.log('Total rows:', rows.length);

  // Extract location from first few rows
  for (let i = 0; i < Math.min(5, rows.length); i++) {
    const rowText = rows[i].map(item => item.text).join(' ');
    if (rowText.includes('KFC')) {
      const match = rowText.match(/(.*?KFC[^0-9]*(?:[^0-9]*))(\d{4})/);
      if (match) {
        scheduleData.location = match[1].replace(/\s+/g, ' ').trim();
        scheduleData.locationCode = match[2];
      }
      break;
    }
  }

  console.log('Location:', scheduleData.location);

  // Find the day header row
  let headerRowIndex = -1;
  const dayColumnPositions = [];

  for (let i = 0; i < rows.length; i++) {
    const rowText = rows[i].map(item => item.text).join(' ');
    if (rowText.match(/Mon\s+\d+.*Tue\s+\d+.*Wed\s+\d+/)) {
      headerRowIndex = i;
      console.log(`\n✓ Found day header row at index ${i} : ${rowText}`);

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

      // Find day positions - text items are like "Mon 6", "Tue 7", etc.
      rows[i].forEach(item => {
        for (const [abbr, fullName] of Object.entries(dayMap)) {
          if (item.text.startsWith(abbr + ' ') && !dayPositions[fullName]) {
            dayPositions[fullName] = item.x;
          }
        }
      });

      // Extract week dates
      const mondayDateMatch = rowText.match(/Mon\s+(\d+)/);
      if (mondayDateMatch) {
        const mondayDay = parseInt(mondayDateMatch[1]);
        scheduleData.weekStart = new Date(2025, 9, mondayDay);

        const sundayDateMatch = rowText.match(/Sun\s+(\d+)/);
        if (sundayDateMatch) {
          const sundayDay = parseInt(sundayDateMatch[1]);
          scheduleData.weekEnd = new Date(2025, 9, sundayDay);
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
          endX
        });
      }

      console.log('Day columns detected:', dayColumnPositions.length);
      break;
    }
  }

  if (headerRowIndex === -1 || dayColumnPositions.length === 0) {
    throw new Error('Could not find day column headers in PDF');
  }

  // Parse employees with multi-row lookahead
  const NAME_COLUMN_MAX_X = 160; // Names are at X≈64, well before day columns start
  let currentSection = '';

  for (let i = headerRowIndex + 1; i < rows.length; i++) {
    const row = rows[i];
    const rowText = row.map(item => item.text).join(' ');

    // Detect section headers
    if (rowText.match(/(Shift Runner|Team Member|Cook)\s+Deployment/i)) {
      const sectionMatch = rowText.match(/(Shift Runner|Team Member|Cook)/i);
      if (sectionMatch) {
        currentSection = sectionMatch[1];
        console.log(`\n=== Section: ${currentSection} ===`);
      }
      continue;
    }

    // Skip non-content rows
    if (rowText.includes('Unassigned') || rowText.includes('Position then')) {
      continue;
    }

    // Find employee names in left column (X < 160)
    const nameItems = row.filter(item =>
      item.x < NAME_COLUMN_MAX_X &&
      item.text.trim().length > 0 &&
      !item.text.match(/^[\d\s\(\)\-]+$/) && // Skip pure numbers/symbols
      !item.text.match(/Deployment/i)
    );

    if (nameItems.length === 0) continue;

    // Extract employee names (may be multiple on same row)
    const employeeNames = [];
    let lastName = '';

    for (const item of nameItems) {
      const text = item.text.trim();
      // Skip role labels
      if (text.match(/Shift Runner|Team Member|Cook|Deployment/i)) continue;
      if (text.length < 3) continue;

      // Check if this looks like a name (has letters)
      if (text.match(/[A-Za-z]{2,}/)) {
        employeeNames.push(text);
      }
    }

    if (employeeNames.length === 0) continue;

    // For each employee name found, look ahead in next 3 rows for their shifts
    for (const empName of employeeNames) {
      console.log(`\n→ Processing: ${empName}`);

      const employee = {
        name: empName,
        role: currentSection || 'Team Member',
        schedule: {}
      };

      let hasAnyShift = false;

      // Look in current row and next 3 rows for shift data
      for (let lookAhead = 0; lookAhead <= 3 && (i + lookAhead) < rows.length; lookAhead++) {
        const searchRow = rows[i + lookAhead];

        // For each day column, find times
        for (const dayCol of dayColumnPositions) {
          // Skip if already found shift for this day
          if (employee.schedule[dayCol.day]) continue;

          // Find all items in this day column
          const itemsInColumn = searchRow.filter(item =>
            item.x >= dayCol.startX - 10 && item.x < dayCol.endX - 10
          );

          if (itemsInColumn.length === 0) continue;

          // Build text from items in column
          const columnText = itemsInColumn
            .map(item => item.text)
            .join('')
            .replace(/\s+/g, '');

          // Try to parse time range
          const timeMatch = columnText.match(/(\d{1,2}(?::\d{2})?)(am|pm)\s*-\s*(\d{1,2}(?::\d{2})?)(am|pm)/i);
          if (timeMatch) {
            const startTime = normalizeTime(timeMatch[1] + timeMatch[2]);
            const endTime = normalizeTime(timeMatch[3] + timeMatch[4]);

            employee.schedule[dayCol.day] = {
              startTime,
              endTime
            };
            hasAnyShift = true;
            console.log(`  ${dayCol.day}: ${startTime} - ${endTime}`);
          }
        }
      }

      // Add employee if they have shifts
      if (hasAnyShift) {
        scheduleData.employees.push(employee);
        console.log(`✓ Added ${empName} (${Object.keys(employee.schedule).length} shifts)`);
      } else {
        console.log(`✗ Skipped ${empName} (no shifts found)`);
      }
    }
  }

  console.log('\n=== PARSING COMPLETE ===');
  console.log(`Total employees: ${scheduleData.employees.length}`);

  return scheduleData;
}

function normalizeTime(timeStr) {
  const match = timeStr.match(/(\d{1,2})(?::(\d{2}))?([ap]m?)/i);
  if (!match) return timeStr;

  const hour = match[1];
  const minute = match[2] || '00';
  const meridiem = match[3].toLowerCase().replace('m', '');

  return `${hour}:${minute}${meridiem}`;
}

export function convertTimeToMilitary(timeStr) {
  if (!timeStr) return '';

  const match = timeStr.match(/(\d{1,2}):(\d{2})(am|pm)/i);
  if (!match) return timeStr;

  let hour = parseInt(match[1]);
  const minute = match[2];
  const meridiem = match[3].toLowerCase();

  if (meridiem === 'pm' && hour !== 12) {
    hour += 12;
  } else if (meridiem === 'am' && hour === 12) {
    hour = 0;
  }

  return `${hour.toString().padStart(2, '0')}:${minute}:00`;
}

export function getDateForDayOfWeek(weekStart, dayOfWeek) {
  const dayMap = {
    'Monday': 0,
    'Tuesday': 1,
    'Wednesday': 2,
    'Thursday': 3,
    'Friday': 4,
    'Saturday': 5,
    'Sunday': 6
  };

  const daysToAdd = dayMap[dayOfWeek] || 0;
  const date = new Date(weekStart);
  date.setDate(date.getDate() + daysToAdd);
  return date.toISOString().split('T')[0];
}
