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

  const page = pdfData.pages[0];
  const items = page.items;

  console.log('=== POSITION-BASED PDF PARSER ===');
  console.log('Page size:', page.width, 'x', page.height);
  console.log('Total items:', items.length);

  // Group items by Y position (rows)
  const rows = [];
  let currentRow = [];
  let currentY = null;

  const sortedItems = [...items].sort((a, b) => {
    if (Math.abs(a.y - b.y) > 3) {
      return a.y - b.y;
    }
    return a.x - b.x;
  });

  sortedItems.forEach(item => {
    if (currentY === null || Math.abs(item.y - currentY) > 3) {
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

  // Debug: Print first 20 rows
  console.log('\n=== FIRST 20 ROWS ===');
  for (let i = 0; i < Math.min(20, rows.length); i++) {
    const rowText = rows[i].map(item => item.text).join(' ');
    console.log(`Row ${i}: ${rowText}`);
  }

  // Find header row with day columns - try multiple patterns
  let dayColumnPositions = [];
  let headerRowIndex = -1;

  for (let i = 0; i < rows.length; i++) {
    const rowText = rows[i].map(item => item.text).join(' ');

    // Pattern 1: "Monday 6 of October Tuesday 7 of October..."
    // Pattern 2: Just "Monday Tuesday Wednesday..."
    if (rowText.includes('Monday') && (rowText.includes('Tuesday') || rowText.includes('of October'))) {
      headerRowIndex = i;
      console.log('\n✓ Found day header row at index', i, ':', rowText);

      const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      const dayPositions = {};

      rows[i].forEach(item => {
        const matchedDay = dayNames.find(day => item.text === day);
        if (matchedDay && !dayPositions[matchedDay]) {
          dayPositions[matchedDay] = item.x;
          console.log(`  ${matchedDay} at X=${item.x}`);
        }
      });

      // Build column boundaries
      const sortedDays = dayNames.filter(day => dayPositions[day]);
      for (let j = 0; j < sortedDays.length; j++) {
        const day = sortedDays[j];
        const startX = dayPositions[day];
        const endX = j < sortedDays.length - 1 ? dayPositions[sortedDays[j + 1]] : page.width;
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

  if (headerRowIndex === -1) {
    console.error('ERROR: Could not find day header row');
    console.log('Looking for rows containing "Monday"...');
    for (let i = 0; i < rows.length; i++) {
      const rowText = rows[i].map(item => item.text).join(' ');
      if (rowText.includes('Monday')) {
        console.log(`  Row ${i}: ${rowText}`);
      }
    }
  }

  // Extract dates from title
  for (let i = 0; i < Math.min(10, rows.length); i++) {
    const rowText = rows[i].map(item => item.text).join(' ');

    if (rowText.includes("'s schedule for") || rowText.includes('schedule for')) {
      const match = rowText.match(/(.+?)\s+(\d+)\s*'?s?\s*schedule for/i);
      if (match) {
        scheduleData.location = match[1].trim();
        scheduleData.locationCode = match[2];
        console.log('Location:', scheduleData.location, scheduleData.locationCode);
      }
    }

    const datePattern = /(\w+\s+\w+\s+\d+\w{0,2},?\s*\d{4})/gi;
    const dateMatches = rowText.match(datePattern);
    if (dateMatches && dateMatches.length >= 2) {
      const startDate = parseDateString(dateMatches[0]);
      const mondayDateMatch = dateMatches[0].match(/\w+\s+\w+\s+(\d+)/);
      if (mondayDateMatch) {
        const mondayDay = parseInt(mondayDateMatch[1]);
        scheduleData.weekStart = new Date(startDate.getFullYear(), startDate.getMonth(), mondayDay);
        scheduleData.weekEnd = parseDateString(dateMatches[1]);
        console.log('Week:', scheduleData.weekStart.toISOString().split('T')[0], 'to', scheduleData.weekEnd.toISOString().split('T')[0]);
      }
      break;
    }
  }

  // If no header row found, return error
  if (dayColumnPositions.length === 0) {
    console.error('ERROR: No day columns found');
    throw new Error('Could not find day column headers in PDF');
  }

  // Find sections and parse employees
  let currentSection = '';
  let employeeCount = 0;

  for (let i = headerRowIndex + 1; i < rows.length; i++) {
    const row = rows[i];
    const rowText = row.map(item => item.text).join(' ');

    // Check for section headers
    if (rowText.match(/Shift Runner|Team Member|Cook/i) && rowText.match(/Deployment/i)) {
      currentSection = rowText.replace(/Deployment/i, '').trim();
      console.log('\n--- Section:', currentSection, '---');
      continue;
    }

    // Skip non-employee rows
    if (!currentSection || rowText.length < 3) {
      continue;
    }

    // Find employee name (leftmost text items before first day column)
    let employeeName = '';
    const nameItems = [];

    for (const item of row) {
      if (item.x < dayColumnPositions[0].startX - 10) {
        nameItems.push(item.text);
      }
    }

    employeeName = nameItems.join(' ').trim();

    // Skip invalid names
    if (employeeName.length < 3 || employeeName.match(/^\d/) || employeeName.includes('of ') || employeeName.includes('Employee')) {
      continue;
    }

    const employee = {
      name: employeeName,
      role: currentSection,
      schedule: {}
    };

    console.log(`\nEmployee: ${employeeName}`);

    // Map items to day columns
    for (const dayCol of dayColumnPositions) {
      const itemsInColumn = row.filter(item =>
        item.x >= dayCol.startX - 10 && item.x < dayCol.endX
      );

      if (itemsInColumn.length === 0) {
        console.log(`  ${dayCol.day}: OFF (no data)`);
        continue;
      }

      const columnText = itemsInColumn.map(i => i.text).join('');

      // Check for OFF indicator
      if (columnText.includes('--') || columnText.trim() === '') {
        console.log(`  ${dayCol.day}: OFF`);
        continue;
      }

      // Extract time range
      const timeMatch = columnText.match(/(\d{1,2}:\d{2}[ap])\s*-?\s*(\d{1,2}:\d{2}[ap])/);
      if (timeMatch) {
        employee.schedule[dayCol.day] = {
          startTime: timeMatch[1],
          endTime: timeMatch[2]
        };
        console.log(`  ${dayCol.day}: ${timeMatch[1]} - ${timeMatch[2]}`);
      } else {
        console.log(`  ${dayCol.day}: Could not parse "${columnText}"`);
      }
    }

    // Add employee if they have at least one shift
    if (Object.keys(employee.schedule).length > 0) {
      scheduleData.employees.push(employee);
      employeeCount++;
      console.log(`✓ Added ${employeeName} with ${Object.keys(employee.schedule).length} shifts`);
    }
  }

  console.log('\n=== PARSING COMPLETE ===');
  console.log('Total employees parsed:', scheduleData.employees.length);

  if (scheduleData.employees.length === 0) {
    console.error('ERROR: No employees were parsed');
    console.log('Current section was:', currentSection);
    console.log('Header row index:', headerRowIndex);
    console.log('Total rows:', rows.length);
  }

  return scheduleData;
}

function parseDateString(dateStr) {
  const cleaned = dateStr.replace(/(\d+)(st|nd|rd|th)/, '$1');
  return new Date(cleaned);
}

export function convertTimeToMilitary(timeStr) {
  const match = timeStr.match(/(\d{1,2}):(\d{2})([ap])/);
  if (!match) return null;

  let hours = parseInt(match[1]);
  const minutes = match[2];
  const meridiem = match[3];

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
