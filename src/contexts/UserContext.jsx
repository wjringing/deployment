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
    loadUserData();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        await loadUserData();
      } else if (event === 'SIGNED_OUT') {
        setCurrentUser(null);
        setUserProfile(null);
        setUserLocations([]);
        setUserPermissions([]);
        setIsSuperAdmin(false);
        setSelectedLocation(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function loadUserData() {
    try {
      setLoading(true);
      console.log('Loading user data...');

      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        console.error('Session error:', sessionError);
        setLoading(false);
        return;
      }

      if (!session?.user) {
        console.log('No active session');
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

    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
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
