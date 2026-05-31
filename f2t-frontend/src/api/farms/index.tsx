import type { BusinessHours, Farm } from '@/types';

// Farm API Types
export type {
  BusinessHours,
  CreateFarmProfileRequest,
  CreateFarmProfileResponse,
  DeleteFarmRequest,
  DeleteFarmResponse,
  FarmAnalytics,
  FarmAnalyticsRequest,
  FarmAnalyticsResponse,
  FarmResponse,
  FarmsResponse,
  GetFarmRequest,
  GetFarmResponse,
  GetFarmsRequest,
  GetFarmsResponse,
  UpdateBusinessHoursRequest,
  UpdateBusinessHoursResponse,
  UpdateDeliveryZonesRequest,
  UpdateDeliveryZonesResponse,
  UpdateFarmRequest,
  UpdateFarmResponse,
} from './types';
export type { Farm };

// Farm CRUD Operations
export { useCreateFarm } from './use-create-farm';
export { useDeleteFarm } from './use-delete-farm';
export { useGetFarm } from './use-get-farm';
export { useGetFarms, useGetFarmsList } from './use-get-farms';
export { useUpdateFarm } from './use-update-farm';

// Mock Data (for development and testing)
export { getMockFarm, getMockFarms, MOCK_FARMS } from './mock-farms';

// Farm Management Operations
export { useFarmAnalytics } from './use-farm-analytics';
export { useUpdateBusinessHours } from './use-update-business-hours';
export { useUpdateDeliveryZones } from './use-update-delivery-zones';

// Helper Functions and Utilities

/**
 * Helper function to format business hours for display
 */
export const formatBusinessHours = (businessHours: BusinessHours): string => {
  const days = [
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
    'sunday',
  ];
  const openDays = days.filter(
    (day) => businessHours[day as keyof BusinessHours]?.isOpen
  );

  if (openDays.length === 0) return 'Closed';
  if (openDays.length === 7) return 'Open Daily';

  // Group consecutive days
  const ranges: string[] = [];
  let start = 0;

  while (start < openDays.length) {
    let end = start;
    while (
      end + 1 < openDays.length &&
      days.indexOf(openDays[end + 1]) === days.indexOf(openDays[end]) + 1
    ) {
      end++;
    }

    if (start === end) {
      ranges.push(capitalizeDay(openDays[start]));
    } else {
      ranges.push(
        `${capitalizeDay(openDays[start])}-${capitalizeDay(openDays[end])}`
      );
    }

    start = end + 1;
  }

  return ranges.join(', ');
};

/**
 * Helper function to check if farm is currently open
 */
export const isFarmOpen = (businessHours: BusinessHours): boolean => {
  const now = new Date();
  const currentDay = [
    'sunday',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
  ][now.getDay()];
  const currentTime = now.toTimeString().slice(0, 5); // HH:MM format

  const todayHours = businessHours[currentDay as keyof BusinessHours];

  if (!todayHours?.isOpen) return false;

  return (
    currentTime >= todayHours.openTime && currentTime <= todayHours.closeTime
  );
};

/**
 * Helper function to calculate distance between two coordinates
 */
export const calculateDistance = (
  coords1: { lat: number; lon: number },
  coords2: { lat: number; lon: number }
): number => {
  const { lat: lat1, lon: lon1 } = coords1;
  const { lat: lat2, lon: lon2 } = coords2;
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // Distance in kilometers

  return Math.round(distance * 100) / 100; // Round to 2 decimal places
};

/**
 * Helper function to format farm address for display
 */
export const formatFarmAddress = (farm: Farm): string => {
  const address = farm.location?.address;

  if (!address) return 'Address not available';

  const parts = [
    address.street,
    address.city,
    address.zipCode,
  ].filter(Boolean);

  return parts.join(', ');
};

/**
 * Helper function to get farm delivery methods display text
 */
export const getDeliveryMethodsText = (
  deliveryMethods: ('pickup' | 'farm_delivery' | 'both')[]
): string => {
  if (!deliveryMethods?.length) return 'No delivery options';

  const methods = deliveryMethods.map((method) => {
    switch (method) {
      case 'pickup':
        return 'Farm Pickup';
      case 'farm_delivery':
        return 'Farm Delivery';
      case 'both':
        return 'Pickup & Delivery';
      default:
        return method;
    }
  });

  return methods.join(', ');
};

// Private helper functions
function capitalizeDay(day: string): string {
  return day.charAt(0).toUpperCase() + day.slice(1, 3);
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}
