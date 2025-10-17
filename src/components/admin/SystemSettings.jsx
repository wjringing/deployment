import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Settings } from 'lucide-react';

export default function SystemSettings() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-6 h-6" />
          System Settings
        </CardTitle>
        <CardDescription>Configure global settings and system parameters</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-gray-600">System settings interface coming soon...</p>
      </CardContent>
    </Card>
  );
}
