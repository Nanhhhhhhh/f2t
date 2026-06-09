import type {
  ApiResponse,
  Cart,
  DeliveryMethod,
  Farm,
  Order,
  OrderStatus,
  PaginationParams,
  PaymentMethod,
  Product,
  ProductCategory,
  SearchFilters,
  SearchResult,
  User,
  UserLocation,
  UserRole,
} from './index';

// Authentication API Types
export type RegisterRequest = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  role: UserRole;
  location?: UserLocation;
};

export type LoginRequest = {
  email: string;
  password: string;
};

export type AuthResponse = ApiResponse<{
  user: User;
  accessToken: string;
  refreshToken: string;
  farm?: Farm; // Optional farm data for farm users
}>;

export type RefreshTokenRequest = {
  refreshToken: string;
};

export type ForgotPasswordRequest = {
  email: string;
};

export type VerifyOtpRequest = {
  email: string;
  otp: string;
};

export type ResetPasswordRequest = {
  token: string;
  newPassword: string;
};

export type ChangePasswordRequest = {
  currentPassword: string;
  newPassword: string;
};

// Farm API Types
export type CreateFarmRequest = {
  name: string;
  description: string;
  location: UserLocation;
  contactEmail: string;
  contactPhone: string;
  deliveryMethods: DeliveryMethod[];
  deliveryRadius: number;
  deliveryFee: number;
  profileImageUrl?: string;
  bannerImageUrl?: string;
};

export type UpdateFarmRequest = Partial<CreateFarmRequest> & {
  isActive?: boolean;
};

export type GetFarmsRequest = PaginationParams & {
  location?: {
    latitude: number;
    longitude: number;
    radius?: number;
  };
  isActive?: boolean;
  searchQuery?: string;
};

export type FarmResponse = ApiResponse<Farm>;
export type FarmsResponse = ApiResponse<SearchResult<Farm>>;

// Product API Types
export type CreateProductRequest = {
  name: string;
  description: string;
  category: ProductCategory;
  pricePerUnit: number;
  unit: string;
  availableQuantity: number;
  minimumOrder: number;
  images: string[];
  harvestDate: string;
  deliveryDate: string;
  isOrganic: boolean;
  tags: string[];
  nutritionalInfo?: {
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
    fiber?: number;
    vitamins?: string[];
  };
  storageInstructions?: string;
};

export type UpdateProductRequest = Partial<CreateProductRequest> & {
  status?: 'available' | 'sold_out' | 'unavailable' | 'seasonal';
};

export type GetProductsRequest = PaginationParams & SearchFilters;

export type GetFarmProductsRequest = PaginationParams & {
  farmId: string;
  category?: ProductCategory;
  status?: string;
};

export type ProductResponse = ApiResponse<Product>;
export type ProductsResponse = ApiResponse<SearchResult<Product>>;

// Order API Types
export type CreateOrderRequest = {
  farmId: string;
  items: {
    productId: string;
    quantity: number;
    specialRequests?: string;
  }[];
  deliveryMethod: DeliveryMethod;
  deliveryAddress?: UserLocation;
  pickupTime?: string;
  deliveryTime?: string;
  paymentMethod: PaymentMethod;
  specialInstructions?: string;
};

export type UpdateOrderStatusRequest = {
  orderId: string;
  status: OrderStatus;
  message?: string;
};

export type GetOrdersRequest = PaginationParams & {
  status?: OrderStatus;
  farmId?: string;
  consumerId?: string;
  dateRange?: {
    startDate: string;
    endDate: string;
  };
};

export type OrderResponse = ApiResponse<Order>;
export type OrdersResponse = ApiResponse<SearchResult<Order>>;

// Cart API Types
export type AddToCartRequest = {
  productId: string;
  quantity: number;
  specialRequests?: string;
};

export type UpdateCartItemRequest = {
  cartItemId: string;
  quantity: number;
  specialRequests?: string;
};

export type RemoveFromCartRequest = {
  cartItemId: string;
};

export type CartResponse = ApiResponse<Cart>;

// Payment API Types
export type CreatePaymentIntentRequest = {
  orderId: string;
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod;
};

export type PaymentIntentResponse = ApiResponse<{
  clientSecret: string;
  paymentIntentId: string;
}>;

export type ConfirmPaymentRequest = {
  paymentIntentId: string;
  orderId: string;
};

export type RefundPaymentRequest = {
  paymentIntentId: string;
  orderId: string;
  amount?: number;
  reason?: string;
};

// File Upload API Types
export type UploadImageRequest = {
  file: File | Blob;
  type: 'profile' | 'banner' | 'product';
  entityId?: string;
};

export type UploadImageResponse = ApiResponse<{
  url: string;
  fileName: string;
  fileSize: number;
}>;

// Location API Types
export type GetNearbyFarmsRequest = {
  latitude: number;
  longitude: number;
  radius: number;
  limit?: number;
};

export type CalculateDistanceRequest = {
  origin: {
    latitude: number;
    longitude: number;
  };
  destinations: {
    farmId: string;
    latitude: number;
    longitude: number;
  }[];
};

export type DistanceResponse = ApiResponse<
  {
    farmId: string;
    distance: number;
    duration?: number;
  }[]
>;

// Search API Types
export type SearchRequest = PaginationParams & SearchFilters;

export type SearchSuggestionsRequest = {
  query: string;
  type: 'products' | 'farms' | 'all';
  limit?: number;
};

export type SearchSuggestionsResponse = ApiResponse<{
  products: { id: string; name: string; category: ProductCategory }[];
  farms: { id: string; name: string; location: string }[];
}>;

// Analytics API Types (for future use)
export type FarmAnalyticsRequest = {
  farmId: string;
  period: 'day' | 'week' | 'month' | 'year';
  startDate?: string;
  endDate?: string;
};

export type FarmAnalyticsResponse = ApiResponse<{
  totalOrders: number;
  totalRevenue: number;
  topProducts: {
    productId: string;
    productName: string;
    orderCount: number;
    revenue: number;
  }[];
  ordersByStatus: Record<OrderStatus, number>;
}>;

// Notification API Types
export type NotificationPreferencesRequest = {
  emailNotifications: boolean;
  smsNotifications: boolean;
  pushNotifications: boolean;
  orderUpdates: boolean;
  promotionalEmails: boolean;
};

export type NotificationPreferencesResponse =
  ApiResponse<NotificationPreferencesRequest>;

// Error Types
export type ApiError = {
  code: string;
  message: string;
  field?: string;
  details?: Record<string, unknown>;
};

export type ValidationError = {
  field: string;
  code: string;
  message: string;
  value?: unknown;
};

// Common response wrappers
export type SuccessResponse<T = null> = {
  success: true;
  data: T;
  message?: string;
};

export type ErrorResponse = {
  success: false;
  message: string;
  errors?: ApiError[];
  validationErrors?: ValidationError[];
};

// HTTP Status specific types
export type NotFoundResponse = ErrorResponse & {
  code: 'NOT_FOUND';
};

export type UnauthorizedResponse = ErrorResponse & {
  code: 'UNAUTHORIZED';
};

export type ForbiddenResponse = ErrorResponse & {
  code: 'FORBIDDEN';
};

export type ConflictResponse = ErrorResponse & {
  code: 'CONFLICT';
};

export type ValidationErrorResponse = ErrorResponse & {
  code: 'VALIDATION_ERROR';
  validationErrors: ValidationError[];
};
