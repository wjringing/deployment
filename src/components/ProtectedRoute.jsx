import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function ProtectedRoute({ children }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);

  useEffect(() => {
    const checkSession = async () => {
      try {
        // Add timeout to getSession call
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Session check timeout')), 3000)
        );

        const { data: { session } } = await Promise.race([sessionPromise, timeoutPromise]);
        setSession(session);
      } catch (error) {
        console.log('ProtectedRoute: Session check timed out, checking localStorage...');
        // Try to recover from localStorage
        const storedSession = localStorage.getItem('supabase.auth.token');
        if (storedSession) {
          try {
            const parsed = JSON.parse(storedSession);
            if (parsed?.currentSession) {
              console.log('ProtectedRoute: ✅ Recovered session from localStorage');
              setSession(parsed.currentSession);
            }
          } catch (e) {
            console.error('Failed to parse stored session:', e);
          }
        }
      } finally {
        setLoading(false);
      }
    };

    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/auth" replace />;
  }

  return children;
}
