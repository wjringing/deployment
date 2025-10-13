// Time calculation utilities
// Centralized functions for work hours and break time calculations

export const convertTo24Hour = (timeStr) => {
  if (!timeStr || typeof timeStr !== 'string') {
    return null;
  }

  const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (match) {
    let hours = parseInt(match[1]);
    const minutes = parseInt(match[2]);
    const period = match[3].toUpperCase();

    if (period === 'PM' && hours !== 12) {
      hours += 12;
    } else if (period === 'AM' && hours === 12) {
      hours = 0;
    }

    return { hours, minutes };
  }

  const parts = timeStr.split(':');
  if (parts.length === 2) {
    const hours = parseInt(parts[0]);
    const minutes = parseInt(parts[1]);
    if (!isNaN(hours) && !isNaN(minutes)) {
      return { hours, minutes };
    }
  }

  return null;
};

export const calculateWorkHours = (startTime, endTime) => {
  if (!startTime || !endTime || typeof startTime !== 'string' || typeof endTime !== 'string') {
    return 0;
  }

  const startConverted = convertTo24Hour(startTime);
  const endConverted = convertTo24Hour(endTime);

  if (!startConverted || !endConverted) {
    return 0;
  }

  if (isNaN(startConverted.hours) || isNaN(startConverted.minutes) ||
      isNaN(endConverted.hours) || isNaN(endConverted.minutes)) {
    return 0;
  }

  let start = startConverted.hours + startConverted.minutes / 60;
  let end = endConverted.hours + endConverted.minutes / 60;

  if (end < start) {
    end += 24;
  }

  return end - start;
};

export const calculateBreakTime = (staffMember, workHours) => {
  if (staffMember?.is_under_18) {
    return workHours >= 4.5 ? 30 : 0;
  }

  if (workHours >= 6) return 30;
  if (workHours >= 4.5) return 15;
  return 0;
};

export const formatTimeDisplay = (hours) => {
  if (typeof hours !== 'number' || isNaN(hours)) {
    return '0.0h';
  }
  return `${hours.toFixed(1)}h`;
};