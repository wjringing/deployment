import React, { useState } from 'react';
import { useLocation } from '../contexts/LocationContext';
import { useAuth } from '../contexts/AuthContext';
import { Store, ChevronDown, Check, MapPin } from 'lucide-react';

const LocationSelector = () => {
  const { currentLocation, availableLocations, switchLocation, hasMultipleLocations } = useLocation();
  const { isSuperAdmin } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  if (!currentLocation || !hasMultipleLocations) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg border border-gray-200 shadow-sm">
        <Store className="w-5 h-5 text-red-600" />
        <div>
          <div className="text-sm font-medium text-gray-900">
            {currentLocation?.name || 'No Location'}
          </div>
          {currentLocation?.location_code && (
            <div className="text-xs text-gray-500">
              Code: {currentLocation.location_code}
            </div>
          )}
        </div>
      </div>
    );
  }

  const handleLocationChange = (locationId) => {
    switchLocation(locationId);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 px-4 py-2 bg-white rounded-lg border border-gray-200 hover:border-red-300 hover:bg-red-50 transition-all shadow-sm min-w-[280px]"
      >
        <Store className="w-5 h-5 text-red-600 flex-shrink-0" />
        <div className="flex-1 text-left">
          <div className="text-sm font-medium text-gray-900">
            {currentLocation.name}
          </div>
          <div className="text-xs text-gray-500">
            {currentLocation.location_code && `Code: ${currentLocation.location_code}`}
            {currentLocation.city && ` • ${currentLocation.city}`}
          </div>
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 mt-2 w-full min-w-[320px] bg-white rounded-lg border border-gray-200 shadow-xl z-50 max-h-[400px] overflow-auto">
            <div className="p-2">
              <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                {isSuperAdmin() ? 'All Locations' : 'Your Locations'}
              </div>
              {availableLocations.map((location) => {
                const isSelected = location.id === currentLocation?.id;
                return (
                  <button
                    key={location.id}
                    onClick={() => handleLocationChange(location.id)}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-md transition-colors ${
                      isSelected
                        ? 'bg-red-50 text-red-700'
                        : 'hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    <MapPin className={`w-4 h-4 flex-shrink-0 ${isSelected ? 'text-red-600' : 'text-gray-400'}`} />
                    <div className="flex-1 text-left">
                      <div className={`text-sm font-medium ${isSelected ? 'text-red-900' : 'text-gray-900'}`}>
                        {location.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {location.location_code && `Code: ${location.location_code}`}
                        {location.city && ` • ${location.city}`}
                        {location.region && ` • ${location.region}`}
                      </div>
                    </div>
                    {isSelected && (
                      <Check className="w-5 h-5 text-red-600 flex-shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default LocationSelector;
