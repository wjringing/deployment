// Access Control Manager for Page Restrictions
// Created: 2025-01-22
// Purpose: Implement read-only locks for Sales Data and Settings pages

export class AccessControlManager {
  constructor() {
    this.lockVersion = '1.0.0';
    this.lockedPages = new Set();
  }

  // Apply read-only lock to a specific page
  lockPage(pageName, reason = 'Data protection measure') {
    // PAGE PROTECTION SETTING: Define which pages can be locked
    // Currently supports: 'sales' and 'settings'
    const lockInfo = {
      pageName,
      lockedAt: new Date().toISOString(),
      lockedBy: 'system_admin',
      reason,
      version: this.lockVersion,
      lockId: `lock_${pageName}_${Date.now()}`
    };

    // Store lock information
    localStorage.setItem(`page_lock_${pageName}`, JSON.stringify(lockInfo));
    this.lockedPages.add(pageName);

    // Log the lock action for audit trail
    this.logLockAction('LOCK_APPLIED', lockInfo);

    return {
      success: true,
      lockId: lockInfo.lockId,
      pageName,
      lockedAt: lockInfo.lockedAt,
      reason
    };
  }

  // Remove read-only lock from a specific page
  unlockPage(pageName, reason = 'Lock removal authorized') {
    const lockInfo = JSON.parse(localStorage.getItem(`page_lock_${pageName}`) || 'null');
    
    if (!lockInfo) {
      return { success: false, error: 'No lock found for this page' };
    }

    const unlockInfo = {
      ...lockInfo,
      unlockedAt: new Date().toISOString(),
      unlockedBy: 'system_admin',
      unlockReason: reason
    };

    // Remove lock information
    localStorage.removeItem(`page_lock_${pageName}`);
    this.lockedPages.delete(pageName);

    // Log the unlock action for audit trail
    this.logLockAction('LOCK_REMOVED', unlockInfo);

    return {
      success: true,
      pageName,
      unlockedAt: unlockInfo.unlockedAt,
      originalLockDate: lockInfo.lockedAt,
      reason
    };
  }

  // Check if a page is currently locked
  isPageLocked(pageName) {
    const lockInfo = localStorage.getItem(`page_lock_${pageName}`);
    return lockInfo !== null;
  }

  // Get lock information for a page
  getLockInfo(pageName) {
    const lockInfo = localStorage.getItem(`page_lock_${pageName}`);
    return lockInfo ? JSON.parse(lockInfo) : null;
  }

  // Get all currently locked pages
  getLockedPages() {
    const lockedPages = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith('page_lock_')) {
        const lockInfo = JSON.parse(localStorage.getItem(key));
        lockedPages.push(lockInfo);
      }
    }
    return lockedPages;
  }

  // Log lock/unlock actions for audit trail
  logLockAction(action, lockInfo) {
    const logs = JSON.parse(localStorage.getItem('access_control_logs') || '[]');
    logs.push({
      action,
      pageName: lockInfo.pageName,
      timestamp: new Date().toISOString(),
      user: lockInfo.lockedBy || lockInfo.unlockedBy,
      reason: lockInfo.reason || lockInfo.unlockReason,
      lockId: lockInfo.lockId
    });
    localStorage.setItem('access_control_logs', JSON.stringify(logs));
  }

  // Get audit trail for access control actions
  getAuditTrail() {
    return JSON.parse(localStorage.getItem('access_control_logs') || '[]')
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  // Generate user notification message for locked pages
  generateLockNotification(pageName) {
    const lockInfo = this.getLockInfo(pageName);
    if (!lockInfo) return null;

    return {
      type: 'warning',
      title: 'Page Access Restricted',
      message: `This page is currently in read-only mode for data protection. Locked on ${new Date(lockInfo.lockedAt).toLocaleString()}.`,
      reason: lockInfo.reason,
      lockId: lockInfo.lockId,
      canUnlock: true // Can be modified based on user permissions
    };
  }
}