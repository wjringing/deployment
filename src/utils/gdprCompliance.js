// GDPR Compliance Manager
// Implements comprehensive GDPR compliance features for the deployment management system

export class GDPRComplianceManager {
  constructor(supabaseClient) {
    this.supabase = supabaseClient;
    this.encryptionKey = this.generateEncryptionKey();
    this.auditLogger = new AuditLogger(supabaseClient);
  }

  // Data Encryption Utilities
  generateEncryptionKey() {
    // In production, this should be stored securely (environment variables)
    return crypto.getRandomValues(new Uint8Array(32));
  }

  async encryptSensitiveData(data) {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(JSON.stringify(data));
    
    const key = await crypto.subtle.importKey(
      'raw',
      this.encryptionKey,
      { name: 'AES-GCM' },
      false,
      ['encrypt']
    );

    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encryptedData = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      dataBuffer
    );

    return {
      encryptedData: Array.from(new Uint8Array(encryptedData)),
      iv: Array.from(iv)
    };
  }

  async decryptSensitiveData(encryptedData, iv) {
    const key = await crypto.subtle.importKey(
      'raw',
      this.encryptionKey,
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    );

    const decryptedData = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: new Uint8Array(iv) },
      key,
      new Uint8Array(encryptedData)
    );

    const decoder = new TextDecoder();
    return JSON.parse(decoder.decode(decryptedData));
  }

  // Data Minimization Controls
  async minimizeStaffData(staffData) {
    // Remove unnecessary fields and keep only essential data
    const minimizedData = {
      id: staffData.id,
      name: staffData.name,
      is_under_18: staffData.is_under_18,
      created_at: staffData.created_at,
      // Remove any additional personal data not needed for deployment
      gdpr_consent: staffData.gdpr_consent || false,
      data_retention_until: staffData.data_retention_until
    };

    await this.auditLogger.log('DATA_MINIMIZATION', {
      staff_id: staffData.id,
      action: 'Data minimized for GDPR compliance',
      fields_removed: this.getFieldDifferences(staffData, minimizedData)
    });

    return minimizedData;
  }

  // Purpose Limitation Mechanisms
  async validateDataUsagePurpose(data, purpose) {
    const allowedPurposes = [
      'STAFF_DEPLOYMENT',
      'SHIFT_SCHEDULING',
      'PERFORMANCE_TRACKING',
      'COMPLIANCE_REPORTING'
    ];

    if (!allowedPurposes.includes(purpose)) {
      throw new Error(`Data usage purpose '${purpose}' is not permitted under GDPR`);
    }

    await this.auditLogger.log('PURPOSE_VALIDATION', {
      purpose,
      data_type: typeof data,
      timestamp: new Date().toISOString()
    });

    return true;
  }

  // Storage Limitation with Automated Deletion
  async implementDataRetentionPolicy() {
    const retentionPeriods = {
      staff: 365 * 2, // 2 years
      deployments: 365 * 1, // 1 year
      shift_info: 365 * 1, // 1 year
      sales_records: 365 * 3, // 3 years for financial records
      audit_logs: 365 * 7 // 7 years for audit compliance
    };

    for (const [table, days] of Object.entries(retentionPeriods)) {
      await this.deleteExpiredData(table, days);
    }
  }

  async deleteExpiredData(table, retentionDays) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const { data: expiredRecords, error } = await this.supabase
      .from(table)
      .select('id')
      .lt('created_at', cutoffDate.toISOString());

    if (error) {
      console.error(`Error finding expired ${table} records:`, error);
      return;
    }

    if (expiredRecords && expiredRecords.length > 0) {
      const { error: deleteError } = await this.supabase
        .from(table)
        .delete()
        .in('id', expiredRecords.map(r => r.id));

      if (!deleteError) {
        await this.auditLogger.log('AUTOMATED_DELETION', {
          table,
          records_deleted: expiredRecords.length,
          retention_days: retentionDays,
          cutoff_date: cutoffDate.toISOString()
        });
      }
    }
  }

  // Right to Access - Data Export
  async exportUserData(staffId) {
    const userData = {
      personal_data: {},
      deployment_history: [],
      shift_information: [],
      audit_trail: []
    };

    // Get staff personal data
    const { data: staffData } = await this.supabase
      .from('staff')
      .select('*')
      .eq('id', staffId)
      .single();

    if (staffData) {
      userData.personal_data = await this.minimizeStaffData(staffData);
    }

    // Get deployment history
    const { data: deployments } = await this.supabase
      .from('deployments')
      .select('*')
      .eq('staff_id', staffId)
      .order('created_at', { ascending: false });

    userData.deployment_history = deployments || [];

    // Get audit trail
    const { data: auditLogs } = await this.supabase
      .from('gdpr_audit_logs')
      .select('*')
      .eq('staff_id', staffId)
      .order('created_at', { ascending: false });

    userData.audit_trail = auditLogs || [];

    await this.auditLogger.log('DATA_EXPORT', {
      staff_id: staffId,
      export_timestamp: new Date().toISOString(),
      records_exported: {
        deployments: userData.deployment_history.length,
        audit_logs: userData.audit_trail.length
      }
    });

    return userData;
  }

  // Right to Erasure - "Right to be Forgotten"
  async eraseUserData(staffId, reason = 'User request') {
    const erasureLog = {
      staff_id: staffId,
      erasure_reason: reason,
      erasure_timestamp: new Date().toISOString(),
      data_erased: []
    };

    // Anonymize deployments instead of deleting (for business continuity)
    const { data: deployments } = await this.supabase
      .from('deployments')
      .select('id')
      .eq('staff_id', staffId);

    if (deployments && deployments.length > 0) {
      await this.supabase
        .from('deployments')
        .update({ 
          staff_id: null,
          anonymized: true,
          anonymized_at: new Date().toISOString()
        })
        .eq('staff_id', staffId);

      erasureLog.data_erased.push({
        table: 'deployments',
        action: 'anonymized',
        records: deployments.length
      });
    }

    // Delete staff record
    const { error: staffDeleteError } = await this.supabase
      .from('staff')
      .delete()
      .eq('id', staffId);

    if (!staffDeleteError) {
      erasureLog.data_erased.push({
        table: 'staff',
        action: 'deleted',
        records: 1
      });
    }

    // Log the erasure
    await this.auditLogger.log('DATA_ERASURE', erasureLog);

    return {
      success: !staffDeleteError,
      erasure_log: erasureLog
    };
  }

  // Data Portability
  async exportDataForPortability(staffId, format = 'JSON') {
    const userData = await this.exportUserData(staffId);
    
    switch (format.toUpperCase()) {
      case 'JSON':
        return {
          format: 'JSON',
          data: JSON.stringify(userData, null, 2),
          filename: `staff_data_${staffId}_${Date.now()}.json`
        };
      
      case 'CSV':
        return {
          format: 'CSV',
          data: this.convertToCSV(userData),
          filename: `staff_data_${staffId}_${Date.now()}.csv`
        };
      
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  convertToCSV(userData) {
    const csvData = [];
    
    // Personal Data
    csvData.push(['Section', 'Field', 'Value']);
    Object.entries(userData.personal_data).forEach(([key, value]) => {
      csvData.push(['Personal Data', key, value]);
    });

    // Deployment History
    userData.deployment_history.forEach((deployment, index) => {
      Object.entries(deployment).forEach(([key, value]) => {
        csvData.push([`Deployment ${index + 1}`, key, value]);
      });
    });

    return csvData.map(row => row.join(',')).join('\n');
  }

  // Consent Management
  async recordConsent(staffId, consentType, granted = true) {
    const consentRecord = {
      staff_id: staffId,
      consent_type: consentType,
      consent_granted: granted,
      consent_timestamp: new Date().toISOString(),
      consent_version: '1.0',
      ip_address: await this.getUserIP(),
      user_agent: navigator.userAgent
    };

    const { data, error } = await this.supabase
      .from('gdpr_consent_records')
      .insert([consentRecord])
      .select()
      .single();

    if (!error) {
      await this.auditLogger.log('CONSENT_RECORDED', {
        staff_id: staffId,
        consent_type: consentType,
        granted: granted
      });
    }

    return { success: !error, data, error };
  }

  async withdrawConsent(staffId, consentType) {
    return await this.recordConsent(staffId, consentType, false);
  }

  // Data Breach Detection
  async detectDataBreach(suspiciousActivity) {
    const breachIndicators = [
      'UNAUTHORIZED_ACCESS',
      'BULK_DATA_EXPORT',
      'UNUSUAL_QUERY_PATTERNS',
      'FAILED_AUTHENTICATION_ATTEMPTS'
    ];

    if (breachIndicators.includes(suspiciousActivity.type)) {
      await this.handlePotentialBreach(suspiciousActivity);
    }
  }

  async handlePotentialBreach(activity) {
    const breachReport = {
      breach_id: crypto.randomUUID(),
      detected_at: new Date().toISOString(),
      activity_type: activity.type,
      severity: this.assessBreachSeverity(activity),
      affected_records: activity.affected_records || 0,
      status: 'INVESTIGATING'
    };

    await this.supabase
      .from('gdpr_breach_reports')
      .insert([breachReport]);

    // Notify administrators
    await this.notifyDataProtectionOfficer(breachReport);

    return breachReport;
  }

  assessBreachSeverity(activity) {
    if (activity.affected_records > 100) return 'HIGH';
    if (activity.affected_records > 10) return 'MEDIUM';
    return 'LOW';
  }

  async notifyDataProtectionOfficer(breachReport) {
    // Implementation would depend on your notification system
    console.warn('Data breach detected:', breachReport);
    // In production: send email, SMS, or push notification
  }

  // Utility methods
  getFieldDifferences(original, minimized) {
    const originalKeys = Object.keys(original);
    const minimizedKeys = Object.keys(minimized);
    return originalKeys.filter(key => !minimizedKeys.includes(key));
  }

  async getUserIP() {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch (error) {
      return 'unknown';
    }
  }
}

// Audit Logger Class
class AuditLogger {
  constructor(supabaseClient) {
    this.supabase = supabaseClient;
  }

  async log(action, details) {
    const logEntry = {
      action,
      details: JSON.stringify(details),
      timestamp: new Date().toISOString(),
      user_agent: navigator.userAgent,
      ip_address: await this.getUserIP()
    };

    await this.supabase
      .from('gdpr_audit_logs')
      .insert([logEntry]);
  }

  async getUserIP() {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch (error) {
      return 'unknown';
    }
  }
}

export default GDPRComplianceManager;