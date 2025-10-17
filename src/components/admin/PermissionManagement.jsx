import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Shield } from 'lucide-react';

export default function PermissionManagement() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-6 h-6" />
          Permission Management
        </CardTitle>
        <CardDescription>Configure role permissions and access control policies</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-gray-600">Permission management interface coming soon...</p>
      </CardContent>
    </Card>
  );
}
