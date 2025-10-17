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

      const sessionPromise = supabase.auth.getSession();
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Session fetch timeout after 10s')), 10000)
      );

      const { data: { session }, error: sessionError } = await Promise.race([
        sessionPromise,
        timeoutPromise
      ]).catch(error => {
        console.error('Session fetch failed:', error);
        return { data: { session: null }, error };
      });

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

      const { data: superAdminCheck, error: superAdminError } = await supabase
        .from('super_admins')
        .select('*')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (superAdminError) {
        console.error('Error checking super admin status:', superAdminError);
      }

      console.log('Super admin check:', superAdminCheck);
      setIsSuperAdmin(!!superAdminCheck);

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
