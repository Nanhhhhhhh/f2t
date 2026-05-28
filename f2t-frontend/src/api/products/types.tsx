import type { ApiResponse, Product } from '@/types';

// Product API Request Types
export type CreateProductRequest = {
  farmId: string;
  name: string;
  description: string;
  category: string;
  price: number;
  unit: string; // e.g., 'lb', 'kg', 'bunch', 'each'
  stockQuantity: number;
  images?: string[];
  harvestDate?: string;
  expiryDate?: string;
  organicCertified: boolean;
  seasonalAvailability?: {
    startMonth: number; // 1-12
    endMonth: number; // 1-12
  };
  nutritionInfo?: {
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
    fiber?: number;
    vitamins?: string[];
  };
  storageInstructions?: string;
  preparationTips?: string;
  isActive: boolean;
};

export type UpdateProductRequest = {
  id: string;
  name?: string;
  description?: string;
  category?: string;
  price?: number;
  unit?: string;
  stockQuantity?: number;
  images?: string[];
  harvestDate?: string;
  expiryDate?: string;
  organicCertified?: boolean;
  seasonalAvailability?: {
    startMonth: number;
    endMonth: number;
  };
  nutritionInfo?: {
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
    fiber?: number;
    vitamins?: string[];
  };
  storageInstructions?: string;
  preparationTips?: string;
  isActive?: boolean;
};

export type GetProductRequest = {
  id: string;
};

export type GetProductsRequest = {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  farmId?: string;
  minPrice?: number;
  maxPrice?: number;
  organicOnly?: boolean;
  inSeason?: boolean;
  inStock?: boolean;
  sortBy?: 'name' | 'price' | 'harvestDate' | 'createdAt' | 'popularity';
  sortOrder?: 'asc' | 'desc';
  location?: {
    latitude: number;
    longitude: number;
    radius: number; // in kilometers
  };
};

export type DeleteProductRequest = {
  id: string;
};

export type UpdateStockRequest = {
  id: string;
  stockQuantity: number;
  operation?: 'set' | 'add' | 'subtract';
};

// Product API Response Types
export type ProductResponse = ApiResponse<Product>;
export type ProductsResponse = ApiResponse<{
  products?: Product[];
  items?: Product[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}>;

export type CreateProductResponse = ProductResponse;
export type UpdateProductResponse = ProductResponse;
export type GetProductResponse = ProductResponse;
export type GetProductsResponse = ProductsResponse;
export type DeleteProductResponse = ApiResponse<{ success: boolean }>;
export type UpdateStockResponse = ProductResponse;

// Product Search and Filter Types
export type ProductSearchFilters = {
  search: string;
  category: 'all' | string;
  priceRange: {
    min: number;
    max: number;
  };
  organicOnly: boolean;
  inSeason: boolean;
  inStock: boolean;
  sortBy: 'name' | 'price' | 'harvestDate' | 'createdAt' | 'popularity';
  sortOrder: 'asc' | 'desc';
};

// Product Categories (can be extended)
export const PRODUCT_CATEGORIES = {
  VEGETABLES: 'vegetables',
  FRUITS: 'fruits',
  HERBS: 'herbs',
  MUSHROOMS: 'mushrooms',
  GRAINS: 'grains',
  DAIRY: 'dairy',
  EGGS: 'eggs',
  HONEY: 'honey',
  OTHER: 'other',
} as const;

export type ProductCategory =
  (typeof PRODUCT_CATEGORIES)[keyof typeof PRODUCT_CATEGORIES];

// Product Units
export const PRODUCT_UNITS = {
  POUND: 'lb',
  KILOGRAM: 'kg',
  GRAM: 'g',
  OUNCE: 'oz',
  BUNCH: 'bunch',
  EACH: 'each',
  DOZEN: 'dozen',
  PINT: 'pint',
  QUART: 'quart',
  GALLON: 'gallon',
  LITER: 'liter',
  BAG: 'bag',
  BOX: 'box',
} as const;

export type ProductUnit = (typeof PRODUCT_UNITS)[keyof typeof PRODUCT_UNITS];

// Re-export Product type from main types
// export type { Product } from '@/types'; // Already imported above
