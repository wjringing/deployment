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
        const { data: { session: currentSession } } = await supabase.auth.getSession();

        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (currentSession?.user) {
          await loadUserProfile(currentSession.user.id);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
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
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (profileError) throw profileError;

      if (profile) {
        setUserProfile(profile);

        await supabase
          .from('user_profiles')
          .update({ last_login: new Date().toISOString() })
          .eq('id', userId);

        if (profile.role !== 'super_admin') {
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

          if (locationsError) throw locationsError;

          setUserLocations(locations || []);
        } else {
          const { data: allLocations, error: allLocationsError } = await supabase
            .from('locations')
            .select('*')
            .eq('status', 'active');

          if (allLocationsError) throw allLocationsError;

          const formattedLocations = (allLocations || []).map(loc => ({
            location_id: loc.id,
            role: 'super_admin',
            is_primary: false,
            locations: loc
          }));

          setUserLocations(formattedLocations);
        }
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
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
