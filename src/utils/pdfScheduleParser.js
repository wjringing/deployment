export function parseSchedulePDF(pdfText) {
  const lines = pdfText.split('\n').map(line => line.trim()).filter(line => line.length > 0);

  const scheduleData = {
    location: '',
    locationCode: '',
    weekStart: null,
    weekEnd: null,
    employees: []
  };

  let currentSection = '';
  const dayHeaders = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  let foundDayHeaderLine = false;
  let actualDayOrder = [];

  console.log('Parsing PDF with', lines.length, 'lines');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Parse location
    if (line.includes("'s schedule for") || line.includes("schedule for")) {
      const match = line.match(/^(.+?)\s+(\d+)\s*'?s?\s*schedule for/i);
      if (match) {
        scheduleData.location = match[1].trim();
        scheduleData.locationCode = match[2];
        console.log('Found location:', scheduleData.location, scheduleData.locationCode);
      }
    }

    // Parse date range - look for the pattern with actual dates
    const datePattern = /(\w+\s+\w+\s+\d+\w{0,2},?\s*\d{4})/gi;
    const dateMatches = line.match(datePattern);
    if (dateMatches && dateMatches.length >= 2) {
      scheduleData.weekStart = parseDateString(dateMatches[0]);
      scheduleData.weekEnd = parseDateString(dateMatches[1]);
      console.log('Found dates:', scheduleData.weekStart, scheduleData.weekEnd);
    }

    // Check for day header line with dates (e.g., "Monday 6 Tuesday 7...")
    if (!foundDayHeaderLine && line.match(/Monday\s+\d+/i)) {
      foundDayHeaderLine = true;
      actualDayOrder = [];

      // Extract the day-date pattern
      const dayDatePattern = /(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\s+(\d+)/gi;
      let match;
      while ((match = dayDatePattern.exec(line)) !== null) {
        actualDayOrder.push({
          day: match[1],
          date: parseInt(match[2])
        });
      }
      console.log('Found day order with dates:', actualDayOrder);

      // If we found the dates in the header, use them to correct the week start date
      if (actualDayOrder.length > 0 && scheduleData.weekStart) {
        const firstDayDate = actualDayOrder[0].date;
        const parsedDate = new Date(scheduleData.weekStart);

        // Adjust the date if needed
        if (parsedDate.getDate() !== firstDayDate) {
          parsedDate.setDate(firstDayDate);
          scheduleData.weekStart = parsedDate;
          console.log('Corrected week start to:', scheduleData.weekStart);
        }
      }
      continue;
    }

    // Detect section headers
    if (line.match(/Shift Runner|Team Member|Cook/i) && line.match(/Deployment/i)) {
      currentSection = line.replace(/Deployment/i, '').trim();
      console.log('Found section:', currentSection);
      continue;
    }

    // Skip header rows
    if (line.includes('Employee') || (dayHeaders.some(day => line.toLowerCase().includes(day.toLowerCase())) && !line.match(/\d{1,2}:\d{2}[ap]/))) {
      continue;
    }

    // Parse employee data
    if (currentSection) {
      // Look for time patterns in the line
      const timePattern = /\d{1,2}:\d{2}[ap]/g;
      const times = line.match(timePattern);

      if (times && times.length >= 2) {
        // Extract employee name (text before first time)
        const firstTimeIndex = line.indexOf(times[0]);
        const employeeName = line.substring(0, firstTimeIndex).trim();

        if (employeeName && employeeName.length > 2 && !employeeName.includes('of ') && !employeeName.match(/^\d/)) {
          const employee = {
            name: employeeName,
            role: currentSection,
            schedule: {}
          };

          // Parse all time ranges in the line
          let dayIndex = 0;
          for (let t = 0; t < times.length && dayIndex < dayHeaders.length; t += 2) {
            if (t + 1 < times.length) {
              employee.schedule[dayHeaders[dayIndex]] = {
                startTime: times[t],
                endTime: times[t + 1]
              };
              dayIndex++;
            }
          }

          if (Object.keys(employee.schedule).length > 0) {
            scheduleData.employees.push(employee);
            console.log('Added employee:', employee.name, 'with', Object.keys(employee.schedule).length, 'shifts');
          }
        }
      }
    }
  }

  console.log('Total employees parsed:', scheduleData.employees.length);
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
