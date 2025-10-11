// Password Protection Manager for Data Protection System
// Created: 2025-01-22
// Purpose: Secure access to critical data protection settings

export class PasswordProtectionManager {
  constructor() {
    this.protectionPassword = 'Plainbob1260!'; // In production, this would be hashed/encrypted
    this.sessionTimeout = 30 * 60 * 1000; // 30 minutes
    this.sessionKey = 'dataProtectionSession';
  }

  // Verify password and create session
  authenticate(password) {
    if (password === this.protectionPassword) {
      const session = {
        authenticated: true,
        timestamp: Date.now(),
        expires: Date.now() + this.sessionTimeout
      };
      
      sessionStorage.setItem(this.sessionKey, JSON.stringify(session));
      return { success: true, message: 'Authentication successful' };
    }
    
    return { success: false, message: 'Invalid password' };
  }

  // Check if current session is valid
  isAuthenticated() {
    try {
      const session = JSON.parse(sessionStorage.getItem(this.sessionKey) || '{}');
      
      if (session.authenticated && Date.now() < session.expires) {
        return true;
      }
      
      // Clear expired session
      this.clearSession();
      return false;
    } catch (error) {
      return false;
    }
  }

  // Clear authentication session
  clearSession() {
    sessionStorage.removeItem(this.sessionKey);
  }

  // Get remaining session time
  getSessionTimeRemaining() {
    try {
      const session = JSON.parse(sessionStorage.getItem(this.sessionKey) || '{}');
      if (session.expires) {
        const remaining = session.expires - Date.now();
        return Math.max(0, remaining);
      }
    } catch (error) {
      return 0;
    }
    return 0;
  }

  // Extend session
  extendSession() {
    if (this.isAuthenticated()) {
      const session = JSON.parse(sessionStorage.getItem(this.sessionKey));
      session.expires = Date.now() + this.sessionTimeout;
      sessionStorage.setItem(this.sessionKey, JSON.stringify(session));
      return true;
    }
    return false;
  }
}