import { act, renderHook, waitFor } from '@testing-library/react-native';
import * as Location from 'expo-location';

import { useLocation } from './use-location';

// Mock expo-location
jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  getForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  hasServicesEnabledAsync: jest.fn(),
  openSettingsAsync: jest.fn(),
  Accuracy: {
    High: 4,
  },
}));

// Mock Alert
const mockAlert = jest.fn();
jest.mock('react-native', () => ({
  ...jest.requireActual('react-native'),
  Alert: {
    alert: mockAlert,
  },
}));

describe('useLocation Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default mock implementations
    (Location.hasServicesEnabledAsync as jest.Mock).mockResolvedValue(true);
    (Location.getForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
      status: 'undetermined',
    });
  });

  describe('Initialization', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useLocation());

      expect(result.current.coordinates).toBeNull();
      expect(result.current.permission).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.lastUpdated).toBeNull();
    });

    it('should check permission status on mount', async () => {
      (Location.getForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });

      renderHook(() => useLocation());

      await waitFor(() => {
        expect(Location.getForegroundPermissionsAsync).toHaveBeenCalled();
      });
    });

    it('should get current location if permission is granted on mount', async () => {
      const mockLocation = {
        coords: {
          latitude: 40.7128,
          longitude: -74.006,
          accuracy: 10,
        },
      };

      (Location.getForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });
      (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValue(
        mockLocation
      );

      const { result } = renderHook(() => useLocation());

      await waitFor(() => {
        expect(result.current.coordinates).toEqual({
          latitude: 40.7128,
          longitude: -74.006,
        });
        expect(result.current.permission?.granted).toBe(true);
      });
    });
  });

  describe('Permission Management', () => {
    it('should request permission successfully', async () => {
      (
        Location.requestForegroundPermissionsAsync as jest.Mock
      ).mockResolvedValue({
        status: 'granted',
      });

      const { result } = renderHook(() => useLocation());

      let permissionGranted: boolean = false;
      await act(async () => {
        permissionGranted = await result.current.requestPermission();
      });

      expect(permissionGranted).toBe(true);
      expect(result.current.permission?.granted).toBe(true);
      expect(result.current.isLoading).toBe(false);
    });

    it('should handle permission denial', async () => {
      (
        Location.requestForegroundPermissionsAsync as jest.Mock
      ).mockResolvedValue({
        status: 'denied',
      });

      const { result } = renderHook(() => useLocation());

      let permissionGranted: boolean = true;
      await act(async () => {
        permissionGranted = await result.current.requestPermission();
      });

      expect(permissionGranted).toBe(false);
      expect(result.current.permission?.granted).toBe(false);
      expect(mockAlert).toHaveBeenCalled();
    });

    it('should handle permission request error', async () => {
      (
        Location.requestForegroundPermissionsAsync as jest.Mock
      ).mockRejectedValue(new Error('Permission request failed'));

      const { result } = renderHook(() => useLocation());

      let permissionGranted: boolean = true;
      await act(async () => {
        permissionGranted = await result.current.requestPermission();
      });

      expect(permissionGranted).toBe(false);
      expect(result.current.error).toBe('Permission request failed');
    });
  });

  describe('Location Retrieval', () => {
    it('should get current location successfully', async () => {
      const mockLocation = {
        coords: {
          latitude: 40.7128,
          longitude: -74.006,
          accuracy: 10,
        },
      };

      (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValue(
        mockLocation
      );

      const { result } = renderHook(() => useLocation());

      let coordinates;
      await act(async () => {
        coordinates = await result.current.getCurrentLocation();
      });

      expect(coordinates).toEqual({
        latitude: 40.7128,
        longitude: -74.006,
      });
      expect(result.current.coordinates).toEqual(coordinates);
      expect(result.current.lastUpdated).toBeTruthy();
    });

    it('should handle location services disabled', async () => {
      (Location.hasServicesEnabledAsync as jest.Mock).mockResolvedValue(false);

      const { result } = renderHook(() => useLocation());

      let coordinates;
      await act(async () => {
        coordinates = await result.current.getCurrentLocation();
      });

      expect(coordinates).toBeNull();
      expect(result.current.error).toBe('Location services are disabled');
    });

    it('should handle location timeout', async () => {
      (Location.getCurrentPositionAsync as jest.Mock).mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 15000))
      );

      const { result } = renderHook(() => useLocation());

      let coordinates;
      await act(async () => {
        coordinates = await result.current.getCurrentLocation();
      });

      expect(coordinates).toBeNull();
      expect(result.current.error).toBe('Location request timeout');
    });

    it('should handle location error', async () => {
      (Location.getCurrentPositionAsync as jest.Mock).mockRejectedValue(
        new Error('Location unavailable')
      );

      const { result } = renderHook(() => useLocation());

      let coordinates;
      await act(async () => {
        coordinates = await result.current.getCurrentLocation();
      });

      expect(coordinates).toBeNull();
      expect(result.current.error).toBe('Location unavailable');
    });
  });

  describe('Distance Calculations', () => {
    it('should calculate distance between coordinates correctly', () => {
      const { result } = renderHook(() => useLocation());

      const from = { latitude: 40.7128, longitude: -74.006 }; // New York
      const to = { latitude: 34.0522, longitude: -118.2437 }; // Los Angeles

      const distance = result.current.calculateDistance(from, to);

      // Distance between NYC and LA is approximately 3944 km
      expect(distance).toBeCloseTo(3944, 0);
    });

    it('should check if location is within radius', () => {
      const { result } = renderHook(() => useLocation());

      const center = { latitude: 40.7128, longitude: -74.006 };
      const nearby = { latitude: 40.7589, longitude: -73.9851 }; // ~5km away
      const far = { latitude: 34.0522, longitude: -118.2437 }; // ~3944km away

      expect(result.current.isWithinRadius(center, nearby, 10)).toBe(true);
      expect(result.current.isWithinRadius(center, far, 10)).toBe(false);
    });

    it('should format distance correctly', () => {
      const { result } = renderHook(() => useLocation());

      expect(result.current.formatDistance(0.5)).toBe('500m');
      expect(result.current.formatDistance(1.5)).toBe('1.5km');
      expect(result.current.formatDistance(15)).toBe('15km');
    });
  });

  describe('Utility Functions', () => {
    it('should clear error', () => {
      const { result } = renderHook(() => useLocation());

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });

    it('should refresh location when permission is granted', async () => {
      const mockLocation = {
        coords: {
          latitude: 40.7128,
          longitude: -74.006,
          accuracy: 10,
        },
      };

      (Location.getForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });
      (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValue(
        mockLocation
      );

      const { result } = renderHook(() => useLocation());

      await waitFor(() => {
        expect(result.current.permission?.granted).toBe(true);
      });

      await act(async () => {
        await result.current.refreshLocation();
      });

      expect(result.current.coordinates).toEqual({
        latitude: 40.7128,
        longitude: -74.006,
      });
    });

    it('should get location accuracy', async () => {
      const mockLocation = {
        coords: {
          latitude: 40.7128,
          longitude: -74.006,
          accuracy: 15,
        },
      };

      (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValue(
        mockLocation
      );

      const { result } = renderHook(() => useLocation());

      let accuracy;
      await act(async () => {
        accuracy = await result.current.getLocationAccuracy();
      });

      expect(accuracy).toBe(15);
    });
  });

  describe('Error Handling', () => {
    it('should handle permission request errors gracefully', async () => {
      (
        Location.requestForegroundPermissionsAsync as jest.Mock
      ).mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useLocation());

      await act(async () => {
        await result.current.requestPermission();
      });

      expect(result.current.error).toBe('Network error');
      expect(result.current.isLoading).toBe(false);
    });

    it('should handle location retrieval errors gracefully', async () => {
      (Location.getCurrentPositionAsync as jest.Mock).mockRejectedValue(
        new Error('GPS signal lost')
      );

      const { result } = renderHook(() => useLocation());

      await act(async () => {
        await result.current.getCurrentLocation();
      });

      expect(result.current.error).toBe('GPS signal lost');
      expect(result.current.isLoading).toBe(false);
    });
  });
});
