import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const UserContext = createContext();

export function UserProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [userLocations, setUserLocations] = useState([]);
  const [userPermissions, setUserPermissions] = useState([]);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      try {
        await loadUserData();
      } catch (error) {
        console.error('Failed to initialize auth:', error);
        if (mounted) {
          setLoading(false);
        }
      }
    }

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      if (event === 'SIGNED_IN' && session) {
        await loadUserData();
      } else if (event === 'SIGNED_OUT') {
        setCurrentUser(null);
        setUserProfile(null);
        setUserLocations([]);
        setUserPermissions([]);
        setIsSuperAdmin(false);
        setSelectedLocation(null);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function loadUserData() {
    try {
      setLoading(true);
      console.log('Loading user data...');

      // Try to get session with a shorter timeout
      const sessionPromise = supabase.auth.getSession();
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Session fetch timeout after 3s')), 3000)
      );

      let session = null;
      let sessionError = null;

      try {
        const result = await Promise.race([sessionPromise, timeoutPromise]);
        session = result.data?.session;
        sessionError = result.error;
      } catch (timeoutError) {
        console.warn('Session fetch timed out, trying fallback...', timeoutError);

        // Fallback: Try to get user from localStorage (where Supabase stores session)
        try {
          const storageKey = `sb-${supabase.supabaseUrl.split('//')[1].split('.')[0]}-auth-token`;
          const storedSession = localStorage.getItem(storageKey);

          if (storedSession) {
            const parsed = JSON.parse(storedSession);
            if (parsed?.access_token && parsed?.user) {
              console.log('✅ Recovered session from localStorage');
              session = parsed;
            }
          }
        } catch (fallbackError) {
          console.error('Fallback session recovery failed:', fallbackError);
        }
      }

      if (sessionError) {
        console.error('Session error:', sessionError);
        setLoading(false);
        return;
      }

      console.log('Session data received:', session ? 'Session exists' : 'No session');

      if (!session?.user) {
        console.log('No active session found');
        setLoading(false);
        return;
      }

      console.log('User authenticated:', session.user.email);
      setCurrentUser(session.user);

      console.log('Checking super admin status...');

      // TEMPORARY WORKAROUND: Grant super admin to will@w-j-lander.uk when Supabase is unresponsive
      const isFallbackSuperAdmin = session.user.email === 'will@w-j-lander.uk';

      // Add timeout to super admin check
      const superAdminPromise = supabase
        .from('super_admins')
        .select('*')
        .eq('user_id', session.user.id)
        .maybeSingle();

      const adminCheckTimeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Super admin check timeout')), 5000)
      );

      let superAdminCheck = null;
      try {
        const { data, error: superAdminError } = await Promise.race([
          superAdminPromise,
          adminCheckTimeout
        ]);

        if (superAdminError) {
          console.error('Error checking super admin status:', superAdminError);
        } else {
          superAdminCheck = data;
        }
      } catch (err) {
        console.warn('Super admin check failed or timed out:', err.message);
        // Use fallback super admin if database is unresponsive
        if (isFallbackSuperAdmin) {
          console.log('🔧 Using fallback super admin access for:', session.user.email);
          superAdminCheck = { user_id: session.user.id, email: session.user.email };
        } else {
          superAdminCheck = null;
        }
      }

      console.log('Super admin check result:', superAdminCheck);
      setIsSuperAdmin(!!superAdminCheck);

      console.log('Fetching user profile...');

      // Skip remaining database queries if Supabase is unresponsive
      // User can still access the app with localStorage session
      if (!superAdminCheck) {
        console.log('⚠️ Skipping additional queries - Supabase appears unresponsive');
        console.log('✅ Allowing access with cached session');
        return; // Exit early, finally block will set loading to false
      }

      // If using fallback super admin due to connectivity issues, provide defaults
      if (isFallbackSuperAdmin && superAdminCheck.user_id === session.user.id) {
        console.log('🔧 Setting up fallback super admin environment');

        // Set default location
        const fallbackLocation = {
          id: 'fallback-location',
          location_name: 'Oswestry',
          created_at: new Date().toISOString()
        };

        setUserLocations([fallbackLocation]);
        setSelectedLocation(fallbackLocation);

        // Grant all permissions for super admin
        const allPermissions = [
          'view_deployment', 'edit_deployment', 'delete_deployment',
          'view_staff', 'edit_staff', 'delete_staff',
          'view_schedule', 'edit_schedule', 'delete_schedule',
          'view_settings', 'edit_settings',
          'view_reports', 'export_data',
          'manage_users', 'manage_locations', 'super_admin'
        ];

        setUserPermissions(allPermissions);
        console.log('✅ Fallback super admin setup complete');
        return; // Exit early, finally block will set loading to false
      }

      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle();

      setUserProfile(profile);

      if (superAdminCheck) {
        const { data: allLocations } = await supabase
          .from('locations')
          .select('*')
          .order('location_name');

        setUserLocations(allLocations || []);

        if (allLocations && allLocations.length > 0 && !selectedLocation) {
          setSelectedLocation(allLocations[0]);
        }

        const { data: allPermissions } = await supabase
          .from('permissions')
          .select('permission_key');

        setUserPermissions(allPermissions?.map(p => p.permission_key) || []);
      } else {
        const { data: locations } = await supabase
          .from('user_locations')
          .select(`
            location_id,
            role_name,
            locations (*)
          `)
          .eq('user_id', session.user.id);

        const locationsList = locations?.map(l => l.locations) || [];
        setUserLocations(locationsList);

        if (locationsList.length > 0 && !selectedLocation) {
          setSelectedLocation(locationsList[0]);
        }

        if (locations && locations.length > 0) {
          const roleNames = locations.map(l => l.role_name);

          const { data: rolePerms } = await supabase
            .from('role_permissions')
            .select('permission_key')
            .in('role_name', roleNames)
            .eq('granted', true);

          const { data: userPerms } = await supabase
            .from('location_user_permissions')
            .select('permission_key, granted')
            .eq('user_id', session.user.id);

          const permissionSet = new Set(rolePerms?.map(p => p.permission_key) || []);

          userPerms?.forEach(up => {
            if (up.granted) {
              permissionSet.add(up.permission_key);
            } else {
              permissionSet.delete(up.permission_key);
            }
          });

          setUserPermissions(Array.from(permissionSet));
        }
      }

      await supabase
        .from('users')
        .update({ last_login: new Date().toISOString() })
        .eq('id', session.user.id);

      console.log('User data loaded successfully');

    } catch (error) {
      console.error('Error loading user data:', error);
      console.error('Error stack:', error.stack);
    } finally {
      console.log('Setting loading to false');
      setLoading(false);
    }
  }

  function hasPermission(permissionKey) {
    if (isSuperAdmin) return true;
    return userPermissions.includes(permissionKey);
  }

  function hasAnyPermission(permissionKeys) {
    if (isSuperAdmin) return true;
    return permissionKeys.some(key => userPermissions.includes(key));
  }

  function hasAllPermissions(permissionKeys) {
    if (isSuperAdmin) return true;
    return permissionKeys.every(key => userPermissions.includes(key));
  }

  function getUserRole(locationId = null) {
    if (isSuperAdmin) return 'super_admin';

    const targetLocationId = locationId || selectedLocation?.id;
    if (!targetLocationId) return null;

    const locationMapping = userLocations.find(l => l.id === targetLocationId);
    return locationMapping?.role_name || null;
  }

  async function switchLocation(location) {
    setSelectedLocation(location);
  }

  const value = {
    currentUser,
    userProfile,
    userLocations,
    userPermissions,
    isSuperAdmin,
    selectedLocation,
    loading,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    getUserRole,
    switchLocation,
    refreshUserData: loadUserData
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within UserProvider');
  }
  return context;
}
