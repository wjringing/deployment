import React, { useState, useEffect } from 'react';
import { Shield, Download, Trash2, Eye, Settings, AlertTriangle, CheckCircle, FileText, Lock, User, Clock } from 'lucide-react';
import GDPRComplianceManager from '../utils/gdprCompliance';
import { supabase } from '../lib/supabase';

const GDPRPrivacyCenter = ({ currentUser, onClose }) => {
  const [gdprManager] = useState(new GDPRComplianceManager(supabase));
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(false);
  const [userData, setUserData] = useState(null);
  const [consentSettings, setConsentSettings] = useState({
    data_processing: true,
    marketing: false,
    analytics: true,
    third_party_sharing: false
  });

  useEffect(() => {
    loadUserData();
    loadConsentSettings();
  }, [currentUser]);

  const loadUserData = async () => {
    if (!currentUser) return;
    
    try {
      setLoading(true);
      const data = await gdprManager.exportUserData(currentUser.id);
      setUserData(data);
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadConsentSettings = async () => {
    // Load current consent settings from database
    const { data } = await supabase
      .from('gdpr_consent_records')
      .select('*')
      .eq('staff_id', currentUser?.id)
      .order('consent_timestamp', { ascending: false });

    if (data && data.length > 0) {
      const latestConsents = {};
      data.forEach(record => {
        if (!latestConsents[record.consent_type]) {
          latestConsents[record.consent_type] = record.consent_granted;
        }
      });
      setConsentSettings(prev => ({ ...prev, ...latestConsents }));
    }
  };

  const handleDataExport = async (format = 'JSON') => {
    try {
      setLoading(true);
      const exportData = await gdprManager.exportDataForPortability(currentUser.id, format);
      
      const blob = new Blob([exportData.data], { 
        type: format === 'JSON' ? 'application/json' : 'text/csv' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = exportData.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting data:', error);
      alert('Failed to export data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDataErasure = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to delete all your personal data? This action cannot be undone. Your deployment history will be anonymized but preserved for business records.'
    );

    if (!confirmed) return;

    try {
      setLoading(true);
      const result = await gdprManager.eraseUserData(currentUser.id, 'User requested deletion');
      
      if (result.success) {
        alert('Your data has been successfully deleted. You will be logged out.');
        // Trigger logout
        window.location.reload();
      } else {
        alert('Failed to delete data. Please contact support.');
      }
    } catch (error) {
      console.error('Error erasing data:', error);
      alert('Failed to delete data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleConsentChange = async (consentType, granted) => {
    try {
      await gdprManager.recordConsent(currentUser.id, consentType, granted);
      setConsentSettings(prev => ({ ...prev, [consentType]: granted }));
    } catch (error) {
      console.error('Error updating consent:', error);
    }
  };

  const tabs = [
    { id: 'overview', label: 'Privacy Overview', icon: Shield },
    { id: 'data', label: 'My Data', icon: User },
    { id: 'consent', label: 'Consent Settings', icon: Settings },
    { id: 'rights', label: 'Your Rights', icon: FileText }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-5/6 overflow-hidden">
        {/* Header */}
        <div className="bg-blue-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="w-8 h-8" />
              <div>
                <h2 className="text-2xl font-bold">Privacy Center</h2>
                <p className="text-blue-100">Manage your personal data and privacy settings</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-blue-200 text-2xl"
            >
              ×
            </button>
          </div>
        </div>

        <div className="flex h-full">
          {/* Sidebar */}
          <div className="w-64 bg-gray-50 border-r">
            <nav className="p-4 space-y-2">
              {tabs.map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                      activeTab === tab.id
                        ? 'bg-blue-100 text-blue-700 font-medium'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Main Content */}
          <div className="flex-1 overflow-y-auto">
            {activeTab === 'overview' && (
              <div className="p-6">
                <h3 className="text-2xl font-bold mb-6">Privacy Overview</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <CheckCircle className="w-6 h-6 text-green-600" />
                      <h4 className="text-lg font-semibold text-green-800">Data Protection</h4>
                    </div>
                    <p className="text-green-700 text-sm">
                      Your personal data is encrypted and protected according to GDPR standards.
                    </p>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <Lock className="w-6 h-6 text-blue-600" />
                      <h4 className="text-lg font-semibold text-blue-800">Secure Processing</h4>
                    </div>
                    <p className="text-blue-700 text-sm">
                      We only process your data for legitimate business purposes with your consent.
                    </p>
                  </div>

                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <Clock className="w-6 h-6 text-purple-600" />
                      <h4 className="text-lg font-semibold text-purple-800">Data Retention</h4>
                    </div>
                    <p className="text-purple-700 text-sm">
                      Your data is automatically deleted after the required retention period.
                    </p>
                  </div>

                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <FileText className="w-6 h-6 text-orange-600" />
                      <h4 className="text-lg font-semibold text-orange-800">Your Rights</h4>
                    </div>
                    <p className="text-orange-700 text-sm">
                      You have full control over your data including access, correction, and deletion rights.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'data' && (
              <div className="p-6">
                <h3 className="text-2xl font-bold mb-6">My Data</h3>
                
                {loading ? (
                  <div className="text-center py-8">
                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p>Loading your data...</p>
                  </div>
                ) : userData ? (
                  <div className="space-y-6">
                    <div className="bg-white border rounded-lg p-6">
                      <h4 className="text-lg font-semibold mb-4">Personal Information</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-gray-600">Name</label>
                          <p className="text-gray-900">{userData.personal_data.name}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-600">Age Category</label>
                          <p className="text-gray-900">
                            {userData.personal_data.is_under_18 ? 'Under 18' : 'Over 18'}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white border rounded-lg p-6">
                      <h4 className="text-lg font-semibold mb-4">Deployment History</h4>
                      <p className="text-gray-600 mb-4">
                        You have {userData.deployment_history.length} deployment records.
                      </p>
                      
                      <div className="flex gap-4">
                        <button
                          onClick={() => handleDataExport('JSON')}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                        >
                          <Download className="w-4 h-4" />
                          Export as JSON
                        </button>
                        <button
                          onClick={() => handleDataExport('CSV')}
                          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                        >
                          <Download className="w-4 h-4" />
                          Export as CSV
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p>No data available.</p>
                )}
              </div>
            )}

            {activeTab === 'consent' && (
              <div className="p-6">
                <h3 className="text-2xl font-bold mb-6">Consent Settings</h3>
                
                <div className="space-y-4">
                  {Object.entries(consentSettings).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between p-4 bg-white border rounded-lg">
                      <div>
                        <h4 className="font-medium capitalize">
                          {key.replace('_', ' ')}
                        </h4>
                        <p className="text-sm text-gray-600">
                          {getConsentDescription(key)}
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={value}
                          onChange={(e) => handleConsentChange(key, e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'rights' && (
              <div className="p-6">
                <h3 className="text-2xl font-bold mb-6">Your Privacy Rights</h3>
                
                <div className="space-y-6">
                  <div className="bg-white border rounded-lg p-6">
                    <h4 className="text-lg font-semibold mb-3">Right to Access</h4>
                    <p className="text-gray-600 mb-4">
                      You can request a copy of all personal data we hold about you.
                    </p>
                    <button
                      onClick={() => handleDataExport('JSON')}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                    >
                      <Eye className="w-4 h-4" />
                      Access My Data
                    </button>
                  </div>

                  <div className="bg-white border rounded-lg p-6">
                    <h4 className="text-lg font-semibold mb-3">Right to Portability</h4>
                    <p className="text-gray-600 mb-4">
                      Export your data in a structured, machine-readable format.
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDataExport('JSON')}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                      >
                        <Download className="w-4 h-4" />
                        Export JSON
                      </button>
                      <button
                        onClick={() => handleDataExport('CSV')}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                      >
                        <Download className="w-4 h-4" />
                        Export CSV
                      </button>
                    </div>
                  </div>

                  <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                    <h4 className="text-lg font-semibold mb-3 text-red-800">Right to Erasure</h4>
                    <p className="text-red-700 mb-4">
                      Request deletion of all your personal data. This action cannot be undone.
                    </p>
                    <button
                      onClick={handleDataErasure}
                      className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete My Data
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const getConsentDescription = (consentType) => {
  const descriptions = {
    data_processing: 'Allow processing of your personal data for deployment scheduling',
    marketing: 'Receive marketing communications and promotional materials',
    analytics: 'Allow anonymous usage analytics to improve the system',
    third_party_sharing: 'Share anonymized data with third-party partners'
  };
  return descriptions[consentType] || 'Manage this consent setting';
};

export default GDPRPrivacyCenter;