// Location service exports
export type {
  LocationCoordinates,
  LocationPermission,
  LocationState,
} from '../hooks/use-location';
export { useLocation } from '../hooks/use-location';

// Location utilities
export {
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
