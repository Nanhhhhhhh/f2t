import type { LocationCoordinates } from '../hooks/use-location';
import {
  calculateCenter,
  calculateDeliveryFee,
  calculateDeliveryTime,
  calculateDistance,
  coordinatesToKey,
  filterByRadius,
  formatDistance,
  getBoundingBox,
  getDistanceCategory,
  getDistanceColor,
  getDistanceIcon,
  isDeliveryAvailable,
  isValidCoordinates,
  isWithinRadius,
  keyToCoordinates,
  reverseGeocode,
  sortByDistance,
} from './utils';

describe('Location Utils', () => {
  const newYork: LocationCoordinates = {
    latitude: 40.7128,
    longitude: -74.006,
  };
  const losAngeles: LocationCoordinates = {
    latitude: 34.0522,
    longitude: -118.2437,
  };
  const chicago: LocationCoordinates = {
    latitude: 41.8781,
    longitude: -87.6298,
  };
  const boston: LocationCoordinates = {
    latitude: 42.3601,
    longitude: -71.0589,
  };

  describe('calculateDistance', () => {
    it('should calculate distance between two coordinates', () => {
      const distance = calculateDistance(newYork, losAngeles);
      expect(distance).toBeCloseTo(3936, 0);
    });

    it('should return 0 for same coordinates', () => {
      const distance = calculateDistance(newYork, newYork);
      expect(distance).toBe(0);
    });

    it('should calculate short distances accurately', () => {
      const distance = calculateDistance(newYork, boston);
      expect(distance).toBeCloseTo(306, 0);
    });
  });

  describe('isWithinRadius', () => {
    it('should return true for locations within radius', () => {
      const result = isWithinRadius(newYork, boston, 500);
      expect(result).toBe(true);
    });

    it('should return false for locations outside radius', () => {
      const result = isWithinRadius(newYork, losAngeles, 1000);
      expect(result).toBe(false);
    });

    it('should return true for exact radius boundary', () => {
      const result = isWithinRadius(newYork, newYork, 0);
      expect(result).toBe(true);
    });
  });

  describe('formatDistance', () => {
    it('should format very short distances', () => {
      expect(formatDistance(0.05)).toBe('< 100m');
      expect(formatDistance(0.5)).toBe('500m');
    });

    it('should format short distances in meters', () => {
      expect(formatDistance(0.8)).toBe('800m');
    });

    it('should format medium distances in kilometers', () => {
      expect(formatDistance(1.5)).toBe('1.5km');
      expect(formatDistance(5.7)).toBe('5.7km');
    });

    it('should format long distances in kilometers', () => {
      expect(formatDistance(15)).toBe('15km');
      expect(formatDistance(100)).toBe('100km');
    });
  });

  describe('getDistanceCategory', () => {
    it('should categorize very close distances', () => {
      expect(getDistanceCategory(0.5)).toBe('very-close');
      expect(getDistanceCategory(0.9)).toBe('very-close');
    });

    it('should categorize close distances', () => {
      expect(getDistanceCategory(1.5)).toBe('close');
      expect(getDistanceCategory(4.9)).toBe('close');
    });

    it('should categorize nearby distances', () => {
      expect(getDistanceCategory(5.5)).toBe('nearby');
      expect(getDistanceCategory(24.9)).toBe('nearby');
    });

    it('should categorize far distances', () => {
      expect(getDistanceCategory(25.5)).toBe('far');
      expect(getDistanceCategory(99.9)).toBe('far');
    });

    it('should categorize very far distances', () => {
      expect(getDistanceCategory(100.5)).toBe('very-far');
      expect(getDistanceCategory(1000)).toBe('very-far');
    });
  });

  describe('getDistanceColor', () => {
    it('should return appropriate colors for different distances', () => {
      expect(getDistanceColor(0.5)).toBe('text-green-600 dark:text-green-400');
      expect(getDistanceColor(2)).toBe('text-green-500 dark:text-green-300');
      expect(getDistanceColor(10)).toBe('text-yellow-600 dark:text-yellow-400');
      expect(getDistanceColor(50)).toBe('text-orange-600 dark:text-orange-400');
      expect(getDistanceColor(150)).toBe('text-red-600 dark:text-red-400');
    });
  });

  describe('getDistanceIcon', () => {
    it('should return appropriate icons for different distances', () => {
      expect(getDistanceIcon(0.5)).toBe('📍');
      expect(getDistanceIcon(2)).toBe('🏠');
      expect(getDistanceIcon(10)).toBe('🚗');
      expect(getDistanceIcon(50)).toBe('🚛');
      expect(getDistanceIcon(150)).toBe('✈️');
    });
  });

  describe('calculateDeliveryTime', () => {
    it('should calculate same-day delivery time', () => {
      const time = calculateDeliveryTime(10, 'same-day');
      expect(time).toBe(5); // 2 + 10 * 0.5, but max(2, 5) = 5
    });

    it('should calculate next-day delivery time', () => {
      const time = calculateDeliveryTime(5, 'next-day');
      expect(time).toBe(24); // 24 + 5 * 0.5, but max(24, 2.5) = 24
    });

    it('should calculate scheduled delivery time', () => {
      const time = calculateDeliveryTime(20, 'scheduled');
      expect(time).toBe(48); // 48 + 20 * 0.5, but max(48, 10) = 48
    });

    it('should use travel time for very long distances', () => {
      const time = calculateDeliveryTime(200, 'same-day');
      expect(time).toBe(100); // 2 + 200 * 0.5, but max(2, 100) = 100
    });
  });

  describe('isDeliveryAvailable', () => {
    it('should return true for locations within delivery radius', () => {
      const result = isDeliveryAvailable(newYork, boston, 500);
      expect(result).toBe(true);
    });

    it('should return false for locations outside delivery radius', () => {
      const result = isDeliveryAvailable(newYork, losAngeles, 1000);
      expect(result).toBe(false);
    });

    it('should use default radius of 50km', () => {
      const result = isDeliveryAvailable(newYork, boston, 50);
      expect(result).toBe(false); // Boston is ~306km from NYC
    });
  });

  describe('calculateDeliveryFee', () => {
    it('should calculate delivery fee with default rates', () => {
      const fee = calculateDeliveryFee(10);
      expect(fee).toBe(10); // 5 + 10 * 0.5
    });

    it('should calculate delivery fee with custom rates', () => {
      const fee = calculateDeliveryFee(20, 10, 1);
      expect(fee).toBe(30); // 10 + 20 * 1
    });

    it('should round to 2 decimal places', () => {
      const fee = calculateDeliveryFee(3.33, 1, 0.33);
      expect(fee).toBe(2.1); // 1 + 3.33 * 0.33 = 2.0989, rounded to 2.1
    });
  });

  describe('sortByDistance', () => {
    const locations = [
      { id: 1, coordinates: losAngeles },
      { id: 2, coordinates: boston },
      { id: 3, coordinates: chicago },
    ];

    it('should sort locations by distance from center', () => {
      const sorted = sortByDistance(newYork, locations);
      expect(sorted[0].id).toBe(2); // Boston (closest)
      expect(sorted[1].id).toBe(3); // Chicago
      expect(sorted[2].id).toBe(1); // Los Angeles (farthest)
    });
  });

  describe('filterByRadius', () => {
    const locations = [
      { id: 1, coordinates: losAngeles },
      { id: 2, coordinates: boston },
      { id: 3, coordinates: chicago },
    ];

    it('should filter locations within radius', () => {
      const filtered = filterByRadius(newYork, locations, 500);
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe(2); // Only Boston
    });

    it('should return empty array for small radius', () => {
      const filtered = filterByRadius(newYork, locations, 10);
      expect(filtered).toHaveLength(0);
    });
  });

  describe('getBoundingBox', () => {
    it('should calculate bounding box for location and radius', () => {
      const box = getBoundingBox(newYork, 100);

      expect(box.north).toBeGreaterThan(newYork.latitude);
      expect(box.south).toBeLessThan(newYork.latitude);
      expect(box.east).toBeGreaterThan(newYork.longitude);
      expect(box.west).toBeLessThan(newYork.longitude);
    });
  });

  describe('isValidCoordinates', () => {
    it('should validate correct coordinates', () => {
      expect(isValidCoordinates(newYork)).toBe(true);
      expect(isValidCoordinates({ latitude: 0, longitude: 0 })).toBe(true);
      expect(isValidCoordinates({ latitude: -90, longitude: -180 })).toBe(true);
      expect(isValidCoordinates({ latitude: 90, longitude: 180 })).toBe(true);
    });

    it('should reject invalid coordinates', () => {
      expect(isValidCoordinates({ latitude: 91, longitude: 0 })).toBe(false);
      expect(isValidCoordinates({ latitude: -91, longitude: 0 })).toBe(false);
      expect(isValidCoordinates({ latitude: 0, longitude: 181 })).toBe(false);
      expect(isValidCoordinates({ latitude: 0, longitude: -181 })).toBe(false);
      expect(isValidCoordinates({ latitude: NaN, longitude: 0 })).toBe(false);
      expect(isValidCoordinates({ latitude: 0, longitude: NaN })).toBe(false);
    });
  });

  describe('coordinatesToKey and keyToCoordinates', () => {
    it('should convert coordinates to key and back', () => {
      const key = coordinatesToKey(newYork);
      expect(key).toBe('40.712800,-74.006000');

      const coords = keyToCoordinates(key);
      expect(coords).toEqual(newYork);
    });

    it('should handle invalid keys', () => {
      expect(keyToCoordinates('invalid')).toBeNull();
      expect(keyToCoordinates('40.7128')).toBeNull();
      expect(keyToCoordinates('40.7128,invalid')).toBeNull();
    });
  });

  describe('reverseGeocode', () => {
    it('should return a promise that resolves to coordinates string', async () => {
      const result = await reverseGeocode(newYork);
      expect(result).toBe('40.7128, -74.0060');
    });
  });

  describe('calculateCenter', () => {
    it('should calculate center of multiple coordinates', () => {
      const coords = [newYork, losAngeles, chicago];
      const center = calculateCenter(coords);

      expect(center.latitude).toBeCloseTo(38.88, 1);
      expect(center.longitude).toBeCloseTo(-93.29, 1);
    });

    it('should throw error for empty array', () => {
      expect(() => calculateCenter([])).toThrow(
        'Cannot calculate center of empty coordinates array'
      );
    });

    it('should return the same coordinate for single item', () => {
      const center = calculateCenter([newYork]);
      expect(center).toEqual(newYork);
    });
  });
});
