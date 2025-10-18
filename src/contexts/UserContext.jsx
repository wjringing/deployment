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
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    let mounted = true;
    let isInitializing = false;

    async function initAuth() {
      if (isInitializing) return;
      isInitializing = true;

      try {
        await loadUserData();
      } catch (error) {
        console.error('Failed to initialize auth:', error);
        if (mounted) {
          setLoading(false);
        }
      } finally {
        isInitializing = false;
      }
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !isInitializing && currentUser) {
        return;
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted || isInitializing) return;

      if (event === 'SIGNED_IN' && session) {
        await loadUserData();
      } else if (event === 'SIGNED_OUT') {
        setCurrentUser(null);
        setUserProfile(null);
        setUserLocations([]);
        setUserPermissions([]);
        setIsSuperAdmin(false);
        setSelectedLocation(null);
        setUserRole(null);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      subscription.unsubscribe();
    };
  }, []);

  async function loadUserData() {
    try {
      setLoading(true);

      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        console.error('Session error:', sessionError);
        setLoading(false);
        return;
      }

      if (!session?.user) {
        setLoading(false);
        return;
      }

      setCurrentUser(session.user);

      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle();

      setUserProfile(profile);
      const isSuperAdminUser = profile?.is_super_admin_cache || false;
      setIsSuperAdmin(isSuperAdminUser);

      if (isSuperAdminUser) {
        const [locationsResult, permissionsResult] = await Promise.all([
          supabase.from('locations').select('*').order('location_name'),
          supabase.from('permissions').select('permission_key')
        ]);

        const allLocations = locationsResult.data || [];
        setUserLocations(allLocations);
        setUserPermissions(permissionsResult.data?.map(p => p.permission_key) || []);

        let locationToSelect = null;
        if (profile?.default_location_id) {
          locationToSelect = allLocations.find(l => l.id === profile.default_location_id);
        }
        if (!locationToSelect && allLocations.length > 0) {
          locationToSelect = allLocations[0];
        }
        if (locationToSelect) {
          setSelectedLocation(locationToSelect);
        }

        setUserRole('super_admin');
      } else {
        const { data: userLocationsData } = await supabase
          .from('user_locations')
          .select(`
            location_id,
            role_name,
            locations (*)
          `)
          .eq('user_id', session.user.id);

        const locationsList = userLocationsData?.map(l => l.locations) || [];
        setUserLocations(locationsList);

        if (userLocationsData && userLocationsData.length > 0) {
          const primaryRole = userLocationsData[0].role_name;
          setUserRole(primaryRole);

          const roleNames = userLocationsData.map(l => l.role_name);

          const [rolePermsResult, userPermsResult] = await Promise.all([
            supabase
              .from('role_permissions')
              .select('permission_key')
              .in('role_name', roleNames)
              .eq('granted', true),
            supabase
              .from('location_user_permissions')
              .select('permission_key, granted')
              .eq('user_id', session.user.id)
          ]);

          const permissionSet = new Set(rolePermsResult.data?.map(p => p.permission_key) || []);

          userPermsResult.data?.forEach(up => {
            if (up.granted) {
              permissionSet.add(up.permission_key);
            } else {
              permissionSet.delete(up.permission_key);
            }
          });

          setUserPermissions(Array.from(permissionSet));
        }

        let locationToSelect = null;
        if (profile?.default_location_id) {
          locationToSelect = locationsList.find(l => l.id === profile.default_location_id);
        }
        if (!locationToSelect && locationsList.length > 0) {
          locationToSelect = locationsList[0];
        }
        if (locationToSelect) {
          setSelectedLocation(locationToSelect);
        }
      }

      supabase
        .from('users')
        .update({ last_login: new Date().toISOString() })
        .eq('id', session.user.id)
        .then(() => {})
        .catch(() => {});

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
    return userRole;
  }

  function canAccessMultipleLocations() {
    if (isSuperAdmin) return true;
    return ['area_manager', 'regional_manager'].includes(userRole);
  }

  async function switchLocation(location) {
    setSelectedLocation(location);

    if (currentUser?.id) {
      try {
        await supabase.rpc('update_user_preferences', {
          p_default_location_id: location.id
        });
      } catch (error) {
        console.error('Failed to save location preference:', error);
      }
    }
  }

  async function updateLandingPage(landingPage) {
    if (!currentUser?.id) return;

    try {
      await supabase.rpc('update_user_preferences', {
        p_preferred_landing_page: landingPage
      });

      setUserProfile(prev => ({
        ...prev,
        preferred_landing_page: landingPage
      }));
    } catch (error) {
      console.error('Failed to update landing page preference:', error);
      throw error;
    }
  }

  const value = {
    currentUser,
    userProfile,
    userLocations,
    userPermissions,
    isSuperAdmin,
    selectedLocation,
    loading,
    userRole,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    getUserRole,
    canAccessMultipleLocations,
    switchLocation,
    updateLandingPage,
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
