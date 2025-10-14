import React from 'react';
import { Shield, Lock, AlertTriangle, Info } from 'lucide-react';

// Protected Page Wrapper Component
// Wraps pages that can be locked for data protection
const ProtectedPageWrapper = ({ 
  children, 
  pageName, 
  isLocked, 
  lockInfo, 
  onUnlockRequest 
}) => {
  if (!isLocked) {
    return children;
  }

  return (
    <div className="relative">
      {/* Lock Notification Banner */}
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <Shield className="h-5 w-5 text-yellow-400" />
          </div>
          <div className="ml-3 flex-1">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-yellow-800">
                  Page Access Restricted - Read Only Mode
                </h3>
                <p className="mt-1 text-sm text-yellow-700">
                  This page has been locked for data protection. 
                  Locked on {new Date(lockInfo.lockedAt).toLocaleString()}
                </p>
                <p className="mt-1 text-xs text-yellow-600">
                  Reason: {lockInfo.reason}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-yellow-600" />
                {onUnlockRequest && (
                  <button
                    onClick={() => onUnlockRequest(pageName)}
                    className="text-xs bg-yellow-100 hover:bg-yellow-200 text-yellow-800 px-2 py-1 rounded border border-yellow-300"
                  >
                    Request Unlock
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Overlay to prevent interactions */}
      <div className="relative">
        <div className="absolute inset-0 bg-gray-100 bg-opacity-50 z-10 pointer-events-auto cursor-not-allowed">
          <div className="flex items-center justify-center h-full">
            <div className="bg-white rounded-lg shadow-lg p-6 max-w-md text-center">
              <Lock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Content Protected
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                This page is currently locked and cannot be modified. 
                All data is preserved and accessible in read-only mode.
              </p>
              <div className="text-xs text-gray-500">
                Lock ID: {lockInfo.lockId}
              </div>
            </div>
          </div>
        </div>
        
        {/* Original content (dimmed and non-interactive) */}
        <div className="opacity-60 pointer-events-none">
          {children}
        </div>
      </div>
    </div>
  );
};

export default ProtectedPageWrapper;