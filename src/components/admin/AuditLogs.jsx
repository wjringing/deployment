import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { FileText } from 'lucide-react';

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLogs();
  }, []);

  async function loadLogs() {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*, users(full_name, email)')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error('Error loading audit logs:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-6 h-6" />
          Audit Logs
        </CardTitle>
        <CardDescription>View system activity and user actions</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          </div>
        ) : (
          <div className="space-y-2">
            {logs.map((log) => (
              <div key={log.id} className="border-b pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-semibold">{log.action_type}</span>
                    <span className="text-sm text-gray-500 ml-2">
                      by {log.users?.full_name || 'Unknown'}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(log.created_at).toLocaleString()}
                  </span>
                </div>
              </div>
            ))}

            {logs.length === 0 && (
              <p className="text-gray-600 text-center py-8">No audit logs available</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
