// Export constants
export * from './constants';

// Core user types - using const values for consistency
export type UserRole = 'consumer' | 'farm' | 'admin';

export type UserStatus = 'active' | 'suspended' | 'pending';

export type User = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  phoneNumber: string;
  role: UserRole;
  status: UserStatus;
  location?: UserLocation;
  emailVerified: boolean;
  phoneVerified: boolean;
  createdAt: string;
  updatedAt: string;
};

// Enhanced Location and Address Types
export type Coordinates = {
  latitude: number;
  longitude: number;
  accuracy?: number; // GPS accuracy in meters
  timestamp?: string;
};

export type Address = {
  street: string;
  streetNumber?: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  district?: string; // For more detailed addressing
  ward?: string; // Additional administrative division
  formattedAddress?: string; // Full formatted address string
};

export type UserLocation = {
  coordinates: Coordinates;
  address: Address;
  isDefault?: boolean;
  label?: string; // e.g., "Home", "Work", "Farm"
  deliveryInstructions?: string;
};

export type LocationBounds = {
  northeast: Coordinates;
  southwest: Coordinates;
};

export type GeofenceArea = {
  center: Coordinates;
  radius: number; // in kilometers
  name?: string;
};

// Delivery specific location types
export type DeliveryAddress = Address & {
  recipientName: string;
  recipientPhone: string;
  isBusinessAddress?: boolean;
  accessInstructions?: string; // How to access the location
  landmarkNearby?: string;
  preferredDeliveryTime?: {
    startTime: string; // Format: "HH:mm"
    endTime: string; // Format: "HH:mm"
  };
  isAvailableWeekends?: boolean;
};

export type FarmLocation = {
  coordinates: Coordinates;
  address: Address;
  farmingArea: number; // in hectares
  soilType?: string;
  elevation?: number; // in meters
  climateZone?: string;
  waterSource?: string;
  organicCertified?: boolean;
  certificationDetails?: {
    certifyingBody: string;
    certificateNumber: string;
    validUntil: string;
  };
};

// Distance and route types
export type DistanceInfo = {
  distance: number; // in kilometers
  duration?: number; // in minutes
  unit: 'km' | 'miles';
};

export type RouteInfo = {
  distance: DistanceInfo;
  estimatedTime: number; // in minutes
  waypoints?: Coordinates[];
  transportation: 'driving' | 'walking' | 'cycling';
};

// Location search and discovery types
export type LocationSearchResult = {
  placeId: string;
  name: string;
  address: Address;
  coordinates: Coordinates;
  types: string[]; // e.g., ['establishment', 'food', 'point_of_interest']
  rating?: number;
  isVerified?: boolean;
};

export type NearbySearchParams = {
  center: Coordinates;
  radius: number; // in kilometers
  types?: string[];
  keyword?: string;
  minRating?: number;
};

// Location permissions and settings
export type LocationPermissionStatus =
  | 'granted'
  | 'denied'
  | 'restricted'
  | 'undetermined';

export type LocationSettings = {
  enableLocationServices: boolean;
  enableBackgroundLocation: boolean;
  locationAccuracy: 'high' | 'medium' | 'low';
  updateInterval: number; // in seconds
  maxLocationAge: number; // in seconds
};

// Location tracking for deliveries
export type DeliveryTrackingPoint = {
  coordinates: Coordinates;
  timestamp: string;
  status: 'picked_up' | 'in_transit' | 'arrived' | 'delivered';
  notes?: string;
  estimatedArrival?: string;
};

export type DeliveryRoute = {
  farmLocation: Coordinates;
  deliveryAddress: Coordinates;
  waypoints: DeliveryTrackingPoint[];
  totalDistance: number;
  estimatedDuration: number;
  actualDuration?: number;
  driverId?: string;
  vehicleInfo?: {
    type: string;
    licensePlate: string;
    capacity: number;
  };
};

// Geographic region types
export type ServiceArea = {
  id: string;
  name: string;
  boundaries: LocationBounds;
  isActive: boolean;
  deliveryFee: number;
  minimumOrder?: number;
  maxDeliveryTime: number; // in hours
};

export type DeliveryZone = {
  id: string;
  farmId: string;
  name: string;
  area: GeofenceArea;
  deliveryFee: number;
  estimatedDeliveryTime: number; // in hours
  isActive: boolean;
  workingDays: number[]; // 0-6 (Sunday-Saturday)
  workingHours: {
    start: string; // Format: "HH:mm"
    end: string; // Format: "HH:mm"
  };
};

// Farm types
export type DeliveryMethod = 'pickup' | 'farm_delivery' | 'both';

export type Farm = {
  id: string;
  ownerId: string;
  name: string;
  description: string;
  location: FarmLocation;
  contactEmail: string;
  contactPhone: string;
  deliveryMethods: DeliveryMethod[];
  deliveryZones: DeliveryZone[];
  businessHours: BusinessHours;
  isActive: boolean;
  verificationStatus: 'verified' | 'rejected' | 'pending';
  profileImageUrl?: string;
  bannerImageUrl?: string;
  createdAt: string;
  updatedAt: string;
};

export type BusinessHours = {
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  sunday: DaySchedule;
};

export type DaySchedule = {
  isOpen: boolean;
  openTime: string; // Format: "HH:mm"
  closeTime: string; // Format: "HH:mm"
};

// Product types
export type ProductCategory =
  | 'vegetables'
  | 'fruits'
  | 'herbs'
  | 'mushrooms'
  | 'grains'
  | 'dairy'
  | 'eggs'
  | 'honey'
  | 'other';

export type ProductUnit =
  | 'kg'
  | 'g'
  | 'piece'
  | 'bunch'
  | 'box'
  | 'bag'
  | 'liter';

export type ProductStatus =
  | 'available'
  | 'sold_out'
  | 'unavailable'
  | 'seasonal';

export type Product = {
  id: string;
  farmId: string;
  name: string;
  description: string;
  category: ProductCategory;
  subcategory?: string; // More specific categorization
  pricePerUnit: number;
  unit: ProductUnit;
  availableQuantity: number;
  minimumOrder: number;
  status: ProductStatus;
  popularity?: number;
  images: string[];
  harvestDate: string;
  deliveryDate: string;
  estimatedShelfLife: number; // in days
  isOrganic: boolean;
  farmingMethods: string[]; // e.g., ['organic', 'hydroponic']
  qualityGrade?: string; // premium, standard, seconds, bulk
  freshnessLevel?: string; // same_day, next_day, within_week, stored
  seasonalAvailability: string[]; // spring, summer, fall, winter, year_round
  storageRequirements?: string; // refrigerated, frozen, room_temperature, etc.
  packagingType?: string; // loose, bagged, boxed, etc.
  tags: string[];
  nutritionalInfo?: NutritionalInfo;
  storageInstructions?: string;
  allergenInfo?: string[];
  certifications?: ProductCertification[];
  createdAt: string;
  updatedAt: string;
};

export type ProductCertification = {
  type: string; // organic, fair_trade, non_gmo, etc.
  certifyingBody: string;
  certificateNumber?: string;
  validUntil?: string;
  verificationUrl?: string;
};

export type NutritionalInfo = {
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
  vitamins?: string[];
};

// Order types
export type OrderStatus =
  | 'pending' // Order placed, waiting for confirmation
  | 'confirmed' // Order confirmed by farm
  | 'preparing' // Order being prepared
  | 'shipped' // Order in shipping process
  | 'ready_for_pickup' // Order ready for pickup
  | 'delivered' // Order delivered
  | 'cancelled'; // Order cancelled

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

export type PaymentMethod = 'cash' | 'stripe';

export type Order = {
  id: string;
  consumerId: string;
  farmId: string;
  items: OrderItem[];
  status: OrderStatus;
  totalAmount: number;
  subtotalAmount: number;
  deliveryFee: number;
  deliveryMethod: DeliveryMethod;
  deliveryAddress?: DeliveryAddress;
  pickupTime?: string;
  deliveryTime?: string;
  paymentStatus: PaymentStatus | undefined;
  paymentMethod: PaymentMethod;
  paymentIntentId?: string;
  specialInstructions?: string;
  estimatedDelivery: string;
  trackingSteps: OrderTrackingStep[];
  deliveryRoute?: DeliveryRoute;
  createdAt: string;
  updatedAt: string;
};

export type OrderItem = {
  id: string;
  productId: string;
  quantity: number;
  pricePerUnit: number;
  totalPrice: number;
  specialRequests?: string;
};

export type OrderTrackingStep = {
  id: string;
  status: OrderStatus;
  timestamp: string;
  message: string;
  updatedBy: string; // userId who updated the status
};

// Cart types
export type CartItem = {
  id: string;
  productId: string;
  farmId: string;
  quantity: number;
  pricePerUnit: number;
  specialRequests?: string;
  addedAt: string;
};

export type Cart = {
  items: CartItem[];
  totalItems: number;
  subtotal: number;
  lastUpdated: string;
};

// Search and filter types
export type SearchFilters = {
  query?: string;
  category?: ProductCategory;
  priceRange?: {
    min: number;
    max: number;
  };
  deliveryTimeframe?: {
    startDate: string;
    endDate: string;
  };
  location?: {
    latitude: number;
    longitude: number;
    radius: number; // in kilometers
  };
  isOrganic?: boolean;
  availableOnly?: boolean;
  sortBy?:
    | 'price_asc'
    | 'price_desc'
    | 'distance'
    | 'harvest_date'
    | 'created_at';
};

export type SearchResult<T> = {
  items: T[];
  totalCount: number;
  hasMore: boolean;
  nextCursor?: string;
};

// Common utility types
export type ApiResponse<T> = {
  success: boolean;
  data: T;
  message?: string;
  errors?: Record<string, string[]>;
};

export type PaginationParams = {
  page?: number;
  limit?: number;
  cursor?: string;
};

export type LocationDistance = {
  farmId: string;
  distance: number; // in kilometers
};
