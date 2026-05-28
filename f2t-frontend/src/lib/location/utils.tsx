import type { LocationCoordinates } from '../hooks/use-location';

// Location utility functions for the Farm Marketplace app

/**
 * Calculate the distance between two coordinates using the Haversine formula
 * @param from - Starting coordinates
 * @param to - Destination coordinates
 * @returns Distance in kilometers
 */
export function calculateDistance(
  from: LocationCoordinates,
  to: LocationCoordinates
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (to.latitude - from.latitude) * (Math.PI / 180);
  const dLon = (to.longitude - from.longitude) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(from.latitude * (Math.PI / 180)) *
      Math.cos(to.latitude * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Check if a location is within a specified radius of another location
 * @param center - Center coordinates
 * @param target - Target coordinates to check
 * @param radiusKm - Radius in kilometers
 * @returns True if target is within radius
 */
export function isWithinRadius(
  center: LocationCoordinates,
  target: LocationCoordinates,
  radiusKm: number
): boolean {
  const distance = calculateDistance(center, target);
  return distance <= radiusKm;
}

/**
 * Format distance for display
 * @param distanceKm - Distance in kilometers
 * @returns Formatted distance string
 */
export function formatDistance(distanceKm: number): string {
  if (distanceKm < 0.1) {
    return '< 100m';
  } else if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)}m`;
  } else if (distanceKm < 10) {
    return `${distanceKm.toFixed(1)}km`;
  } else {
    return `${Math.round(distanceKm)}km`;
  }
}

/**
 * Get distance category for UI display
 * @param distanceKm - Distance in kilometers
 * @returns Distance category
 */
export function getDistanceCategory(
  distanceKm: number
): 'very-close' | 'close' | 'nearby' | 'far' | 'very-far' {
  if (distanceKm < 1) return 'very-close';
  if (distanceKm < 5) return 'close';
  if (distanceKm < 25) return 'nearby';
  if (distanceKm < 100) return 'far';
  return 'very-far';
}

/**
 * Get distance category color for UI
 * @param distanceKm - Distance in kilometers
 * @returns Color class name
 */
export function getDistanceColor(distanceKm: number): string {
  const category = getDistanceCategory(distanceKm);
  const colorMap = {
    'very-close': 'text-green-600 dark:text-green-400',
    close: 'text-green-500 dark:text-green-300',
    nearby: 'text-yellow-600 dark:text-yellow-400',
    far: 'text-orange-600 dark:text-orange-400',
    'very-far': 'text-red-600 dark:text-red-400',
  };
  return colorMap[category];
}

/**
 * Get distance category icon
 * @param distanceKm - Distance in kilometers
 * @returns Icon name
 */
export function getDistanceIcon(distanceKm: number): string {
  const category = getDistanceCategory(distanceKm);
  const iconMap = {
    'very-close': '📍',
    close: '🏠',
    nearby: '🚗',
    far: '🚛',
    'very-far': '✈️',
  };
  return iconMap[category];
}

/**
 * Calculate delivery time estimate based on distance
 * @param distanceKm - Distance in kilometers
 * @param deliveryType - Type of delivery
 * @returns Estimated delivery time in hours
 */
export function calculateDeliveryTime(
  distanceKm: number,
  deliveryType: 'same-day' | 'next-day' | 'scheduled' = 'same-day'
): number {
  const baseTime =
    deliveryType === 'same-day' ? 2 : deliveryType === 'next-day' ? 24 : 48;
  const travelTime = distanceKm * 0.5; // 30 minutes per km average
  return Math.max(baseTime, travelTime);
}

/**
 * Check if delivery is available to a location
 * @param from - Farm coordinates
 * @param to - Delivery coordinates
 * @param maxDeliveryRadius - Maximum delivery radius in km
 * @returns True if delivery is available
 */
export function isDeliveryAvailable(
  from: LocationCoordinates,
  to: LocationCoordinates,
  maxDeliveryRadius: number = 50
): boolean {
  const distance = calculateDistance(from, to);
  return distance <= maxDeliveryRadius;
}

/**
 * Get delivery fee based on distance
 * @param distanceKm - Distance in kilometers
 * @param baseFee - Base delivery fee
 * @param perKmFee - Fee per kilometer
 * @returns Calculated delivery fee
 */
export function calculateDeliveryFee(
  distanceKm: number,
  baseFee: number = 5,
  perKmFee: number = 0.5
): number {
  return Math.round((baseFee + distanceKm * perKmFee) * 100) / 100;
}

/**
 * Sort locations by distance from a center point
 * @param center - Center coordinates
 * @param locations - Array of locations with coordinates
 * @returns Sorted locations by distance
 */
export function sortByDistance<T extends { coordinates: LocationCoordinates }>(
  center: LocationCoordinates,
  locations: T[]
): T[] {
  return locations.sort((a, b) => {
    const distanceA = calculateDistance(center, a.coordinates);
    const distanceB = calculateDistance(center, b.coordinates);
    return distanceA - distanceB;
  });
}

/**
 * Filter locations within a radius
 * @param center - Center coordinates
 * @param locations - Array of locations with coordinates
 * @param radiusKm - Radius in kilometers
 * @returns Filtered locations within radius
 */
export function filterByRadius<T extends { coordinates: LocationCoordinates }>(
  center: LocationCoordinates,
  locations: T[],
  radiusKm: number
): T[] {
  return locations.filter((location) =>
    isWithinRadius(center, location.coordinates, radiusKm)
  );
}

/**
 * Get bounding box for a location and radius
 * @param center - Center coordinates
 * @param radiusKm - Radius in kilometers
 * @returns Bounding box coordinates
 */
export function getBoundingBox(
  center: LocationCoordinates,
  radiusKm: number
): {
  north: number;
  south: number;
  east: number;
  west: number;
} {
  const latDelta = (radiusKm / 111) * 1.1; // 1 degree ≈ 111 km, add 10% buffer
  const lonDelta =
    (radiusKm / (111 * Math.cos((center.latitude * Math.PI) / 180))) * 1.1;

  return {
    north: center.latitude + latDelta,
    south: center.latitude - latDelta,
    east: center.longitude + lonDelta,
    west: center.longitude - lonDelta,
  };
}

/**
 * Validate coordinates
 * @param coordinates - Coordinates to validate
 * @returns True if coordinates are valid
 */
export function isValidCoordinates(coordinates: LocationCoordinates): boolean {
  return (
    typeof coordinates.latitude === 'number' &&
    typeof coordinates.longitude === 'number' &&
    coordinates.latitude >= -90 &&
    coordinates.latitude <= 90 &&
    coordinates.longitude >= -180 &&
    coordinates.longitude <= 180 &&
    !isNaN(coordinates.latitude) &&
    !isNaN(coordinates.longitude)
  );
}

/**
 * Convert coordinates to a string key for caching
 * @param coordinates - Coordinates to convert
 * @returns String key
 */
export function coordinatesToKey(coordinates: LocationCoordinates): string {
  return `${coordinates.latitude.toFixed(6)},${coordinates.longitude.toFixed(6)}`;
}

/**
 * Parse coordinates from a string key
 * @param key - String key to parse
 * @returns Coordinates or null if invalid
 */
export function keyToCoordinates(key: string): LocationCoordinates | null {
  try {
    const [lat, lon] = key.split(',').map(Number);
    const coordinates = { latitude: lat, longitude: lon };
    return isValidCoordinates(coordinates) ? coordinates : null;
  } catch {
    return null;
  }
}

/**
 * Get approximate address from coordinates (mock implementation)
 * @param coordinates - Coordinates to geocode
 * @returns Promise resolving to address string
 */
export async function reverseGeocode(
  coordinates: LocationCoordinates
): Promise<string> {
  // This is a mock implementation
  // In a real app, you would use a geocoding service like Google Maps API
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(
        `${coordinates.latitude.toFixed(4)}, ${coordinates.longitude.toFixed(4)}`
      );
    }, 100);
  });
}

/**
 * Calculate the center point of multiple coordinates
 * @param coordinates - Array of coordinates
 * @returns Center coordinates
 */
export function calculateCenter(
  coordinates: LocationCoordinates[]
): LocationCoordinates {
  if (coordinates.length === 0) {
    throw new Error('Cannot calculate center of empty coordinates array');
  }

  const sum = coordinates.reduce(
    (acc, coord) => ({
      latitude: acc.latitude + coord.latitude,
      longitude: acc.longitude + coord.longitude,
    }),
    { latitude: 0, longitude: 0 }
  );

  return {
    latitude: sum.latitude / coordinates.length,
    longitude: sum.longitude / coordinates.length,
  };
}
