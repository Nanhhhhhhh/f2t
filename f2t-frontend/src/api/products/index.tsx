import type { Product } from '@/types';

// Product API Types
export type {
  CreateProductRequest,
  CreateProductResponse,
  DeleteProductRequest,
  DeleteProductResponse,
  GetProductRequest,
  GetProductResponse,
  GetProductsRequest,
  GetProductsResponse,
  ProductCategory,
  ProductSearchFilters,
  ProductUnit,
  UpdateProductRequest,
  UpdateProductResponse,
  UpdateStockRequest,
  UpdateStockResponse,
} from './types';
export type { Product };
export { PRODUCT_CATEGORIES, PRODUCT_UNITS } from './types';

// Product CRUD Operations
export { useCreateProduct } from './use-create-product';
export { useDeleteProduct } from './use-delete-product';
export { useGetProduct } from './use-get-product';
export { useGetProducts, useGetProductsInfinite } from './use-get-products';
export { useUpdateProduct } from './use-update-product';
export { useUpdateStock } from './use-update-stock';

// Mock Data (for development and testing)
export {
  FEATURED_PRODUCT_IDS,
  getFeaturedProducts,
  getMockProduct,
  getMockProducts,
  MOCK_PRODUCTS,
} from './mock-products';

// Utility Functions
export const formatPrice = (price: number, currency = 'VND'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(price);
};

export const formatUnit = (unit: string): string => {
  const unitLabels: Record<string, string> = {
    lb: 'pound',
    kg: 'kilogram',
    g: 'gram',
    oz: 'ounce',
    bunch: 'bunch',
    each: 'each',
    dozen: 'dozen',
    pint: 'pint',
    quart: 'quart',
    gallon: 'gallon',
    liter: 'liter',
    bag: 'bag',
    box: 'box',
  };

  return unitLabels[unit] || unit;
};

export const formatPricePerUnit = (price: number, unit: string): string => {
  return `${formatPrice(price)} per ${formatUnit(unit)}`;
};

export const getCategoryLabel = (category: string): string => {
  const categoryLabels: Record<string, string> = {
    leafy: 'Rau lá',
    root: 'Rau củ',
    fruit: 'Trái cây',
    herbs: 'Rau thơm & Thảo mộc',
    mushrooms: 'Nấm',
    grains: 'Ngũ cốc & Hạt',
    dairy: 'Sữa & Sản phẩm từ sữa',
    eggs: 'Trứng sạch',
    honey: 'Mật ong & Sản phẩm ong',
    other: 'Khác',
  };

  return categoryLabels[category] || category;
};

export const isProductInSeason = (product: {
  seasonalAvailability?: {
    startMonth: number;
    endMonth: number;
  };
}): boolean => {
  if (!product.seasonalAvailability) return true;

  const currentMonth = new Date().getMonth() + 1; // 1-12
  const { startMonth, endMonth } = product.seasonalAvailability;

  if (startMonth <= endMonth) {
    // Same year season (e.g., March to August)
    return currentMonth >= startMonth && currentMonth <= endMonth;
  } else {
    // Cross-year season (e.g., November to February)
    return currentMonth >= startMonth || currentMonth <= endMonth;
  }
};

// AI freshness label derived from the freshnessScore that DynamicPricingInterceptor
// injects into product responses. Thresholds mirror the backend computeFreshnessTag:
// score >= 0.8 → fresh, >= 0.4 → aging, otherwise critical.
export type FreshnessLabel = {
  tag: 'fresh' | 'aging' | 'critical';
  label: string;
  color: 'green' | 'yellow' | 'red';
  display: string;
};

export const getFreshnessLabel = (
  score?: number | null
): FreshnessLabel | null => {
  if (score === null || score === undefined) return null;

  const config =
    score >= 0.8
      ? { tag: 'fresh' as const, label: 'Tươi', color: 'green' as const }
      : score >= 0.4
        ? { tag: 'aging' as const, label: 'Hơi cũ', color: 'yellow' as const }
        : {
            tag: 'critical' as const,
            label: 'Sắp hỏng',
            color: 'red' as const,
          };

  return {
    ...config,
    display: `${config.label} · ${Math.round(score * 100)}%`,
  };
};

export const isProductFresh = (harvestDate?: string): boolean => {
  if (!harvestDate) return false;

  const harvest = new Date(harvestDate);
  const now = new Date();
  const daysDiff = Math.floor(
    (now.getTime() - harvest.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Consider fresh if harvested within 7 days
  return daysDiff <= 7;
};

export const isProductExpired = (expiryDate?: string): boolean => {
  if (!expiryDate) return false;

  const expiry = new Date(expiryDate);
  const now = new Date();

  return now > expiry;
};

export const getProductAvailabilityStatus = (product: {
  stockQuantity: number;
  isActive: boolean;
  expiryDate?: string;
}): 'available' | 'low_stock' | 'out_of_stock' | 'expired' | 'inactive' => {
  if (!product.isActive) return 'inactive';
  if (isProductExpired(product.expiryDate)) return 'expired';
  if (product.stockQuantity === 0) return 'out_of_stock';
  if (product.stockQuantity <= 5) return 'low_stock'; // Configurable threshold
  return 'available';
};

export const formatHarvestTime = (harvestDate?: string): string => {
  if (!harvestDate) return 'Harvest date not specified';

  const harvest = new Date(harvestDate);
  const now = new Date();
  const daysDiff = Math.floor(
    (now.getTime() - harvest.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysDiff === 0) return 'Harvested today';
  if (daysDiff === 1) return 'Harvested yesterday';
  if (daysDiff <= 7) return `Harvested ${daysDiff} days ago`;

  return harvest.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: harvest.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
};

export const getSeasonalAvailabilityText = (seasonalAvailability?: {
  startMonth: number;
  endMonth: number;
}): string => {
  if (!seasonalAvailability) return 'Available year-round';

  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];

  const { startMonth, endMonth } = seasonalAvailability;
  const startMonthName = months[startMonth - 1];
  const endMonthName = months[endMonth - 1];

  if (startMonth === endMonth) {
    return `Available in ${startMonthName}`;
  }

  return `Available ${startMonthName} - ${endMonthName}`;
};

type SearchableProduct = {
  name: string;
  description: string;
  category: string;
  farm?: { name?: string };
};

export const searchProducts = <T extends SearchableProduct>(
  products: T[],
  searchTerm: string
): T[] => {
  if (!searchTerm.trim()) return products;

  const term = searchTerm.toLowerCase();

  return products.filter(
    (product) =>
      product.name.toLowerCase().includes(term) ||
      product.description.toLowerCase().includes(term) ||
      product.category.toLowerCase().includes(term) ||
      (product.farm?.name || '').toLowerCase().includes(term)
  );
};

type FilterableProduct = {
  category?: string;
  price?: number;
  pricePerUnit?: number;
  organicCertified?: boolean;
  isOrganic?: boolean;
  stockQuantity?: number;
  availableQuantity?: number;
  status?: string;
  seasonalAvailability?: { startMonth: number; endMonth: number };
};

export const filterProducts = <T extends FilterableProduct>(
  products: T[],
  filters: Partial<{
    category?: string;
    priceRange?: { min: number; max: number };
    organicOnly?: boolean;
    inSeason?: boolean;
    inStock?: boolean;
  }>
): T[] => {
  return products.filter((product) => {
    if (
      filters.category &&
      filters.category !== 'all' &&
      product.category !== filters.category
    ) {
      return false;
    }

    if (filters.priceRange) {
      const { min, max } = filters.priceRange;
      const productPrice = product.price ?? product.pricePerUnit ?? 0;
      if (productPrice < min || productPrice > max) {
        return false;
      }
    }

    if (
      filters.organicOnly &&
      !(product.organicCertified ?? product.isOrganic)
    ) {
      return false;
    }

    if (filters.inSeason && !isProductInSeason(product)) {
      return false;
    }

    if (filters.inStock) {
      const qty = product.stockQuantity ?? product.availableQuantity ?? 0;
      if (qty === 0) return false;
      if (product.status !== undefined && product.status !== 'available')
        return false;
    }

    return true;
  });
};

type SortableProduct = {
  name?: string;
  price?: number;
  pricePerUnit?: number;
  harvestDate?: string;
  createdAt?: string;
  popularity?: number;
};

export const sortProducts = <T extends SortableProduct>(
  products: T[],
  sortBy: string,
  sortOrder: 'asc' | 'desc' = 'asc'
): T[] => {
  const sorted = [...products].sort((a, b) => {
    let aValue: string | number | Date;
    let bValue: string | number | Date;

    switch (sortBy) {
      case 'name':
        aValue = (a.name || '').toLowerCase();
        bValue = (b.name || '').toLowerCase();
        break;
      case 'price':
        aValue = a.price ?? a.pricePerUnit ?? 0;
        bValue = b.price ?? b.pricePerUnit ?? 0;
        break;
      case 'harvestDate':
        aValue = new Date(a.harvestDate || 0);
        bValue = new Date(b.harvestDate || 0);
        break;
      case 'createdAt':
        aValue = new Date(a.createdAt || 0);
        bValue = new Date(b.createdAt || 0);
        break;
      case 'popularity':
        aValue = a.popularity || 0;
        bValue = b.popularity || 0;
        break;
      default:
        return 0;
    }

    if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  return sorted;
};
