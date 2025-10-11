// Backup Manager for Sales Data and Settings Pages
// Created: 2025-01-22
// Purpose: Create and manage backups with timestamp and version information

export class BackupManager {
  constructor() {
    this.backupVersion = '1.0.0';
    this.backupLocation = 'backups/';
  }

  // Generate timestamp for backup files
  generateTimestamp() {
    const now = new Date();
    return now.toISOString().replace(/[:.]/g, '-').slice(0, -5);
  }

  // Create backup of Sales Data page and associated data
  async createSalesDataBackup(salesRecordsByDate, salesPageComponent) {
    const timestamp = this.generateTimestamp();
    const backupId = `sales-backup-${timestamp}`;
    
    // Construct the complete data object first
    const data = {
      salesRecordsByDate: JSON.parse(JSON.stringify(salesRecordsByDate)),
      componentSnapshot: {
        name: 'SalesPage',
        version: '1.0.0',
        lastModified: new Date().toISOString()
      }
    };

    // Calculate checksum and size from the complete data object
    const dataString = JSON.stringify(data);
    
    const backup = {
      id: backupId,
      timestamp: new Date().toISOString(),
      version: this.backupVersion,
      type: 'SALES_DATA_BACKUP',
      data: data,
      metadata: {
        recordCount: Object.keys(salesRecordsByDate).length,
        totalRecords: Object.values(salesRecordsByDate).reduce((sum, records) => sum + records.length, 0),
        backupSize: dataString.length,
        integrity: this.calculateChecksum(dataString)
      }
    };

    // Store backup in localStorage (simulating secure storage)
    localStorage.setItem(`backup_${backupId}`, JSON.stringify(backup));
    
    // Create backup log entry
    this.logBackupCreation(backup);
    
    return {
      success: true,
      backupId,
      location: `${this.backupLocation}${backupId}.json`,
      timestamp,
      size: backup.metadata.backupSize,
      recordCount: backup.metadata.totalRecords
    };
  }

  // Create backup of Settings page and configurations
  async createSettingsBackup(staff, positions, targets, templateShifts) {
    const timestamp = this.generateTimestamp();
    const backupId = `settings-backup-${timestamp}`;
    
    // Construct the complete data object first
    const data = {
      staff: JSON.parse(JSON.stringify(staff)),
      positions: JSON.parse(JSON.stringify(positions)),
      targets: JSON.parse(JSON.stringify(targets)),
      templateShifts: JSON.parse(JSON.stringify(templateShifts)),
      componentSnapshot: {
        name: 'SettingsPage',
        version: '1.0.0',
        lastModified: new Date().toISOString()
      }
    };

    // Calculate checksum and size from the complete data object
    const dataString = JSON.stringify(data);
    
    const backup = {
      id: backupId,
      timestamp: new Date().toISOString(),
      version: this.backupVersion,
      type: 'SETTINGS_BACKUP',
      data: data,
      metadata: {
        staffCount: staff.length,
        positionsCount: positions.length,
        targetsCount: targets.length,
        templateShiftsCount: templateShifts.length,
        backupSize: dataString.length,
        integrity: this.calculateChecksum(dataString)
      }
    };

    // Store backup in localStorage (simulating secure storage)
    localStorage.setItem(`backup_${backupId}`, JSON.stringify(backup));
    
    // Create backup log entry
    this.logBackupCreation(backup);
    
    return {
      success: true,
      backupId,
      location: `${this.backupLocation}${backupId}.json`,
      timestamp,
      size: backup.metadata.backupSize,
      staffCount: backup.metadata.staffCount,
      positionsCount: backup.metadata.positionsCount,
      targetsCount: backup.metadata.targetsCount
    };
  }

  // Calculate simple checksum for integrity verification
  calculateChecksum(data) {
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(16);
  }

  // Log backup creation for audit trail
  logBackupCreation(backup) {
    const logs = JSON.parse(localStorage.getItem('backup_logs') || '[]');
    logs.push({
      action: 'BACKUP_CREATED',
      backupId: backup.id,
      timestamp: backup.timestamp,
      type: backup.type,
      user: 'system_admin',
      metadata: backup.metadata
    });
    localStorage.setItem('backup_logs', JSON.stringify(logs));
  }

  // Verify backup integrity
  async verifyBackupIntegrity(backupId) {
    const backup = JSON.parse(localStorage.getItem(`backup_${backupId}`));
    if (!backup) return { valid: false, error: 'Backup not found' };

    const currentChecksum = this.calculateChecksum(JSON.stringify(backup.data));
    const isValid = currentChecksum === backup.metadata.integrity;

    return {
      valid: isValid,
      backupId,
      timestamp: backup.timestamp,
      checksum: currentChecksum,
      originalChecksum: backup.metadata.integrity
    };
  }

  // List all backups
  listBackups() {
    const backups = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith('backup_')) {
        const backup = JSON.parse(localStorage.getItem(key));
        backups.push({
          id: backup.id,
          type: backup.type,
          timestamp: backup.timestamp,
          size: backup.metadata.backupSize
        });
      }
    }
    return backups.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }
}