import React, { useState, useEffect } from 'react';
import { Shield, Settings, X, Check, AlertCircle } from 'lucide-react';
import GDPRComplianceManager from '../utils/gdprCompliance';
import { supabase } from '../lib/supabase';

const GDPRConsentBanner = ({ currentUser, onConsentGiven }) => {
  const [gdprManager] = useState(new GDPRComplianceManager(supabase));
  const [showBanner, setShowBanner] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [consentChoices, setConsentChoices] = useState({
    essential: true, // Always required
    analytics: false,
    marketing: false,
    third_party: false
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkConsentStatus();
  }, [currentUser]);

  const checkConsentStatus = async () => {
    if (!currentUser) return;

    // Check if user has already given consent
    const { data } = await supabase
      .from('gdpr_consent_records')
      .select('*')
      .eq('staff_id', currentUser.id)
      .order('consent_timestamp', { ascending: false })
      .limit(1);

    if (!data || data.length === 0) {
      setShowBanner(true);
    }
  };

  const handleAcceptAll = async () => {
    const allConsents = {
      essential: true,
      analytics: true,
      marketing: true,
      third_party: true
    };
    await recordConsents(allConsents);
  };

  const handleAcceptSelected = async () => {
    await recordConsents(consentChoices);
  };

  const handleRejectAll = async () => {
    const minimalConsents = {
      essential: true,
      analytics: false,
      marketing: false,
      third_party: false
    };
    await recordConsents(minimalConsents);
  };

  const recordConsents = async (consents) => {
    setLoading(true);
    try {
      // Record each consent type
      for (const [type, granted] of Object.entries(consents)) {
        await gdprManager.recordConsent(currentUser.id, type, granted);
      }

      // Update staff record with consent flag
      await supabase
        .from('staff')
        .update({
          gdpr_consent_given: true,
          gdpr_consent_timestamp: new Date().toISOString(),
          privacy_settings: consents
        })
        .eq('id', currentUser.id);

      setShowBanner(false);
      if (onConsentGiven) {
        onConsentGiven(consents);
      }
    } catch (error) {
      console.error('Error recording consent:', error);
      alert('Failed to record consent. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-blue-600 shadow-lg z-50">
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-start gap-4">
          <Shield className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
          
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              We value your privacy
            </h3>
            
            {!showDetails ? (
              <div>
                <p className="text-gray-600 mb-4">
                  We use cookies and similar technologies to provide, protect and improve our services. 
                  By clicking "Accept All", you consent to our use of cookies for analytics, marketing, 
                  and third-party integrations as described in our Privacy Policy.
                </p>
                
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={handleAcceptAll}
                    disabled={loading}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-2 rounded-lg font-medium flex items-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    Accept All
                  </button>
                  
                  <button
                    onClick={handleRejectAll}
                    disabled={loading}
                    className="bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg font-medium"
                  >
                    Reject All
                  </button>
                  
                  <button
                    onClick={() => setShowDetails(true)}
                    className="border border-gray-300 hover:bg-gray-50 text-gray-700 px-6 py-2 rounded-lg font-medium flex items-center gap-2"
                  >
                    <Settings className="w-4 h-4" />
                    Customize
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-gray-600 mb-4">
                  Choose which types of cookies and data processing you're comfortable with:
                </p>
                
                <div className="space-y-4 mb-6">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <h4 className="font-medium text-gray-900">Essential Cookies</h4>
                      <p className="text-sm text-gray-600">Required for basic site functionality</p>
                    </div>
                    <div className="flex items-center">
                      <span className="text-sm text-gray-500 mr-2">Always Active</span>
                      <div className="w-11 h-6 bg-blue-600 rounded-full relative">
                        <div className="absolute right-1 top-1 bg-white w-4 h-4 rounded-full"></div>
                      </div>
                    </div>
                  </div>
                  
                  {[
                    {
                      key: 'analytics',
                      title: 'Analytics Cookies',
                      description: 'Help us understand how you use our site to improve performance'
                    },
                    {
                      key: 'marketing',
                      title: 'Marketing Cookies',
                      description: 'Used to show you relevant advertisements and communications'
                    },
                    {
                      key: 'third_party',
                      title: 'Third-Party Cookies',
                      description: 'Allow third-party services to function properly on our site'
                    }
                  ].map(({ key, title, description }) => (
                    <div key={key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <h4 className="font-medium text-gray-900">{title}</h4>
                        <p className="text-sm text-gray-600">{description}</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={consentChoices[key]}
                          onChange={(e) => setConsentChoices(prev => ({
                            ...prev,
                            [key]: e.target.checked
                          }))}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  ))}
                </div>
                
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={handleAcceptSelected}
                    disabled={loading}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-2 rounded-lg font-medium flex items-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    Save Preferences
                  </button>
                  
                  <button
                    onClick={() => setShowDetails(false)}
                    className="border border-gray-300 hover:bg-gray-50 text-gray-700 px-6 py-2 rounded-lg font-medium"
                  >
                    Back
                  </button>
                </div>
              </div>
            )}
          </div>
          
          <button
            onClick={() => setShowBanner(false)}
            className="text-gray-400 hover:text-gray-600 p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {loading && (
          <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GDPRConsentBanner;