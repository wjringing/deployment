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
  let dayColumnDates = {};

  console.log('Parsing PDF with', lines.length, 'lines');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.includes("'s schedule for") || line.includes("schedule for")) {
      const match = line.match(/^(.+?)\s+(\d+)\s*'?s?\s*schedule for/i);
      if (match) {
        scheduleData.location = match[1].trim();
        scheduleData.locationCode = match[2];
        console.log('Found location:', scheduleData.location, scheduleData.locationCode);
      }
    }

    const datePattern = /(\w+\s+\w+\s+\d+\w{0,2},?\s*\d{4})/gi;
    const dateMatches = line.match(datePattern);
    if (dateMatches && dateMatches.length >= 2) {
      scheduleData.weekStart = parseDateString(dateMatches[0]);
      scheduleData.weekEnd = parseDateString(dateMatches[1]);
      console.log('Found dates from title:', scheduleData.weekStart, scheduleData.weekEnd);
    }

    if (line.match(/Monday\s+\d+\s+of\s+October/i)) {
      const dayDatePattern = /(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\s+(\d+)\s+of\s+\w+/gi;
      let match;
      while ((match = dayDatePattern.exec(line)) !== null) {
        const dayName = match[1];
        const dayDate = parseInt(match[2]);
        dayColumnDates[dayName] = dayDate;
        console.log(`Found column header: ${dayName} = ${dayDate}`);
      }

      if (Object.keys(dayColumnDates).length > 0) {
        const mondayDate = dayColumnDates['Monday'];
        if (mondayDate && scheduleData.weekStart) {
          const year = scheduleData.weekStart.getFullYear();
          const month = scheduleData.weekStart.getMonth();
          scheduleData.weekStart = new Date(year, month, mondayDate);
          console.log('Corrected week start to:', scheduleData.weekStart);
        }
      }
      continue;
    }

    if (line.match(/Shift Runner|Team Member|Cook/i) && line.match(/Deployment/i)) {
      currentSection = line.replace(/Deployment/i, '').trim();
      console.log('Found section:', currentSection);
      continue;
    }

    if (line.includes('Employee') || line.includes('of October')) {
      continue;
    }

    if (currentSection) {
      const timePattern = /(\d{1,2}:\d{2}[ap])\s*-\s*(\d{1,2}:\d{2}[ap])/g;
      const shiftMatches = [];
      let match;

      while ((match = timePattern.exec(line)) !== null) {
        shiftMatches.push({
          start: match[1],
          end: match[2],
          fullMatch: match[0]
        });
      }

      if (shiftMatches.length > 0) {
        const firstShiftIndex = line.indexOf(shiftMatches[0].fullMatch);
        const employeeName = line.substring(0, firstShiftIndex).trim();

        if (employeeName && employeeName.length > 2 && !employeeName.match(/^\d/) && !employeeName.includes('of ')) {
          const employee = {
            name: employeeName,
            role: currentSection,
            schedule: {}
          };

          let remainingLine = line;
          let dayIndex = 0;

          for (const shift of shiftMatches) {
            if (dayIndex < dayHeaders.length) {
              employee.schedule[dayHeaders[dayIndex]] = {
                startTime: shift.start,
                endTime: shift.end
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
