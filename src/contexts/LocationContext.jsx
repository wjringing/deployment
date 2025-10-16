import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

const LocationContext = createContext({});

export const useLocation = () => {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
};

export const LocationProvider = ({ children }) => {
  const { userProfile, userLocations, isSuperAdmin, getPrimaryLocation } = useAuth();
  const [currentLocation, setCurrentLocation] = useState(null);
  const [availableLocations, setAvailableLocations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userProfile && userLocations.length > 0) {
      const locations = userLocations.map(loc => loc.locations).filter(Boolean);
      setAvailableLocations(locations);

      const stored = localStorage.getItem('currentLocationId');
      if (stored) {
        const storedLocation = locations.find(loc => loc.id === stored);
        if (storedLocation) {
          setCurrentLocation(storedLocation);
        } else {
          const primary = getPrimaryLocation();
          setCurrentLocation(primary || locations[0]);
        }
      } else {
        const primary = getPrimaryLocation();
        setCurrentLocation(primary || locations[0]);
      }

      setLoading(false);
    } else if (userProfile && userLocations.length === 0 && !isSuperAdmin()) {
      setLoading(false);
    }
  }, [userProfile, userLocations]);

  const switchLocation = (locationId) => {
    const location = availableLocations.find(loc => loc.id === locationId);
    if (location) {
      setCurrentLocation(location);
      localStorage.setItem('currentLocationId', locationId);
      return true;
    }
    return false;
  };

  const clearLocation = () => {
    setCurrentLocation(null);
    localStorage.removeItem('currentLocationId');
  };

  const isCurrentLocation = (locationId) => {
    return currentLocation?.id === locationId;
  };

  const value = {
    currentLocation,
    availableLocations,
    loading,
    switchLocation,
    clearLocation,
    isCurrentLocation,
    hasMultipleLocations: availableLocations.length > 1,
  };

  return (
    <LocationContext.Provider value={value}>
      {children}
    </LocationContext.Provider>
  );
};
