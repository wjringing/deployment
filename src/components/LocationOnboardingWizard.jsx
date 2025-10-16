import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Building2, ChevronRight, ChevronLeft, Check, MapPin, Settings, User, Package, AlertCircle } from 'lucide-react';
import { toast } from '../lib/toast';
import { useNavigate } from 'react-router-dom';

export default function LocationOnboardingWizard() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [basicInfo, setBasicInfo] = useState({
    location_code: '',
    location_name: '',
    address: '',
    city: '',
    postcode: '',
    region: '',
    area: '',
    timezone: 'Europe/London'
  });

  const [operatingDetails, setOperatingDetails] = useState({
    target_labor_percentage: 15.0,
    max_staff_per_shift: 20,
    opening_time: '06:00',
    closing_time: '23:00'
  });

  const [adminAccount, setAdminAccount] = useState({
    full_name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const [setupOptions, setSetupOptions] = useState({
    copyPositions: true,
    importStaff: false,
    csvFile: null
  });

  const totalSteps = 5;

  const steps = [
    { number: 1, title: 'Basic Information', icon: Building2 },
    { number: 2, title: 'Operating Details', icon: Settings },
    { number: 3, title: 'Admin Account', icon: User },
    { number: 4, title: 'Initial Setup', icon: Package },
    { number: 5, title: 'Review & Activate', icon: Check }
  ];

  const validateStep = () => {
    switch (currentStep) {
      case 1:
        if (!basicInfo.location_code || !basicInfo.location_name) {
          toast.error('Please fill in required fields: Location Code and Name');
          return false;
        }
        return true;
      case 2:
        if (operatingDetails.target_labor_percentage < 0 || operatingDetails.target_labor_percentage > 100) {
          toast.error('Labor percentage must be between 0 and 100');
          return false;
        }
        return true;
      case 3:
        if (!adminAccount.full_name || !adminAccount.email || !adminAccount.password) {
          toast.error('Please fill in all admin account fields');
          return false;
        }
        if (adminAccount.password !== adminAccount.confirmPassword) {
          toast.error('Passwords do not match');
          return false;
        }
        if (adminAccount.password.length < 6) {
          toast.error('Password must be at least 6 characters');
          return false;
        }
        return true;
      case 4:
        return true;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateStep()) {
      setCurrentStep(Math.min(currentStep + 1, totalSteps));
    }
  };

  const handlePrevious = () => {
    setCurrentStep(Math.max(currentStep - 1, 1));
  };

  const handleComplete = async () => {
    try {
      setLoading(true);

      const { data: location, error: locationError } = await supabase
        .from('locations')
        .insert([{
          ...basicInfo,
          ...operatingDetails,
          status: 'active'
        }])
        .select()
        .single();

      if (locationError) throw locationError;

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: adminAccount.email,
        password: adminAccount.password,
      });

      if (authError) throw authError;

      if (authData.user) {
        const { error: profileError } = await supabase
          .from('user_profiles')
          .update({
            full_name: adminAccount.full_name,
            role: 'location_admin'
          })
          .eq('id', authData.user.id);

        if (profileError) throw profileError;

        const { error: userLocationError } = await supabase
          .from('user_locations')
          .insert([{
            user_id: authData.user.id,
            location_id: location.id,
            is_primary: true
          }]);

        if (userLocationError) throw userLocationError;
      }

      if (setupOptions.copyPositions) {
        const { data: templatePositions } = await supabase
          .from('positions')
          .select('*')
          .is('location_id', null)
          .limit(1);

        if (templatePositions && templatePositions.length > 0) {
          const { data: allPositions } = await supabase
            .from('positions')
            .select('*')
            .is('location_id', null);

          if (allPositions) {
            const positionsToInsert = allPositions.map(pos => ({
              name: pos.name,
              type: pos.type,
              location_id: location.id,
              area_id: pos.area_id
            }));

            await supabase.from('positions').insert(positionsToInsert);
          }
        }
      }

      toast.success('Location onboarded successfully!');
      navigate('/admin/locations');
    } catch (error) {
      console.error('Error completing onboarding:', error);
      toast.error(error.message || 'Failed to complete onboarding');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6 border border-gray-100">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2 mb-2">
            <Building2 className="w-7 h-7 text-primary" />
            Location Onboarding Wizard
          </h1>
          <p className="text-sm text-gray-600">
            Set up a new location in {totalSteps} easy steps
          </p>
        </div>

        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <React.Fragment key={step.number}>
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center font-bold transition-all ${
                      currentStep > step.number
                        ? 'bg-success text-white'
                        : currentStep === step.number
                        ? 'bg-primary text-white shadow-lg'
                        : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {currentStep > step.number ? (
                      <Check className="w-6 h-6" />
                    ) : (
                      <step.icon className="w-6 h-6" />
                    )}
                  </div>
                  <p className={`text-xs mt-2 text-center font-medium ${
                    currentStep >= step.number ? 'text-gray-900' : 'text-gray-500'
                  }`}>
                    {step.title}
                  </p>
                </div>
                {index < steps.length - 1 && (
                  <div className={`h-1 flex-1 mx-2 rounded transition-all ${
                    currentStep > step.number ? 'bg-success' : 'bg-gray-200'
                  }`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        <div className="min-h-[400px]">
          {currentStep === 1 && (
            <div className="space-y-5">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Basic Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Location Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={basicInfo.location_code}
                    onChange={(e) => setBasicInfo({ ...basicInfo, location_code: e.target.value })}
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                    placeholder="e.g., 3017"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Location Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={basicInfo.location_name}
                    onChange={(e) => setBasicInfo({ ...basicInfo, location_name: e.target.value })}
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                    placeholder="e.g., KFC Manchester"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Address
                </label>
                <input
                  type="text"
                  value={basicInfo.address}
                  onChange={(e) => setBasicInfo({ ...basicInfo, address: e.target.value })}
                  className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                  placeholder="Street address"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    value={basicInfo.city}
                    onChange={(e) => setBasicInfo({ ...basicInfo, city: e.target.value })}
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                    placeholder="City"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Postcode
                  </label>
                  <input
                    type="text"
                    value={basicInfo.postcode}
                    onChange={(e) => setBasicInfo({ ...basicInfo, postcode: e.target.value })}
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                    placeholder="Postcode"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Region
                  </label>
                  <input
                    type="text"
                    value={basicInfo.region}
                    onChange={(e) => setBasicInfo({ ...basicInfo, region: e.target.value })}
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                    placeholder="e.g., North West"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Area
                  </label>
                  <input
                    type="text"
                    value={basicInfo.area}
                    onChange={(e) => setBasicInfo({ ...basicInfo, area: e.target.value })}
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                    placeholder="e.g., Manchester Area"
                  />
                </div>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-5">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Operating Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Target Labor Percentage (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={operatingDetails.target_labor_percentage}
                    onChange={(e) => setOperatingDetails({ ...operatingDetails, target_labor_percentage: parseFloat(e.target.value) })}
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                  />
                  <p className="text-xs text-gray-600 mt-1">Typical range: 12-18%</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Max Staff Per Shift
                  </label>
                  <input
                    type="number"
                    value={operatingDetails.max_staff_per_shift}
                    onChange={(e) => setOperatingDetails({ ...operatingDetails, max_staff_per_shift: parseInt(e.target.value) })}
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Opening Time
                  </label>
                  <input
                    type="time"
                    value={operatingDetails.opening_time}
                    onChange={(e) => setOperatingDetails({ ...operatingDetails, opening_time: e.target.value })}
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Closing Time
                  </label>
                  <input
                    type="time"
                    value={operatingDetails.closing_time}
                    onChange={(e) => setOperatingDetails({ ...operatingDetails, closing_time: e.target.value })}
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                  />
                </div>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-5">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Create Admin Account</h2>
              <div className="bg-info/10 border border-info/20 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-info flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-info">
                    This will create the initial administrator account for this location.
                    They will have full access to manage this location.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={adminAccount.full_name}
                  onChange={(e) => setAdminAccount({ ...adminAccount, full_name: e.target.value })}
                  className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                  placeholder="Admin name"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={adminAccount.email}
                  onChange={(e) => setAdminAccount({ ...adminAccount, email: e.target.value })}
                  className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                  placeholder="admin@example.com"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Password *
                  </label>
                  <input
                    type="password"
                    required
                    value={adminAccount.password}
                    onChange={(e) => setAdminAccount({ ...adminAccount, password: e.target.value })}
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                    placeholder="Minimum 6 characters"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Confirm Password *
                  </label>
                  <input
                    type="password"
                    required
                    value={adminAccount.confirmPassword}
                    onChange={(e) => setAdminAccount({ ...adminAccount, confirmPassword: e.target.value })}
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                    placeholder="Re-enter password"
                  />
                </div>
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-5">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Initial Setup</h2>

              <div className="space-y-4">
                <label className="flex items-start gap-3 p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                  <input
                    type="checkbox"
                    checked={setupOptions.copyPositions}
                    onChange={(e) => setSetupOptions({ ...setupOptions, copyPositions: e.target.checked })}
                    className="mt-1 w-5 h-5 text-primary focus:ring-primary focus:ring-2 rounded"
                  />
                  <div>
                    <div className="font-semibold text-gray-900">Copy Standard Positions</div>
                    <p className="text-sm text-gray-600 mt-1">
                      Copy standard KFC positions (Front Counter, Kitchen, Drive-Thru, etc.) to this location
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                  <input
                    type="checkbox"
                    checked={setupOptions.importStaff}
                    onChange={(e) => setSetupOptions({ ...setupOptions, importStaff: e.target.checked })}
                    className="mt-1 w-5 h-5 text-primary focus:ring-primary focus:ring-2 rounded"
                  />
                  <div>
                    <div className="font-semibold text-gray-900">Import Staff from CSV</div>
                    <p className="text-sm text-gray-600 mt-1">
                      Upload a CSV file with your staff list (optional - can be done later)
                    </p>
                  </div>
                </label>

                {setupOptions.importStaff && (
                  <div className="ml-8 mt-2">
                    <input
                      type="file"
                      accept=".csv"
                      onChange={(e) => setSetupOptions({ ...setupOptions, csvFile: e.target.files[0] })}
                      className="text-sm"
                    />
                    <p className="text-xs text-gray-600 mt-1">
                      CSV format: name,email,is_under_18,default_position
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {currentStep === 5 && (
            <div className="space-y-5">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Review & Activate</h2>

              <div className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <h3 className="font-semibold text-gray-900 mb-3">Location Details</h3>
                  <dl className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <dt className="text-gray-600">Code:</dt>
                      <dd className="font-medium text-gray-900">{basicInfo.location_code}</dd>
                    </div>
                    <div>
                      <dt className="text-gray-600">Name:</dt>
                      <dd className="font-medium text-gray-900">{basicInfo.location_name}</dd>
                    </div>
                    <div>
                      <dt className="text-gray-600">City:</dt>
                      <dd className="font-medium text-gray-900">{basicInfo.city || 'Not specified'}</dd>
                    </div>
                    <div>
                      <dt className="text-gray-600">Region:</dt>
                      <dd className="font-medium text-gray-900">{basicInfo.region || 'Not specified'}</dd>
                    </div>
                  </dl>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <h3 className="font-semibold text-gray-900 mb-3">Operating Details</h3>
                  <dl className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <dt className="text-gray-600">Labor Target:</dt>
                      <dd className="font-medium text-gray-900">{operatingDetails.target_labor_percentage}%</dd>
                    </div>
                    <div>
                      <dt className="text-gray-600">Max Staff/Shift:</dt>
                      <dd className="font-medium text-gray-900">{operatingDetails.max_staff_per_shift}</dd>
                    </div>
                    <div>
                      <dt className="text-gray-600">Hours:</dt>
                      <dd className="font-medium text-gray-900">
                        {operatingDetails.opening_time} - {operatingDetails.closing_time}
                      </dd>
                    </div>
                  </dl>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <h3 className="font-semibold text-gray-900 mb-3">Admin Account</h3>
                  <dl className="space-y-2 text-sm">
                    <div>
                      <dt className="text-gray-600">Name:</dt>
                      <dd className="font-medium text-gray-900">{adminAccount.full_name}</dd>
                    </div>
                    <div>
                      <dt className="text-gray-600">Email:</dt>
                      <dd className="font-medium text-gray-900">{adminAccount.email}</dd>
                    </div>
                  </dl>
                </div>

                <div className="bg-success/10 border border-success/20 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-success mb-1">Ready to Activate</p>
                      <p className="text-sm text-gray-700">
                        Click "Complete Setup" to create this location and admin account.
                        The location will be activated and ready to use immediately.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-6 border-t border-gray-200 mt-6">
          <button
            onClick={handlePrevious}
            disabled={currentStep === 1}
            className="px-6 py-2.5 border-2 border-gray-300 rounded-lg hover:bg-gray-50 font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 flex items-center gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </button>

          <div className="text-sm text-gray-600 font-medium">
            Step {currentStep} of {totalSteps}
          </div>

          {currentStep < totalSteps ? (
            <button
              onClick={handleNext}
              className="px-6 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-lg font-semibold shadow-md transition-all active:scale-95 flex items-center gap-2"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleComplete}
              disabled={loading}
              className="px-6 py-2.5 bg-success hover:bg-success/90 text-white rounded-lg font-semibold shadow-md transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                'Creating...'
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  Complete Setup
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
