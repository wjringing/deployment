export function parseShiftSchedule(pdfText) {
  const schedule = {
    location: '',
    week: {},
    employees: []
  };

  const locationMatch = pdfText.match(/KFC ([^']+?)\s*'s schedule/i);
  if (locationMatch) {
    schedule.location = 'KFC ' + locationMatch[1].trim();
  }

  const datePattern = /(\d+)\s+of\s+\w+/gi;
  const dates = [...pdfText.matchAll(datePattern)].map(m => parseInt(m[1]));

  if (dates.length >= 7) {
    schedule.week = {
      monday: dates[0],
      tuesday: dates[1],
      wednesday: dates[2],
      thursday: dates[3],
      friday: dates[4],
      saturday: dates[5],
      sunday: dates[6]
    };
  }

  const employeeRoles = {
    'MORGAN MILLINGTON': 'Shift Runner Deployment',
    'Oscar Santalla Abad': 'Shift Runner Deployment',
    'Philip Graham': 'Shift Runner Deployment',
    'William Lander': 'Shift Runner Deployment',
    'Alfie Hopwood': 'Team Member Deployment',
    'Anton Gavrylchyk': 'Team Member Deployment',
    'CLARE ROBERTS': 'Team Member Deployment',
    'Cameron Funnell': 'Team Member Deployment',
    'Chloe Williams': 'Team Member Deployment',
    'Craig Lloyd': 'Team Member Deployment',
    'Daniel Lewis': 'Team Member Deployment',
    'Elsie Horner': 'Team Member Deployment',
    'Evan Anderson': 'Team Member Deployment',
    'Jessica Ford': 'Team Member Deployment',
    'KATE SMITH': 'Team Member Deployment',
    'Lili Martland': 'Team Member Deployment',
    'Max Lloyd': 'Team Member Deployment',
    'Michelle TIMMINS': 'Team Member Deployment',
    'Nicole Chidlow': 'Team Member Deployment',
    'Paige Constantine': 'Team Member Deployment',
    'Rachel Llewellyn': 'Team Member Deployment',
    'SAMANTHA EDWARDS': 'Team Member Deployment',
    'Stanislaw Wasinski': 'Team Member Deployment',
    'Thomas Robinson': 'Team Member Deployment',
    'Brandon Riding': 'Cook Deployment',
    'Callum Nurse': 'Cook Deployment',
    'Dylan Morris': 'Cook Deployment',
    'Thomas Lewis': 'Cook Deployment'
  };

  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  Object.entries(employeeRoles).forEach(([name, role]) => {
    const nameRegex = new RegExp(name + '\\s+([\\s\\S]*?)(?=' + Object.keys(employeeRoles).find(n => n !== name) + '|Cook Deployment|Team Member|Shift Runner|$)', 'i');
    const match = pdfText.match(nameRegex);

    if (match) {
      const scheduleLine = match[1];
      const shifts = parseShiftLine(scheduleLine, days);

      schedule.employees.push({
        name,
        role,
        shifts
      });
    }
  });

  return schedule;
}

function parseShiftLine(line, days) {
  const shifts = [];

  const pattern = /(--|\d{1,2}:\d{2}[ap]\s*-\s*\d{1,2}:\d{2}[ap])/gi;
  const matches = line.match(pattern);

  if (matches) {
    matches.slice(0, 7).forEach((match, index) => {
      if (match !== '--') {
        const timeMatch = match.match(/(\d{1,2}):(\d{2})([ap])\s*-\s*(\d{1,2}):(\d{2})([ap])/i);
        if (timeMatch) {
          shifts.push({
            day: days[index],
            start: formatTime(timeMatch[1], timeMatch[2], timeMatch[3]),
            end: formatTime(timeMatch[4], timeMatch[5], timeMatch[6])
          });
        }
      }
    });
  }

  return shifts;
}

function formatTime(hours, minutes, period) {
  const h = parseInt(hours);
  const p = period.toLowerCase() === 'a' ? 'AM' : 'PM';
  return `${h}:${minutes} ${p}`;
}

export function convertToDayView(schedule) {
  const dayView = Object.keys(schedule.week).map(day => ({
    day: day.charAt(0).toUpperCase() + day.slice(1),
    date: schedule.week[day],
    shifts: []
  }));

  schedule.employees.forEach(employee => {
    employee.shifts.forEach((shift) => {
      const dayIndex = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].indexOf(shift.day);
      if (dayView[dayIndex]) {
        dayView[dayIndex].shifts.push({
          employeeName: employee.name,
          role: employee.role,
          startTime: shift.start,
          endTime: shift.end
        });
      }
    });
  });

  return dayView;
}

export function classifyShift(startTime, endTime) {
  const startMinutes = convertTimeToMinutes(startTime);
  let endMinutes = convertTimeToMinutes(endTime);

  // Handle shifts that end after midnight (12:00 AM - 5:00 AM)
  // If end time is between 12:00 AM and 5:00 AM (0-300 minutes), treat as next day
  if (endMinutes < 300) {
    endMinutes += 1440; // Add 24 hours
  }

  // Day Shift: start > 05:00 (300 minutes) AND end < 18:00 (1080 minutes)
  if (startMinutes > 300 && endMinutes < 1080) {
    return 'Day Shift';
  }

  // Night Shift: start > 13:59 (839 minutes) AND end > 03:00 (180 minutes or 1620+ if after midnight)
  if (startMinutes > 839 && endMinutes > 1620) {
    return 'Night Shift';
  }

  // Both Shifts: start between 05:01 and 14:00 AND end between 18:00 and 22:00
  if (startMinutes > 300 && startMinutes < 840 && endMinutes >= 1080 && endMinutes <= 1320) {
    return 'Both Shifts';
  }

  // Night Shift: anything else starting after 13:59
  if (startMinutes > 839) {
    return 'Night Shift';
  }

  // Default to Night Shift for early morning or late night shifts
  return 'Night Shift';
}

function convertTimeToMinutes(timeString) {
  const match = timeString.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!match) return 0;

  let hours = parseInt(match[1]);
  const minutes = parseInt(match[2]);
  const period = match[3].toUpperCase();

  if (period === 'PM' && hours !== 12) {
    hours += 12;
  } else if (period === 'AM' && hours === 12) {
    hours = 0;
  }

  return hours * 60 + minutes;
}
