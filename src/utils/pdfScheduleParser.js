/**
 * Parses KFC TeamLive PDF schedules using position-based text extraction
 * Works with extracted data from ScheduleUploadPage's extractTextFromPDF
 */

/**
 * Main parser function - receives extracted PDF data with positions
 */
export function parseSchedulePDF(extractedData) {
  console.log('=== PARSING PDF SCHEDULE ===');

  // Flatten all items from all pages
  const allItems = [];

  if (extractedData.pages) {
    for (let pageIndex = 0; pageIndex < extractedData.pages.length; pageIndex++) {
      const pageData = extractedData.pages[pageIndex];
      const items = pageData.items || [];

      console.log(`Page ${pageIndex + 1}: ${items.length} items`);

      for (const item of items) {
        allItems.push({
          text: item.text,
          x: item.x,
          y: item.y,
          pageIndex: pageIndex
        });
      }
    }
  }

  console.log('Total items across all pages:', allItems.length);

  // 1. Find location (from header)
  const locationText = allItems.find(item => item.text.includes('KFC'))?.text || 'Unknown Location';
  const locationMatch = locationText.match(/KFC\s+(.+?)\s+[-\d]/);
  const location = locationMatch ? locationMatch[1].trim() : locationText;

  console.log('Location:', location);

  // Debug: Show items that contain day names to understand the structure
  console.log('\n=== SEARCHING FOR DAY HEADERS ===');
  const headerRelatedItems = allItems.filter(i =>
    i.text.includes('Mon') || i.text.includes('Tue') || i.text.includes('Wed') ||
    i.text.includes('Employees') || i.text === 'Person'
  );
  console.log('Header-related items:');
  headerRelatedItems.forEach(i =>
    console.log(`  "${i.text}" at x=${i.x.toFixed(1)}, y=${i.y.toFixed(1)}`)
  );

  // 2. Find the day header row and extract column positions
  const dayHeaders = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  let dayColumnPositions = [];

  // Search for day headers - look for "Mon" followed by other days
  for (const item of allItems) {
    if (item.text === 'Mon') {
      const dayHeaderY = item.y;

      console.log(`Checking Mon at x=${item.x.toFixed(1)}, y=${item.y.toFixed(1)}`);

      // Find all day headers at approximately this Y position
      const headersAtY = allItems.filter(i =>
        Math.abs(i.y - dayHeaderY) < 5 &&
        dayHeaders.includes(i.text)
      ).sort((a, b) => a.x - b.x);

      console.log(`  Found ${headersAtY.length} day headers:`, headersAtY.map(h => `${h.text}(${h.x.toFixed(1)})`).join(', '));

      if (headersAtY.length >= 7) {
        dayColumnPositions = headersAtY.map(h => ({
          day: h.text,
          x: h.x
        }));
        console.log('✓ Found day headers:', dayColumnPositions.map(d => `${d.day}@${d.x.toFixed(1)}`).join(', '));
        break;
      }
    }
  }

  if (dayColumnPositions.length === 0) {
    throw new Error('Could not find day column headers in PDF');
  }

  // 3. Find ALL employee names (name-like text in left column)
  const NAME_COLUMN_MAX_X = 160;
  const employeeItems = [];

  console.log('\n=== FINDING EMPLOYEE NAMES ===');

  for (const item of allItems) {
    const text = item.text.trim();

    // Must be in left column
    if (item.x >= NAME_COLUMN_MAX_X) continue;

    // Must look like a name (capitalized words)
    if (!text.match(/[A-Z][a-z]+/)) continue;
    if (text.match(/^[\d\s\(\)\-]+$/)) continue;
    if (text.length < 3) continue;

    // Skip role labels, headers, and other non-name text
    if (text.match(/Deployment|Unassigned|Position|Shift Runner|Team Member|Cook|Person|Employee/i)) continue;

    // This looks like an employee name
    employeeItems.push({
      name: text,
      x: item.x,
      y: item.y,
      pageIndex: item.pageIndex
    });

    console.log(`Found: ${text} at Y=${item.y.toFixed(1)} (page ${item.pageIndex + 1})`);
  }

  console.log(`\nTotal employee names found: ${employeeItems.length}`);

  // 4. For each employee, find their shifts by looking for times near their Y-coordinate
  const employees = [];
  const Y_SEARCH_RANGE = 30; // Search ±30 pixels from name's Y position

  for (const empItem of employeeItems) {
    console.log(`\n→ Processing: ${empItem.name}`);

    const employee = {
      name: empItem.name,
      role: null,
      schedule: {}
    };

    let hasAnyShift = false;

    // For each day column, look for time patterns near the employee's Y coordinate
    for (const dayCol of dayColumnPositions) {
      const dayName = dayCol.day;

      // Find all text items in this column's X range and near employee's Y
      const COLUMN_WIDTH = 100; // Width of each day column
      const columnItems = allItems.filter(item =>
        item.x >= dayCol.x - 10 &&
        item.x <= dayCol.x + COLUMN_WIDTH &&
        Math.abs(item.y - empItem.y) <= Y_SEARCH_RANGE &&
        item.pageIndex === empItem.pageIndex // Same page
      );

      // Combine text from this column area
      const columnText = columnItems
        .sort((a, b) => a.y - b.y)
        .map(i => i.text)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();

      if (!columnText || columnText.length < 3) continue;

      // Try to extract time pattern (e.g., "11:30am - 5pm", "12pm - 8pm")
      const timePattern = /(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\s*[-–]\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i;
      const match = columnText.match(timePattern);

      if (match) {
        const startStr = match[1].trim();
        const endStr = match[2].trim();

        try {
          const startTime = parseTime(startStr);
          const endTime = parseTime(endStr);

          if (startTime && endTime) {
            const fullDayName = getDayName(dayName);
            employee.schedule[fullDayName] = {
              start: startTime,
              end: endTime
            };
            hasAnyShift = true;
            console.log(`  ${dayName}: ${startTime} - ${endTime}`);
          }
        } catch (error) {
          console.log(`  ${dayName}: Parse error - ${error.message}`);
        }
      }
    }

    if (hasAnyShift) {
      employees.push(employee);
      console.log(`✓ Added ${employee.name} (${Object.keys(employee.schedule).length} shifts)`);
    } else {
      console.log(`✗ Skipped ${employee.name} (no shifts found)`);
    }
  }

  console.log('\n=== PARSING COMPLETE ===');
  console.log(`Total employees with shifts: ${employees.length}`);

  return {
    location,
    weekStart: new Date(),
    employees
  };
}

/**
 * Parse a time string like "5 pm", "11:30am", "12pm" into 24-hour format
 */
function parseTime(timeStr) {
  timeStr = timeStr.toLowerCase().trim();

  let hours = 0;
  let minutes = 0;
  let isPM = timeStr.includes('pm');
  let isAM = timeStr.includes('am');

  // Remove am/pm markers and extra spaces
  timeStr = timeStr.replace(/[apm\s]/g, '');

  // Parse hours and minutes
  if (timeStr.includes(':')) {
    const [h, m] = timeStr.split(':');
    hours = parseInt(h);
    minutes = parseInt(m);
  } else {
    hours = parseInt(timeStr);
  }

  if (isNaN(hours) || isNaN(minutes)) {
    throw new Error(`Invalid time: ${timeStr}`);
  }

  // Convert to 24-hour format
  if (isPM && hours < 12) {
    hours += 12;
  } else if (isAM && hours === 12) {
    hours = 0;
  }

  // If no AM/PM specified, use context
  if (!isPM && !isAM) {
    // Times 1-6 without AM/PM are likely PM (afternoon/evening shifts)
    if (hours >= 1 && hours <= 6) {
      hours += 12;
    }
  }

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

/**
 * Convert abbreviated day to full name
 */
function getDayName(abbr) {
  const days = {
    'Mon': 'Monday',
    'Tue': 'Tuesday',
    'Wed': 'Wednesday',
    'Thu': 'Thursday',
    'Fri': 'Friday',
    'Sat': 'Saturday',
    'Sun': 'Sunday'
  };
  return days[abbr] || abbr;
}

/**
 * Convert time to military format (already in 24-hour format from parseTime)
 */
export function convertTimeToMilitary(timeStr) {
  return timeStr;
}

/**
 * Get date for day of week
 */
export function getDateForDayOfWeek(dayName, weekStart) {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayIndex = days.indexOf(dayName);

  if (dayIndex === -1) return weekStart;

  const date = new Date(weekStart);
  const currentDay = date.getDay();
  const daysToAdd = (dayIndex - currentDay + 7) % 7;
  date.setDate(date.getDate() + daysToAdd);

  return date;
}
