import { exportDeploymentsToExcel } from './excelJsExport';

export const exportEnhancedExcel = async (deployments, shiftInfo, selectedDate, targets) => {
  const locationName = 'KFC Location';

  await exportDeploymentsToExcel(deployments, selectedDate, locationName);
};

export default exportEnhancedExcel;
