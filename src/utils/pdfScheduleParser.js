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

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.includes("'s schedule for")) {
      const match = line.match(/^(.+?)\s+(\d+)'s schedule for/);
      if (match) {
        scheduleData.location = match[1].trim();
        scheduleData.locationCode = match[2];
      }
    }

    if (line.match(/^\w+ \w+ \d+.*\w+ \w+ \d+.*\d{4}$/)) {
      const dateMatch = line.match(/(\w+ \w+ \d+\w{2}, \d{4})/g);
      if (dateMatch && dateMatch.length >= 2) {
        scheduleData.weekStart = parseDateString(dateMatch[0]);
        scheduleData.weekEnd = parseDateString(dateMatch[1]);
      }
    }

    if (line.includes('Shift Runner Deployment') ||
        line.includes('Team Member Deployment') ||
        line.includes('Cook Deployment')) {
      currentSection = line.replace(' Deployment', '').trim();
      continue;
    }

    if (currentSection && !line.includes('Employee') && !dayHeaders.some(day => line.startsWith(day))) {
      const parts = line.split(/\s{2,}/);

      if (parts.length > 1) {
        const employeeName = parts[0].trim();

        if (employeeName && !employeeName.includes('of October') && employeeName.length > 2) {
          const employee = {
            name: employeeName,
            role: currentSection,
            schedule: {}
          };

          for (let j = 0; j < dayHeaders.length && j + 1 < parts.length; j++) {
            const shiftText = parts[j + 1].trim();

            if (shiftText && shiftText !== '--') {
              const timeMatch = shiftText.match(/(\d{1,2}:\d{2}[ap])\s*-\s*(\d{1,2}:\d{2}[ap])/);

              if (timeMatch) {
                employee.schedule[dayHeaders[j]] = {
                  startTime: timeMatch[1],
                  endTime: timeMatch[2]
                };
              }
            }
          }

          if (Object.keys(employee.schedule).length > 0) {
            scheduleData.employees.push(employee);
          }
        }
      }
    }
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
