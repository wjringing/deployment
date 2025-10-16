import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [userLocations, setUserLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        console.log('[AUTH] Initializing authentication...');
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        console.log('[AUTH] Session retrieved:', currentSession ? 'Yes' : 'No');

        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (currentSession?.user) {
          console.log('[AUTH] Loading profile for user:', currentSession.user.id);
          await loadUserProfile(currentSession.user.id);
        }
      } catch (error) {
        console.error('[AUTH] Error initializing auth:', error);
      } finally {
        console.log('[AUTH] Setting loading to false');
        setLoading(false);
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        console.log('[AUTH] Auth state changed:', _event);
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          await loadUserProfile(session.user.id);
        } else {
          setUserProfile(null);
          setUserLocations([]);
        }

        setLoading(false);
      }
    );

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const loadUserProfile = async (userId) => {
    try {
      console.log('[AUTH] Loading profile for user:', userId);

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Profile query timeout after 5s')), 5000)
      );

      const queryPromise = supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      const { data: profile, error: profileError } = await Promise.race([queryPromise, timeoutPromise]);

      console.log('[AUTH] Profile result:', { profile: !!profile, error: profileError });

      if (profileError) {
        console.error('[AUTH] Profile error:', profileError);
        return;
      }

      if (profile) {
        console.log('[AUTH] Profile found, role:', profile.role);
        setUserProfile(profile);

        supabase
          .from('user_profiles')
          .update({ last_login: new Date().toISOString() })
          .eq('id', userId)
          .then(() => console.log('[AUTH] Last login updated'))
          .catch(err => console.error('[AUTH] Last login update failed:', err));

        if (profile.role !== 'super_admin') {
          console.log('[AUTH] Loading locations for non-super-admin');
          const { data: locations, error: locationsError } = await supabase
            .from('user_location_access')
            .select(`
              location_id,
              role,
              is_primary,
              locations (
                id,
                location_code,
                location_name,
                status
              )
            `)
            .eq('user_id', userId);

          console.log('[AUTH] Locations result:', { count: locations?.length, error: locationsError });

          if (locationsError) {
            console.error('[AUTH] Locations error:', locationsError);
            setUserLocations([]);
            return;
          }

          setUserLocations(locations || []);
        } else {
          console.log('[AUTH] Loading all locations for super admin');
          const { data: allLocations, error: allLocationsError } = await supabase
            .from('locations')
            .select('*')
            .eq('status', 'active');

          console.log('[AUTH] All locations result:', { count: allLocations?.length, error: allLocationsError });

          if (allLocationsError) {
            console.error('[AUTH] All locations error:', allLocationsError);
            setUserLocations([]);
            return;
          }

          const formattedLocations = (allLocations || []).map(loc => ({
            location_id: loc.id,
            role: 'super_admin',
            is_primary: false,
            locations: loc
          }));

          setUserLocations(formattedLocations);
        }
        console.log('[AUTH] Profile loading complete');
      } else {
        console.warn('[AUTH] No profile found for user:', userId);
      }
    } catch (error) {
      console.error('[AUTH] Error loading user profile:', error);
    }
  };

  const signIn = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  };

  const signUp = async (email, password, userData) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userData
        }
      });

      if (error) throw error;

      if (data.user) {
        const { error: profileError } = await supabase
          .from('user_profiles')
          .insert({
            id: data.user.id,
            email: email,
            full_name: userData.full_name || '',
            role: userData.role || 'location_operator',
            status: 'active'
          });

        if (profileError) throw profileError;
      }

      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      setUser(null);
      setUserProfile(null);
      setUserLocations([]);
      setSession(null);

      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  const resetPassword = async (email) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  const updatePassword = async (newPassword) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });
      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  const isSuperAdmin = () => {
    return userProfile?.role === 'super_admin' && userProfile?.status === 'active';
  };

  const isLocationAdmin = (locationId = null) => {
    if (isSuperAdmin()) return true;

    if (!locationId) {
      return userLocations.some(loc => loc.role === 'location_admin');
    }

    return userLocations.some(
      loc => loc.location_id === locationId && loc.role === 'location_admin'
    );
  };

  const canAccessLocation = (locationId) => {
    if (isSuperAdmin()) return true;
    return userLocations.some(loc => loc.location_id === locationId);
  };

  const getPrimaryLocation = () => {
    const primary = userLocations.find(loc => loc.is_primary);
    return primary ? primary.locations : userLocations[0]?.locations || null;
  };

  const value = {
    user,
    userProfile,
    userLocations,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
    isSuperAdmin,
    isLocationAdmin,
    canAccessLocation,
    getPrimaryLocation,
    refreshProfile: () => user ? loadUserProfile(user.id) : null,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
