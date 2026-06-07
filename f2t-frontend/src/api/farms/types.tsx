import type {
  ApiResponse,
  DeliveryZone,
  Farm,
  FarmLocation,
  OrderStatus,
  PaginationParams,
} from '@/types';

// Farm API Request Types
export type CreateFarmProfileRequest = {
  name: string;
  description: string;
  location: FarmLocation;
  contactEmail: string;
  contactPhone: string;
  deliveryMethods: ('pickup' | 'farm_delivery' | 'both')[];
  deliveryZones?: DeliveryZone[];
  businessHours?: BusinessHours;
  isActive?: boolean;
};

export type UpdateFarmRequest = Partial<CreateFarmProfileRequest> & {
  id: string;
};

export type GetFarmRequest = {
  id: string;
};

export type GetFarmsRequest = PaginationParams & {
  search?: string;
  isActive?: boolean;
  deliveryMethod?: 'pickup' | 'farm_delivery' | 'both';
  location?: {
    latitude: number;
    longitude: number;
    radius: number; // in kilometers
  };
  sortBy?: 'name' | 'createdAt' | 'distance';
  sortOrder?: 'asc' | 'desc';
};

export type DeleteFarmRequest = {
  id: string;
};

// Farm API Response Types
export type FarmResponse = ApiResponse<Farm>;
export type FarmsResponse = ApiResponse<{
  farms?: Farm[];
  items?: Farm[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}>;

export type CreateFarmProfileResponse = FarmResponse;
export type UpdateFarmResponse = FarmResponse;
export type GetFarmResponse = FarmResponse;
export type GetFarmsResponse = FarmsResponse;
export type DeleteFarmResponse = ApiResponse<{ success: boolean }>;

// Farm Business Hours Types
export type BusinessHours = {
  monday: { open: string; close: string; isOpen: boolean };
  tuesday: { open: string; close: string; isOpen: boolean };
  wednesday: { open: string; close: string; isOpen: boolean };
  thursday: { open: string; close: string; isOpen: boolean };
  friday: { open: string; close: string; isOpen: boolean };
  saturday: { open: string; close: string; isOpen: boolean };
  sunday: { open: string; close: string; isOpen: boolean };
};

export type UpdateBusinessHoursRequest = {
  farmId: string;
  businessHours: BusinessHours;
};

export type UpdateBusinessHoursResponse = ApiResponse<BusinessHours>;

// Farm Delivery Zone Types
export type UpdateDeliveryZonesRequest = {
  farmId: string;
  deliveryZones: DeliveryZone[];
};

export type UpdateDeliveryZonesResponse = ApiResponse<DeliveryZone[]>;

// Farm Analytics Types
export type FarmAnalyticsRequest = {
  farmId: string;
  startDate?: string;
  endDate?: string;
  period?: 'day' | 'week' | 'month' | 'year';
};

export type FarmAnalytics = {
  totalProducts: number;
  activeProducts: number;
  totalOrders: number;
  ordersByStatus: Record<OrderStatus, number>;
  totalRevenue: number;
  averageOrderValue: number;
  topProducts: {
    productId: string;
    productName: string;
    orderCount: number;
    revenue: number;
  }[];
  lowStockProducts: {
    productId: string;
    productName: string;
    availableQuantity: number;
  }[];
  revenueByMonth: {
    month: string;
    revenue: number;
  }[];
};

export type FarmAnalyticsResponse = ApiResponse<FarmAnalytics>;

// Farm Forecast Types
export type FarmForecastItem = {
  productId: string;
  demand7d: number;
  pWaste: number;
  computedAt?: string;
};

export type FarmForecastsRequest = {
  farmId: string;
};

export type FarmForecastsResponse = FarmForecastItem[];
