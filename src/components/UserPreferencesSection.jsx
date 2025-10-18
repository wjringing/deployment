import { useState, useEffect } from 'react';
import { useUser } from '../contexts/UserContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { toast } from 'sonner';
import { User, MapPin, LayoutDashboard, Shield, Save } from 'lucide-react';

export default function UserPreferencesSection() {
  const { isSuperAdmin, userProfile, userLocations, updateLandingPage, selectedLocation } = useUser();
  const [selectedLandingPage, setSelectedLandingPage] = useState('/');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (userProfile?.preferred_landing_page) {
      setSelectedLandingPage(userProfile.preferred_landing_page);
    }
  }, [userProfile]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateLandingPage(selectedLandingPage);
      toast.success('Preferences updated successfully!');
    } catch (error) {
      toast.error('Failed to update preferences: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            User Preferences
          </CardTitle>
          <CardDescription>
            Customize your experience and set your preferred default landing page
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div>
              <Label className="text-base font-semibold">Default Landing Page</Label>
              <p className="text-sm text-gray-500 mb-3">
                Choose which page you want to see when you log in
              </p>
              <div className="space-y-2">
                <label className="flex items-center gap-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                  <input
                    type="radio"
                    name="landing-page"
                    value="/"
                    checked={selectedLandingPage === '/'}
                    onChange={(e) => setSelectedLandingPage(e.target.value)}
                    className="w-4 h-4 text-red-600"
                  />
                  <div className="flex items-center gap-2 flex-1">
                    <LayoutDashboard className="w-5 h-5 text-gray-600" />
                    <div>
                      <div className="font-medium">Deployment Management System</div>
                      <div className="text-sm text-gray-500">
                        Main application for managing deployments and schedules
                      </div>
                    </div>
                  </div>
                </label>

                {isSuperAdmin && (
                  <label className="flex items-center gap-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                    <input
                      type="radio"
                      name="landing-page"
                      value="/admin"
                      checked={selectedLandingPage === '/admin'}
                      onChange={(e) => setSelectedLandingPage(e.target.value)}
                      className="w-4 h-4 text-red-600"
                    />
                    <div className="flex items-center gap-2 flex-1">
                      <Shield className="w-5 h-5 text-gray-600" />
                      <div>
                        <div className="font-medium">Super Admin Portal</div>
                        <div className="text-sm text-gray-500">
                          System-wide management, users, and locations
                        </div>
                      </div>
                    </div>
                  </label>
                )}
              </div>
            </div>

            <div className="pt-4 border-t">
              <Label className="text-base font-semibold">Current Location</Label>
              <p className="text-sm text-gray-500 mb-3">
                Your current selected location
              </p>
              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                <MapPin className="w-5 h-5 text-gray-600" />
                <div>
                  <div className="font-medium">{selectedLocation?.location_name || 'No location selected'}</div>
                  <div className="text-sm text-gray-500">
                    {userLocations.length} location{userLocations.length !== 1 ? 's' : ''} available
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t">
            <Button
              onClick={handleSave}
              disabled={saving || selectedLandingPage === userProfile?.preferred_landing_page}
              className="flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Preferences'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
