import { exportDeploymentsToExcel, exportStaffListToExcel } from './excelJsExport';

export const exportToExcel = async (deployments, shiftInfo, selectedDate, staff, exportType = 'all') => {
  const locationName = 'KFC Location';

  if (exportType === 'staff' && staff) {
    await exportStaffListToExcel(staff, locationName);
  } else {
    await exportDeploymentsToExcel(deployments, selectedDate, locationName);
  }
};

export default exportToExcel;
