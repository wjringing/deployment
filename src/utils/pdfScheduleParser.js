/**
 * Parses KFC TeamLive PDF schedules using position-based text extraction
 * NEW APPROACH: Find employee names directly, then search for shifts near their Y-coordinate
 */

export async function parsePDFSchedule(file) {
  const pdfjsLib = window['pdfjs-dist/build/pdf'];
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

  console.log('=== POSITION-BASED PDF PARSER ===');

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  console.log('Total pages:', pdf.numPages);

  // Extract all text items with positions from all pages
  const allItems = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    const viewport = page.getViewport({ scale: 1.0 });

    for (const item of textContent.items) {
      allItems.push({
        text: item.str,
        x: item.transform[4],
        y: viewport.height - item.transform[5],
        pageIndex: pageNum - 1
      });
    }

    console.log(`\nPage ${pageNum}: ${viewport.width}x${viewport.height}, ${textContent.items.length} items`);
  }

  console.log('\nTotal items across all pages:', allItems.length);

  // 1. Find location (from header)
  const locationText = allItems.find(item => item.text.includes('KFC'))?.text || 'Unknown Location';
  const locationMatch = locationText.match(/KFC\s+(.+?)\s+\d{4}/);
  const location = locationMatch ? locationMatch[1].trim() : locationText;

  console.log('Location:', location);

  // 2. Find the day header row and extract column positions
  const dayHeaders = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  let dayColumnPositions = [];
  let dayHeaderY = null;

  // Search for a row that has all day headers
  for (const item of allItems) {
    if (item.text === 'Mon' && item.x > 200) {
      dayHeaderY = item.y;

      // Find all day headers at this Y position
      const headersAtY = allItems.filter(i =>
        Math.abs(i.y - dayHeaderY) < 3 &&
        dayHeaders.includes(i.text)
      ).sort((a, b) => a.x - b.x);

      if (headersAtY.length >= 7) {
        dayColumnPositions = headersAtY.map(h => ({
          day: h.text,
          x: h.x
        }));
        console.log('\n✓ Found day header row at Y:', dayHeaderY);
        break;
      }
    }
  }

  console.log('Day columns detected:', dayColumnPositions.length);

  if (dayColumnPositions.length === 0) {
    throw new Error('Could not find day column headers in PDF');
  }

  // 3. Find ALL employee names (name-like text in left column, X < 160)
  const NAME_COLUMN_MAX_X = 160;
  const employeeItems = [];

  console.log('\n\n=== FINDING ALL EMPLOYEE NAMES ===');

  for (const item of allItems) {
    const text = item.text.trim();

    // Must be in left column
    if (item.x >= NAME_COLUMN_MAX_X) continue;

    // Must look like a name (2+ letter words, no pure numbers)
    if (!text.match(/[A-Z][a-z]+/)) continue;
    if (text.match(/^[\d\s\(\)\-]+$/)) continue;
    if (text.length < 3) continue;

    // Skip role labels and other non-name text
    if (text.match(/Deployment|Unassigned|Position|Shift Runner|Team Member|Cook/i)) continue;

    // This looks like an employee name
    employeeItems.push({
      name: text,
      x: item.x,
      y: item.y,
      pageIndex: item.pageIndex
    });
  }

  console.log(`Found ${employeeItems.length} potential employee names`);

  // 4. For each employee, find their shifts by looking for times near their Y-coordinate
  const employees = [];
  const Y_SEARCH_RANGE = 25; // Search ±25 pixels from name's Y position

  for (const empItem of employeeItems) {
    console.log(`\n→ Processing: ${empItem.name} (Y=${empItem.y.toFixed(1)}, page ${empItem.pageIndex + 1})`);

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

      if (!columnText) continue;

      console.log(`  ${dayName}: "${columnText}"`);

      // Try to extract time pattern
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
            console.log(`    ✓ ${startTime} - ${endTime}`);
          }
        } catch (error) {
          console.log(`    ✗ Parse error: ${error.message}`);
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
  console.log('Total employees:', employees.length);

  return {
    location,
    weekStart: new Date(), // You may want to extract this from the PDF
    employees
  };
}

/**
 * Parse a time string like "5 pm", "11:30", "12am" into 24-hour format
 */
function parseTime(timeStr) {
  timeStr = timeStr.toLowerCase().trim();

  let hours = 0;
  let minutes = 0;
  let isPM = timeStr.includes('pm') || timeStr.includes('p');
  let isAM = timeStr.includes('am') || timeStr.includes('a');

  // Remove am/pm markers
  timeStr = timeStr.replace(/[apm\s]/g, '');

  // Parse hours and minutes
  if (timeStr.includes(':')) {
    const [h, m] = timeStr.split(':');
    hours = parseInt(h);
    minutes = parseInt(m);
  } else {
    hours = parseInt(timeStr);
  }

  // Convert to 24-hour format
  if (isPM && hours < 12) {
    hours += 12;
  } else if (isAM && hours === 12) {
    hours = 0;
  }

  // If no AM/PM specified, use context
  if (!isPM && !isAM) {
    // Times 1-6 without AM/PM are likely PM (closing shifts)
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
 * Legacy function for backwards compatibility
 */
export function parseSchedulePDF(extractedData) {
  // This is just a wrapper that returns the extracted data
  // The actual parsing is done by parsePDFSchedule
  return extractedData;
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
