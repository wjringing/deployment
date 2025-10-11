import React, { useState, useEffect } from 'react';
import { PasswordProtectionManager } from '../utils/passwordProtection';
import { DefaultTargetsManager } from '../utils/defaultTargets';
import DataProtectionManager from './DataProtectionManager';
import { Shield, Lock, Unlock, Eye, EyeOff, Clock, RotateCcw, AlertTriangle, CheckCircle, Key } from 'lucide-react';

const PasswordProtectedDataProtection = ({ 
  salesRecordsByDate, 
  staff, 
  positions, 
  targets, 
  templateShifts,
  onProtectionStatusChange,
  onResetTargets 
}) => {
  const [passwordManager] = useState(new PasswordProtectionManager());
  const [defaultTargetsManager] = useState(new DefaultTargetsManager());
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');
  const [sessionTimeRemaining, setSessionTimeRemaining] = useState(0);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetPreview, setResetPreview] = useState(null);

  // Check authentication status on mount and set up session timer
  useEffect(() => {
    const checkAuth = () => {
      const authenticated = passwordManager.isAuthenticated();
      setIsAuthenticated(authenticated);
      
      if (authenticated) {
        const timeRemaining = passwordManager.getSessionTimeRemaining();
        setSessionTimeRemaining(timeRemaining);
      }
    };

    checkAuth();
    const interval = setInterval(checkAuth, 1000); // Check every second

    return () => clearInterval(interval);
  }, []);

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    setAuthError('');

    const result = passwordManager.authenticate(password);
    
    if (result.success) {
      setIsAuthenticated(true);
      setShowPasswordPrompt(false);
      setPassword('');
      setAuthError('');
    } else {
      setAuthError(result.message);
      setPassword('');
    }
  };

  const handleLogout = () => {
    passwordManager.clearSession();
    setIsAuthenticated(false);
    setSessionTimeRemaining(0);
  };

  const handleExtendSession = () => {
    if (passwordManager.extendSession()) {
      const timeRemaining = passwordManager.getSessionTimeRemaining();
      setSessionTimeRemaining(timeRemaining);
    }
  };

  const handleResetTargets = () => {
    const preview = defaultTargetsManager.generateResetPreview(targets);
    setResetPreview(preview);
    setShowResetConfirm(true);
  };

  const confirmResetTargets = async () => {
    try {
      const defaultTargets = defaultTargetsManager.getDefaultTargets();
      await onResetTargets(defaultTargets);
      setShowResetConfirm(false);
      setResetPreview(null);
    } catch (error) {
      console.error('Failed to reset targets:', error);
    }
  };

  const formatTime = (milliseconds) => {
    const minutes = Math.floor(milliseconds / 60000);
    const seconds = Math.floor((milliseconds % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const isTargetsDefault = defaultTargetsManager.areTargetsDefault(targets);

  // Password prompt modal
  if (showPasswordPrompt) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-md">
          <div className="flex items-center gap-3 mb-6">
            <Shield className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">Data Protection Access</h2>
          </div>
          
          <p className="text-gray-600 mb-6">
            This area contains critical data protection settings. Please enter the administrator password to continue.
          </p>
          
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Administrator Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter password"
                  required
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            
            {authError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <span className="text-red-800 text-sm">{authError}</span>
              </div>
            )}
            
            <div className="flex gap-3">
              <button
                type="submit"
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2"
              >
                <Key className="w-4 h-4" />
                Authenticate
              </button>
              <button
                type="button"
                onClick={() => setShowPasswordPrompt(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // Reset confirmation modal
  if (showResetConfirm && resetPreview) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-md">
          <div className="flex items-center gap-3 mb-6">
            <RotateCcw className="w-6 h-6 text-orange-600" />
            <h2 className="text-xl font-semibold text-gray-900">Reset to Default Targets</h2>
          </div>
          
          <div className="mb-6">
            <p className="text-gray-600 mb-4">
              This will restore all targets to their original default values. The following changes will be made:
            </p>
            
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              {resetPreview.willBeAdded > 0 && (
                <div className="flex items-center gap-2 text-green-700">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-sm">{resetPreview.willBeAdded} default targets will be restored</span>
                </div>
              )}
              {resetPreview.willBeModified > 0 && (
                <div className="flex items-center gap-2 text-blue-700">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-sm">{resetPreview.willBeModified} targets will be reset to default values</span>
                </div>
              )}
              {resetPreview.willBeRemoved > 0 && (
                <div className="flex items-center gap-2 text-red-700">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-sm">{resetPreview.willBeRemoved} custom targets will be removed</span>
                </div>
              )}
              
              <div className="pt-2 border-t border-gray-200">
                <span className="text-sm font-medium text-gray-900">
                  Total changes: {resetPreview.totalChanges}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={confirmResetTargets}
              className="flex-1 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Reset to Defaults
            </button>
            <button
              onClick={() => {
                setShowResetConfirm(false);
                setResetPreview(null);
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main protected interface
  return (
    <div className="space-y-6">
      {/* Authentication Status Bar */}
      {isAuthenticated ? (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Unlock className="w-5 h-5 text-green-600" />
              <div>
                <h3 className="font-medium text-green-800">Data Protection Access Granted</h3>
                <p className="text-sm text-green-700">
                  Session expires in: {formatTime(sessionTimeRemaining)}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleExtendSession}
                className="text-green-700 hover:text-green-800 px-3 py-1 rounded border border-green-300 hover:bg-green-100 text-sm flex items-center gap-1"
              >
                <Clock className="w-3 h-3" />
                Extend
              </button>
              <button
                onClick={handleLogout}
                className="text-green-700 hover:text-green-800 px-3 py-1 rounded border border-green-300 hover:bg-green-100 text-sm"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Lock className="w-5 h-5 text-yellow-600" />
              <div>
                <h3 className="font-medium text-yellow-800">Protected Data Protection Settings</h3>
                <p className="text-sm text-yellow-700">
                  Administrator authentication required to access critical settings
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowPasswordPrompt(true)}
              className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
            >
              <Key className="w-4 h-4" />
              Authenticate
            </button>
          </div>
        </div>
      )}

      {/* Target Reset Controls - Always Visible */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <RotateCcw className="w-6 h-6 text-orange-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Target Management</h2>
              <p className="text-gray-600">Manage and reset target configurations</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {isTargetsDefault ? (
              <div className="flex items-center gap-2 text-green-700 bg-green-50 px-3 py-2 rounded-lg">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm font-medium">Using Default Targets</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-blue-700 bg-blue-50 px-3 py-2 rounded-lg">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-sm font-medium">Custom Targets Active</span>
              </div>
            )}
            
            <button
              onClick={handleResetTargets}
              disabled={isTargetsDefault}
              className="bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Reset to Defaults
            </button>
          </div>
        </div>
        
        <div className="text-sm text-gray-600">
          <p className="mb-2">
            <strong>Current Status:</strong> {targets.length} targets configured
          </p>
          <p>
            The reset function will restore all targets to their original default values while preserving other system settings.
          </p>
        </div>
      </div>

      {/* Protected Data Protection Manager */}
      {isAuthenticated ? (
        <DataProtectionManager
          salesRecordsByDate={salesRecordsByDate}
          staff={staff}
          positions={positions}
          targets={targets}
          templateShifts={templateShifts}
          onProtectionStatusChange={onProtectionStatusChange}
        />
      ) : (
        <div className="bg-gray-100 rounded-lg p-12 text-center">
          <Lock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-gray-600 mb-2">
            Data Protection Settings Protected
          </h3>
          <p className="text-gray-500 mb-6">
            Please authenticate to access backup and protection controls
          </p>
          <button
            onClick={() => setShowPasswordPrompt(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center gap-2 mx-auto"
          >
            <Key className="w-5 h-5" />
            Enter Administrator Password
          </button>
        </div>
      )}
    </div>
  );
};

export default PasswordProtectedDataProtection;