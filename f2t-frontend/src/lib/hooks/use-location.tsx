import * as Location from 'expo-location';
import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';

// Location types
export type LocationCoordinates = {
  latitude: number;
  longitude: number;
};

export type LocationPermission = {
  granted: boolean;
  canAskAgain: boolean;
  status: Location.PermissionStatus;
};

export type LocationState = {
  coordinates: LocationCoordinates | null;
  permission: LocationPermission | null;
  isLoading: boolean;
  error: string | null;
  lastUpdated: string | null;
};

export type LocationService = {
  // State
  coordinates: LocationCoordinates | null;
  permission: LocationPermission | null;
  isLoading: boolean;
  error: string | null;
  lastUpdated: string | null;

  // Actions
  requestPermission: () => Promise<boolean>;
  getCurrentLocation: () => Promise<LocationCoordinates | null>;
  refreshLocation: () => Promise<void>;
  clearError: () => void;

  // Utilities
  calculateDistance: (
    from: LocationCoordinates,
    to: LocationCoordinates
  ) => number;
  isWithinRadius: (
    from: LocationCoordinates,
    to: LocationCoordinates,
    radiusKm: number
  ) => boolean;
  formatDistance: (distanceKm: number) => string;
  getLocationAccuracy: () => Promise<number | null>;
};

// Constants
const DEFAULT_RADIUS_KM = 100;
const LOCATION_TIMEOUT = 10000; // 10 seconds
const HIGH_ACCURACY_OPTIONS: Location.LocationOptions = {
  accuracy: Location.Accuracy.High,
  timeInterval: 1000,
  distanceInterval: 1,
};

// Helper function to calculate distance between two coordinates using Haversine formula
const calculateHaversineDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Helper function to format distance for display
const formatDistanceDisplay = (distanceKm: number): string => {
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)}m`;
  } else if (distanceKm < 10) {
    return `${distanceKm.toFixed(1)}km`;
  } else {
    return `${Math.round(distanceKm)}km`;
  }
};

// Main location hook
export function useLocation(): LocationService {
  const [state, setState] = useState<LocationState>({
    coordinates: null,
    permission: null,
    isLoading: false,
    error: null,
    lastUpdated: null,
  });

  // Request location permission
  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      const { status } = await Location.requestForegroundPermissionsAsync();
      const permission: LocationPermission = {
        granted: status === 'granted',
        canAskAgain: status !== 'denied',
        status,
      };

      setState((prev) => ({
        ...prev,
        permission,
        isLoading: false,
      }));

      if (status !== 'granted') {
        Alert.alert(
          'Location Permission Required',
          'Please enable location access to discover nearby farms and get accurate delivery estimates.',
          [{ text: 'OK', style: 'cancel' }]
        );
        return false;
      }

      return true;
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Failed to request location permission';
      setState((prev) => ({
        ...prev,
        error: errorMessage,
        isLoading: false,
      }));
      return false;
    }
  }, []);

  // Get current location
  const getCurrentLocation =
    useCallback(async (): Promise<LocationCoordinates | null> => {
      try {
        setState((prev) => ({ ...prev, isLoading: true, error: null }));

        // Check if location services are enabled
        const isEnabled = await Location.hasServicesEnabledAsync();
        if (!isEnabled) {
          throw new Error('Location services are disabled');
        }

        // Get current position with timeout
        const location = await Promise.race([
          Location.getCurrentPositionAsync(HIGH_ACCURACY_OPTIONS),
          new Promise<never>((_, reject) =>
            setTimeout(
              () => reject(new Error('Location request timeout')),
              LOCATION_TIMEOUT
            )
          ),
        ]);

        const coordinates: LocationCoordinates = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        };

        setState((prev) => ({
          ...prev,
          coordinates,
          isLoading: false,
          error: null,
          lastUpdated: new Date().toISOString(),
        }));

        return coordinates;
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : 'Failed to get current location';

        // Fallback for development/simulator issues
        if (__DEV__) {
          const fallbackCoords: LocationCoordinates = {
            latitude: 21.0285, // Hanoi
            longitude: 105.8542,
          };

          setState((prev) => ({
            ...prev,
            coordinates: fallbackCoords,
            isLoading: false,
            error: null,
            lastUpdated: new Date().toISOString(),
          }));
          return fallbackCoords;
        }

        setState((prev) => ({
          ...prev,
          error: errorMessage,
          isLoading: false,
        }));
        return null;
      }
    }, []);

  // Refresh location
  const refreshLocation = useCallback(async (): Promise<void> => {
    if (state.permission?.granted) {
      await getCurrentLocation();
    }
  }, [state.permission?.granted, getCurrentLocation]);

  // Clear error
  const clearError = useCallback((): void => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  // Calculate distance between two coordinates
  const calculateDistance = useCallback(
    (from: LocationCoordinates, to: LocationCoordinates): number => {
      return calculateHaversineDistance(
        from.latitude,
        from.longitude,
        to.latitude,
        to.longitude
      );
    },
    []
  );

  // Check if location is within radius
  const isWithinRadius = useCallback(
    (
      from: LocationCoordinates,
      to: LocationCoordinates,
      radiusKm: number = DEFAULT_RADIUS_KM
    ): boolean => {
      const distance = calculateDistance(from, to);
      return distance <= radiusKm;
    },
    [calculateDistance]
  );

  // Format distance for display
  const formatDistance = useCallback((distanceKm: number): string => {
    return formatDistanceDisplay(distanceKm);
  }, []);

  // Get location accuracy
  const getLocationAccuracy = useCallback(async (): Promise<number | null> => {
    try {
      if (!state.coordinates) return null;

      const location = await Location.getCurrentPositionAsync(
        HIGH_ACCURACY_OPTIONS
      );
      return location.coords.accuracy || null;
    } catch (error) {
      return null;
    }
  }, [state.coordinates]);

  // Initialize location service on mount
  useEffect(() => {
    const initializeLocation = async () => {
      try {
        // Check current permission status
        const { status } = await Location.getForegroundPermissionsAsync();
        const permission: LocationPermission = {
          granted: status === 'granted',
          canAskAgain: status !== 'denied',
          status,
        };

        setState((prev) => ({ ...prev, permission }));

        // If permission is granted, get current location
        if (status === 'granted') {
          await getCurrentLocation();
        }
      } catch (error) {
      }
    };

    initializeLocation();
  }, [getCurrentLocation]);

  return {
    // State
    coordinates: state.coordinates,
    permission: state.permission,
    isLoading: state.isLoading,
    error: state.error,
    lastUpdated: state.lastUpdated,

    // Actions
    requestPermission,
    getCurrentLocation,
    refreshLocation,
    clearError,

    // Utilities
    calculateDistance,
    isWithinRadius,
    formatDistance,
    getLocationAccuracy,
  };
}
