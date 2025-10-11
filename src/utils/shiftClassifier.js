export function classifyShift(startTime, endTime) {
  const start = parseTime(startTime);
  const end = parseTime(endTime);

  const isOvernight = end <= start;

  const DAY_SHIFT_END = 18 * 60;
  const NIGHT_SHIFT_START = 15 * 60;
  const NIGHT_SHIFT_END_MIN = 22 * 60;
  const BOTH_SHIFT_END_MAX = 22 * 60;
  const BOTH_SHIFT_END_MIN = (18 * 60) + 1;

  if (end <= DAY_SHIFT_END && !isOvernight) {
    return 'day';
  }

  if (start > NIGHT_SHIFT_START && (end > NIGHT_SHIFT_END_MIN || isOvernight)) {
    return 'night';
  }

  if (start < NIGHT_SHIFT_START && end >= BOTH_SHIFT_END_MIN && end <= BOTH_SHIFT_END_MAX) {
    return 'both';
  }

  if (start > NIGHT_SHIFT_START && end <= BOTH_SHIFT_END_MAX && !isOvernight) {
    return 'night';
  }

  return 'day';
}

function parseTime(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

export function formatShiftType(shiftType) {
  const labels = {
    'day': 'Day Shift',
    'night': 'Night Shift',
    'both': 'Both Shifts'
  };
  return labels[shiftType] || shiftType;
}

export function getShiftColor(shiftType) {
  const colors = {
    'day': 'bg-yellow-100 text-yellow-800 border-yellow-300',
    'night': 'bg-blue-900 text-blue-100 border-blue-700',
    'both': 'bg-purple-100 text-purple-800 border-purple-300'
  };
  return colors[shiftType] || 'bg-gray-100 text-gray-800 border-gray-300';
}

export function getRoleColor(role) {
  const colors = {
    'Shift Runner': 'bg-red-100 text-red-800',
    'Team Member': 'bg-green-100 text-green-800',
    'Cook': 'bg-orange-100 text-orange-800'
  };
  return colors[role] || 'bg-gray-100 text-gray-800';
}
