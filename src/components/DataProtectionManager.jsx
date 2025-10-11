import React, { useState, useEffect } from 'react';
import { BackupManager } from '../utils/backupManager';
import { AccessControlManager } from '../utils/accessControl';
import { Shield, Database, Lock, Unlock, Download, CheckCircle, AlertCircle, Clock, FileText } from 'lucide-react';

// Data Protection Manager Component
// Handles backup creation and access control for the application
const DataProtectionManager = ({ 
  salesRecordsByDate, 
  staff, 
  positions, 
  targets, 
  templateShifts,
  onProtectionStatusChange 
}) => {
  const [backupManager] = useState(new BackupManager());
  const [accessControl] = useState(new AccessControlManager());
  const [protectionStatus, setProtectionStatus] = useState({
    salesBackup: null,
    settingsBackup: null,
    salesLocked: false,
    settingsLocked: false
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    // Check current protection status on component mount
    checkProtectionStatus();
    loadAuditLogs();
  }, []);

  const checkProtectionStatus = () => {
    const settingsLocked = accessControl.isPageLocked('settings');
    
    setProtectionStatus(prev => ({
      ...prev,
      settingsLocked
    }));

    // Notify parent component of protection status
    if (onProtectionStatusChange) {
      onProtectionStatusChange({
        settingsLocked
      });
    }
  };

  const loadAuditLogs = () => {
    const auditTrail = accessControl.getAuditTrail();
    const backupLogs = JSON.parse(localStorage.getItem('backup_logs') || '[]');
    
    const combinedLogs = [
      ...auditTrail.map(log => ({ ...log, type: 'access_control' })),
      ...backupLogs.map(log => ({ ...log, type: 'backup' }))
    ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    setLogs(combinedLogs);
  };

  const createBackups = async () => {
    setIsProcessing(true);
    try {
      // Create Sales Data backup
      const salesBackupResult = await backupManager.createSalesDataBackup(
        salesRecordsByDate,
        'SalesPage'
      );

      // Create Settings backup
      const settingsBackupResult = await backupManager.createSettingsBackup(
        staff,
        positions,
        targets,
        templateShifts
      );

      // Verify backup integrity
      const salesIntegrity = await backupManager.verifyBackupIntegrity(salesBackupResult.backupId);
      const settingsIntegrity = await backupManager.verifyBackupIntegrity(settingsBackupResult.backupId);

      if (salesIntegrity.valid && settingsIntegrity.valid) {
        setProtectionStatus(prev => ({
          ...prev,
          salesBackup: salesBackupResult,
          settingsBackup: settingsBackupResult
        }));

        loadAuditLogs();
        return {
          success: true,
          salesBackup: salesBackupResult,
          settingsBackup: settingsBackupResult
        };
      } else {
        throw new Error('Backup integrity verification failed');
      }
    } catch (error) {
      console.error('Backup creation failed:', error);
      return {
        success: false,
        error: error.message
      };
    } finally {
      setIsProcessing(false);
    }
  };

  const applyPageLocks = async () => {
    setIsProcessing(true);
    try {
      // Lock Settings page
      const settingsLockResult = accessControl.lockPage(
        'settings',
        'Data protection measure - Administrative backup and lock procedure'
      );

      if (settingsLockResult.success) {
        checkProtectionStatus();
        loadAuditLogs();
        
        return {
          success: true,
          settingsLock: settingsLockResult
        };
      } else {
        throw new Error('Failed to apply page locks');
      }
    } catch (error) {
      console.error('Lock application failed:', error);
      return {
        success: false,
        error: error.message
      };
    } finally {
      setIsProcessing(false);
    }
  };

  const removePageLocks = async () => {
    setIsProcessing(true);
    try {
      // Unlock Settings page
      const settingsUnlockResult = accessControl.unlockPage(
        'settings',
        'Administrative unlock - Data protection measures removed'
      );

      checkProtectionStatus();
      loadAuditLogs();
      
      return {
        success: true,
        settingsUnlock: settingsUnlockResult
      };
    } catch (error) {
      console.error('Lock removal failed:', error);
      return {
        success: false,
        error: error.message
      };
    } finally {
      setIsProcessing(false);
    }
  };

  const executeFullProtection = async () => {
    setIsProcessing(true);
    
    try {
      // Step 1: Create backups
      const backupResult = await createBackups();
      if (!backupResult.success) {
        throw new Error(`Backup failed: ${backupResult.error}`);
      }

      // Step 2: Apply locks only after successful backup
      const lockResult = await applyPageLocks();
      if (!lockResult.success) {
        throw new Error(`Lock application failed: ${lockResult.error}`);
      }

      return {
        success: true,
        message: 'Data protection measures successfully implemented',
        backups: {
          sales: backupResult.salesBackup,
          settings: backupResult.settingsBackup
        },
        locks: {
          sales: lockResult.salesLock,
          settings: lockResult.settingsLock
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="flex items-center gap-3 mb-6">
        <Shield className="w-6 h-6 text-blue-600" />
        <h2 className="text-xl font-semibold text-gray-900">Data Protection Manager</h2>
      </div>

      {/* Protection Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-medium text-gray-900">Sales Data</h3>
            {protectionStatus.salesLocked ? (
              <Lock className="w-4 h-4 text-red-600" />
            ) : (
              <Unlock className="w-4 h-4 text-green-600" />
            )}
          </div>
          <p className="text-sm text-gray-600">
            Status: {protectionStatus.salesLocked ? 'Locked (Read-Only)' : 'Unlocked'}
          </p>
          {protectionStatus.salesBackup && (
            <p className="text-xs text-gray-500 mt-1">
              Last backup: {new Date(protectionStatus.salesBackup.timestamp).toLocaleString()}
            </p>
          )}
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-medium text-gray-900">Settings</h3>
            {protectionStatus.settingsLocked ? (
              <Lock className="w-4 h-4 text-red-600" />
            ) : (
              <Unlock className="w-4 h-4 text-green-600" />
            )}
          </div>
          <p className="text-sm text-gray-600">
            Status: {protectionStatus.settingsLocked ? 'Locked (Read-Only)' : 'Unlocked'}
          </p>
          {protectionStatus.settingsBackup && (
            <p className="text-xs text-gray-500 mt-1">
              Last backup: {new Date(protectionStatus.settingsBackup.timestamp).toLocaleString()}
            </p>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3 mb-6">
        <button
          onClick={executeFullProtection}
          disabled={isProcessing || (protectionStatus.salesLocked && protectionStatus.settingsLocked)}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <Shield className="w-4 h-4" />
          {isProcessing ? 'Processing...' : 'Apply Full Protection'}
        </button>

        <button
          onClick={createBackups}
          disabled={isProcessing}
          className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <Database className="w-4 h-4" />
          Create Backups Only
        </button>

        <button
          onClick={removePageLocks}
          disabled={isProcessing || (!protectionStatus.salesLocked && !protectionStatus.settingsLocked)}
          className="bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <Unlock className="w-4 h-4" />
          Remove All Locks
        </button>
      </div>

      {/* Audit Trail */}
      <div className="border-t pt-6">
        <h3 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
          <FileText className="w-4 h-4" />
          Audit Trail
        </h3>
        <div className="max-h-64 overflow-y-auto">
          {logs.length === 0 ? (
            <p className="text-gray-500 text-sm">No protection activities recorded</p>
          ) : (
            <div className="space-y-2">
              {logs.slice(0, 10).map((log, index) => (
                <div key={index} className="flex items-center gap-3 p-2 bg-gray-50 rounded text-sm">
                  <div className="flex-shrink-0">
                    {log.type === 'backup' ? (
                      <Database className="w-4 h-4 text-green-600" />
                    ) : (
                      <Lock className="w-4 h-4 text-blue-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <span className="font-medium">{log.action.replace(/_/g, ' ')}</span>
                    {log.pageName && <span className="text-gray-600"> - {log.pageName}</span>}
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(log.timestamp).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DataProtectionManager;