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

  // Debug: dump first 50 text items to see structure
  console.log('\n=== FIRST 50 TEXT ITEMS (RAW) ===');
  extractedData.pages[0].items.slice(0, 50).forEach((item, idx) => {
    console.log(`${idx}: x=${item.x.toFixed(1)} y=${item.y.toFixed(1)} "${item.text}"`);
  });

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

  // Debug: Show ALL rows to understand structure
  console.log('\n=== ALL ROWS (showing left column text) ===');
  for (let i = 0; i < rows.length; i++) {
    const leftText = rows[i].filter(item => item.x < 160).map(item => item.text).join(' ').trim();
    if (leftText && !leftText.match(/^[\s\(\)\-]+$/)) {
      console.log(`Row ${i}: "${leftText}"`);
    }
  }

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
      console.log('Column boundaries:', dayColumnPositions.map(d => `${d.day}: ${d.startX.toFixed(1)}-${d.endX.toFixed(1)}`).join(', '));
      break;
    }
  }

  if (headerRowIndex === -1 || dayColumnPositions.length === 0) {
    throw new Error('Could not find day column headers in PDF');
  }

  // Parse employees with multi-row lookahead
  const NAME_COLUMN_MAX_X = 160; // Names are at X≈64, well before day columns start
  let currentSection = '';

  // Process ALL rows, not just after first header (employees can be on any page)
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowText = row.map(item => item.text).join(' ');

    // Skip day header rows
    if (rowText.match(/Mon\s+\d+.*Tue\s+\d+.*Wed\s+\d+/)) {
      continue;
    }

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

    // Debug: log found names
    if (employeeNames.length > 0) {
      console.log(`Row ${i}: Found names: ${employeeNames.join(', ')}`);
    }

    // For each employee name found, look ahead in next 3 rows for their shifts
    for (const empName of employeeNames) {
      console.log(`\n→ Processing: ${empName}`);

      const employee = {
        name: empName,
        role: currentSection || 'Team Member',
        schedule: {}
      };

      let hasAnyShift = false;

      // For each day column, collect text from current and next 2 rows
      for (const dayCol of dayColumnPositions) {
        let columnTextParts = [];

        // Collect text from current row and next 2 rows
        for (let lookAhead = 0; lookAhead <= 2 && (i + lookAhead) < rows.length; lookAhead++) {
          const searchRow = rows[i + lookAhead];

          // Tighter column boundaries - only 5px tolerance
          const itemsInColumn = searchRow.filter(item =>
            item.x >= dayCol.startX && item.x < dayCol.endX - 5
          );

          if (itemsInColumn.length > 0) {
            const rowText = itemsInColumn.map(item => item.text).join(' ').trim();
            if (rowText.length > 0) {
              columnTextParts.push(rowText);
            }
          }
        }

        // Combine all parts
        let columnText = columnTextParts.join(' ').trim();

        if (columnText.length === 0) continue;

        // Filter out non-time text: role codes, day names, etc.
        columnText = columnText
          .replace(/\b(SH|CO|TM)\s*\([^)]*\)/gi, '') // Remove role codes like "SH (-)"
          .replace(/\b(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+\d+\b/gi, '') // Remove day headers
          .replace(/\s+/g, ' ') // Normalize whitespace
          .trim();

        if (columnText.length === 0) continue;

        // Debug output
        console.log(`  ${dayCol.day}: "${columnText}"`);

        // Try to parse time range - first try complete range
        let timeMatch = columnText.match(/(\d{1,2}(?::\d{2})?)\s*(am|pm)\s*-\s*(\d{1,2}(?::\d{2})?)\s*(am|pm)/i);

        if (!timeMatch) {
          // Try incomplete range and infer missing am/pm
          const partialMatch = columnText.match(/(\d{1,2}(?::\d{2})?)\s*(am|pm)\s*-\s*(\d{1,2}(?::\d{2})?)\b/i);
          if (partialMatch) {
            const startHour = parseInt(partialMatch[1].split(':')[0]);
            const startPeriod = partialMatch[2].toLowerCase();
            const endHour = parseInt(partialMatch[3].split(':')[0]);

            // Smart inference of end period
            let endPeriod = startPeriod;

            if (endHour === 12) {
              // End is 12 → midnight (12 am)
              endPeriod = 'am';
            } else if (startPeriod === 'pm') {
              // Start is PM
              if (startHour === 12) {
                // Start is noon (12 pm), end is same day if reasonable
                endPeriod = endHour >= 1 && endHour <= 11 ? 'pm' : 'am';
              } else if (endHour < startHour) {
                // End hour less than start hour → crosses midnight
                endPeriod = 'am';
              } else {
                // End hour >= start hour → same period
                endPeriod = 'pm';
              }
            } else {
              // Start is AM
              if (endHour > startHour || endHour === 12) {
                // End hour greater → likely same period or noon
                endPeriod = endHour === 12 ? 'pm' : 'am';
              } else {
                // End hour less than start → crosses to pm
                endPeriod = 'pm';
              }
            }

            columnText = `${partialMatch[1]} ${startPeriod} - ${partialMatch[3]} ${endPeriod}`;
            timeMatch = columnText.match(/(\d{1,2}(?::\d{2})?)\s*(am|pm)\s*-\s*(\d{1,2}(?::\d{2})?)\s*(am|pm)/i);
          }
        }

        if (timeMatch) {
          const startTime = normalizeTime(timeMatch[1] + timeMatch[2]);
          const endTime = normalizeTime(timeMatch[3] + timeMatch[4]);

          employee.schedule[dayCol.day] = {
            startTime,
            endTime
          };
          hasAnyShift = true;
          console.log(`    ✓ ${startTime} - ${endTime}`);
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
