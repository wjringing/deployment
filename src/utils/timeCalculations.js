// Time calculation utilities
// Centralized functions for work hours and break time calculations

export const calculateWorkHours = (startTime, endTime) => {
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);
  
  let start = startHour + startMin / 60;
  let end = endHour + endMin / 60;
  
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