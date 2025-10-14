/**
 * Enhanced Schedule Parser - Supports both Day and Week schedules
 * Maintains backward compatibility with existing week schedule parsing
 */

import { classifyShift } from './scheduleParser';

/**
 * Detects whether the PDF contains a day schedule or week schedule
 * @param {string} pdfText - Extracted PDF text
 * @returns {Object} Detection result with type and confidence
 */
export function detectScheduleType(pdfText) {
  const dayScheduleIndicators = [
    /schedule for\s+(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\s+\w+\s+\d{1,2}(st|nd|rd|th)?[,\s]+202\d/i,
    /(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(st|nd|rd|th)?[,\s]+202\d/i,
    /Time In\s+Time Out/i
  ];

  const weekScheduleIndicators = [
    /(\d+)\s+of\s+\w+/gi
  ];

  let dayScore = 0;
  let weekScore = 0;

  dayScheduleIndicators.forEach(pattern => {
    if (pattern.test(pdfText)) dayScore++;
  });

  weekScheduleIndicators.forEach(pattern => {
    if (pattern.test(pdfText)) weekScore++;
  });

  const dateMatches = [...pdfText.matchAll(/(\d+)\s+of\s+\w+/gi)];
  if (dateMatches.length >= 7) {
    weekScore += 3;
  } else if (dateMatches.length === 0) {
    dayScore += 2;
  }

  return {
    type: dayScore > weekScore ? 'day' : 'week',
    confidence: Math.max(dayScore, weekScore),
    dayScore,
    weekScore
  };
}

/**
 * Parse shift schedule from PDF text - supports both day and week formats
 * @param {string} pdfText - Extracted PDF text
 * @returns {Object} Parsed schedule data with scheduleType indicator
 */
export function parseShiftScheduleEnhanced(pdfText) {
  const scheduleType = detectScheduleType(pdfText);

  if (scheduleType.type === 'day') {
    return parseDaySchedule(pdfText);
  } else {
    return parseWeekSchedule(pdfText);
  }
}

/**
 * Parse a single day schedule
 * @param {string} pdfText - Extracted PDF text
 * @returns {Object} Parsed schedule data
 */
function parseDaySchedule(pdfText) {
  const schedule = {
    location: '',
    scheduleType: 'day',
    week: {},
    employees: [],
    singleDay: null
  };

  const locationMatch = pdfText.match(/KFC ([^']+?)\s*'s schedule/i);
  if (locationMatch) {
    schedule.location = 'KFC ' + locationMatch[1].trim();
  }

  const dayDateMatch = pdfText.match(/(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})(st|nd|rd|th)?[,\s]+(202\d)/i);

  if (dayDateMatch) {
    const dayName = dayDateMatch[1].toLowerCase();
    const monthName = dayDateMatch[2];
    const dayNumber = parseInt(dayDateMatch[3]);
    const year = parseInt(dayDateMatch[5]);

    const monthMap = {
      'january': 0, 'february': 1, 'march': 2, 'april': 3,
      'may': 4, 'june': 5, 'july': 6, 'august': 7,
      'september': 8, 'october': 9, 'november': 10, 'december': 11
    };

    const monthIndex = monthMap[monthName.toLowerCase()];

    schedule.singleDay = {
      dayName,
      date: dayNumber,
      month: monthIndex,
      year,
      fullDate: new Date(year, monthIndex, dayNumber)
    };

    schedule.week[dayName] = dayNumber;
  }

  const roles = ['Shift Runner Deployment', 'Cook Deployment', 'Team Member Deployment'];

  roles.forEach(role => {
    const roleRegex = new RegExp(`${role}[\\s\\S]*?(?=(?:Shift Runner Deployment|Cook Deployment|Team Member Deployment|Schedule day notes|$))`, 'i');
    const roleMatch = pdfText.match(roleRegex);

    if (roleMatch) {
      const roleSection = roleMatch[0];
      const employeeMatches = [...roleSection.matchAll(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+|[A-Z\s]+)\s+Not Categorized\s+(\d{1,2}:\d{2}\s*[ap]m)\s+(\d{1,2}:\d{2}\s*[ap]m)/gi)];

      employeeMatches.forEach(match => {
        const employeeName = match[1].trim();
        const timeIn = match[2].trim();
        const timeOut = match[3].trim();

        const shifts = [{
          day: schedule.singleDay.dayName,
          start: formatTime12Hour(timeIn),
          end: formatTime12Hour(timeOut)
        }];

        schedule.employees.push({
          name: employeeName,
          role: role,
          shifts: shifts
        });
      });
    }
  });

  return schedule;
}

/**
 * Parse a full week schedule (maintains original functionality)
 * @param {string} pdfText - Extracted PDF text
 * @returns {Object} Parsed schedule data
 */
function parseWeekSchedule(pdfText) {
  const schedule = {
    location: '',
    scheduleType: 'week',
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
    'Susan Richards': 'Team Member Deployment',
    'Thomas Robinson': 'Team Member Deployment',
    'Brandon Riding': 'Cook Deployment',
    'Callum Nurse': 'Cook Deployment',
    'Dylan Morris': 'Cook Deployment',
    'Shane Whiteley': 'Cook Deployment',
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

/**
 * Format time string from 12-hour format to standard format
 * @param {string} timeStr - Time string (e.g., "3:00 pm" or "3:00pm")
 * @returns {string} Formatted time (e.g., "3:00 PM")
 */
function formatTime12Hour(timeStr) {
  const match = timeStr.match(/(\d{1,2}):(\d{2})\s*([ap])m?/i);
  if (!match) return timeStr;

  const hours = match[1];
  const minutes = match[2];
  const period = match[3].toUpperCase();

  return `${hours}:${minutes} ${period}M`;
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

export { classifyShift };
