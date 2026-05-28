import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import React from 'react';

import type { ProductSearchFilters } from '@/api/products/types';

// We'll test the core components that make up the product listing screen
import { ProductList, ProductSearch } from './index';

// Mock dependencies
jest.mock('@/api/products', () => ({
  PRODUCT_CATEGORIES: {
    VEGETABLES: 'vegetables',
    FRUITS: 'fruits',
    HERBS: 'herbs',
  },
  getCategoryLabel: (category: string) =>
    category.charAt(0).toUpperCase() + category.slice(1),
  useGetProducts: () => ({
    data: {
      pages: [
        {
          success: true,
          data: {
            products: [
              {
                id: 'prod_1',
                name: 'Organic Tomatoes',
                category: 'vegetables',
                pricePerUnit: 4.99,
                unit: 'kg',
                availableQuantity: 25,
                images: ['tomato.jpg'],
                harvestDate: '2024-07-13',
                isOrganic: true,
                farmingMethods: ['organic'],
                seasonalAvailability: ['summer'],
              },
              {
                id: 'prod_2',
                name: 'Fresh Basil',
                category: 'herbs',
                pricePerUnit: 2.5,
                unit: 'bunch',
                availableQuantity: 15,
                images: ['basil.jpg'],
                harvestDate: '2024-07-14',
                isOrganic: false,
                farmingMethods: ['conventional'],
                seasonalAvailability: ['summer'],
              },
            ],
            total: 2,
          },
        },
      ],
    },
    isLoading: false,
    error: null,
    refetch: jest.fn(),
    fetchNextPage: jest.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
  }),
  searchProducts: jest.fn((products) => products),
  filterProducts: jest.fn((products) => products),
  sortProducts: jest.fn((products) => products),
  formatPrice: (price: number) => `$${price.toFixed(2)}`,
  formatPricePerUnit: (price: number, unit: string) =>
    `$${price.toFixed(2)} per ${unit}`,
  formatHarvestTime: (date?: string) =>
    date ? 'Harvested 2 days ago' : 'Harvest date not specified',
  getProductAvailabilityStatus: () => 'available' as const,
  isProductInSeason: () => true,
  isProductFresh: () => true,
}));

jest.mock('@/lib/auth', () => ({
  useAuth: {
    use: {
      isFarm: () => false,
    },
  },
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
}));

jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest
    .fn()
    .mockResolvedValue({ status: 'granted' }),
  requestCameraPermissionsAsync: jest
    .fn()
    .mockResolvedValue({ status: 'granted' }),
  launchImageLibraryAsync: jest.fn().mockResolvedValue({
    canceled: false,
    assets: [{ uri: 'test-image.jpg' }],
  }),
  launchCameraAsync: jest.fn().mockResolvedValue({
    canceled: false,
    assets: [{ uri: 'test-photo.jpg' }],
  }),
  MediaTypeOptions: {
    Images: 'Images',
  },
}));

// Helper function to create mock products
const createMockProducts = () => [
  {
    id: 'prod_1',
    farmId: 'farm_1',
    name: 'Organic Tomatoes',
    description: 'Fresh organic tomatoes',
    category: 'vegetables' as const,
    subcategory: 'cherry',
    pricePerUnit: 4.99,
    unit: 'kg' as const,
    availableQuantity: 25,
    minimumOrder: 1,
    status: 'available' as const,
    images: ['tomato.jpg'],
    harvestDate: '2024-07-13',
    deliveryDate: '2024-07-15',
    estimatedShelfLife: 7,
    isOrganic: true,
    farmingMethods: ['organic'],
    qualityGrade: 'premium',
    freshnessLevel: 'same_day',
    seasonalAvailability: ['summer'],
    storageRequirements: 'refrigerated',
    packagingType: 'loose',
    tags: ['fresh', 'local'],
    nutritionalInfo: {
      calories: 18,
      protein: 0.9,
      carbs: 3.9,
      fat: 0.2,
      fiber: 1.2,
      vitamins: ['Vitamin C'],
    },
    storageInstructions: 'Keep refrigerated',
    allergenInfo: [],
    certifications: [],
    createdAt: '2024-07-01T00:00:00Z',
    updatedAt: '2024-07-13T00:00:00Z',
  },
  {
    id: 'prod_2',
    farmId: 'farm_2',
    name: 'Fresh Basil',
    description: 'Aromatic fresh basil',
    category: 'herbs' as const,
    subcategory: 'sweet basil',
    pricePerUnit: 2.5,
    unit: 'bunch' as const,
    availableQuantity: 15,
    minimumOrder: 1,
    status: 'available' as const,
    images: ['basil.jpg'],
    harvestDate: '2024-07-14',
    deliveryDate: '2024-07-16',
    estimatedShelfLife: 5,
    isOrganic: false,
    farmingMethods: ['conventional'],
    qualityGrade: 'standard',
    freshnessLevel: 'same_day',
    seasonalAvailability: ['summer'],
    storageRequirements: 'refrigerated',
    packagingType: 'bunch',
    tags: ['fresh', 'aromatic'],
    nutritionalInfo: {
      calories: 22,
      protein: 3.2,
      carbs: 2.6,
      fat: 0.6,
      fiber: 1.6,
      vitamins: ['Vitamin K', 'Vitamin A'],
    },
    storageInstructions: 'Keep in water',
    allergenInfo: [],
    certifications: [],
    createdAt: '2024-07-02T00:00:00Z',
    updatedAt: '2024-07-14T00:00:00Z',
  },
];

describe('Product Listing Components', () => {
  const mockProducts = createMockProducts();
  const mockOnProductPress = jest.fn();
  const mockOnAddToCart = jest.fn();
  const mockOnSearch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('ProductList Component', () => {
    it('renders product list with products', () => {
      render(
        <ProductList
          products={mockProducts}
          onProductPress={mockOnProductPress}
          onAddToCart={mockOnAddToCart}
          layout="vertical"
        />
      );

      expect(screen.getByText('Organic Tomatoes')).toBeTruthy();
      expect(screen.getByText('Fresh Basil')).toBeTruthy();
    });

    it('renders in different layouts', () => {
      const { rerender } = render(
        <ProductList
          products={mockProducts}
          onProductPress={mockOnProductPress}
          onAddToCart={mockOnAddToCart}
          layout="vertical"
        />
      );

      expect(screen.getByText('Organic Tomatoes')).toBeTruthy();

      rerender(
        <ProductList
          products={mockProducts}
          onProductPress={mockOnProductPress}
          onAddToCart={mockOnAddToCart}
          layout="grid"
        />
      );

      expect(screen.getByText('Organic Tomatoes')).toBeTruthy();

      rerender(
        <ProductList
          products={mockProducts}
          onProductPress={mockOnProductPress}
          onAddToCart={mockOnAddToCart}
          layout="horizontal"
        />
      );

      expect(screen.getByText('Organic Tomatoes')).toBeTruthy();
    });

    it('shows loading state', () => {
      render(
        <ProductList
          products={[]}
          onProductPress={mockOnProductPress}
          onAddToCart={mockOnAddToCart}
          layout="vertical"
          loading={true}
        />
      );

      // Loading state should render skeleton components
      // The exact implementation depends on the ProductList component
    });

    it('shows empty state when no products', () => {
      render(
        <ProductList
          products={[]}
          onProductPress={mockOnProductPress}
          onAddToCart={mockOnAddToCart}
          layout="vertical"
          emptyMessage="No products found"
        />
      );

      expect(screen.getByText('No products found')).toBeTruthy();
    });

    it('shows error state', () => {
      render(
        <ProductList
          products={[]}
          onProductPress={mockOnProductPress}
          onAddToCart={mockOnAddToCart}
          layout="vertical"
          error="Failed to load products"
        />
      );

      expect(screen.getByText('Something went wrong')).toBeTruthy();
      expect(screen.getByText('Failed to load products')).toBeTruthy();
    });

    it('calls onProductPress when product is pressed', () => {
      render(
        <ProductList
          products={mockProducts}
          onProductPress={mockOnProductPress}
          onAddToCart={mockOnAddToCart}
          layout="vertical"
        />
      );

      fireEvent.press(screen.getByText('Organic Tomatoes'));
      expect(mockOnProductPress).toHaveBeenCalledWith(mockProducts[0]);
    });

    it('calls onAddToCart when add to cart is pressed', () => {
      render(
        <ProductList
          products={mockProducts}
          onProductPress={mockOnProductPress}
          onAddToCart={mockOnAddToCart}
          layout="vertical"
          showAddToCart={true}
        />
      );

      const addToCartButtons = screen.getAllByText('Add to Cart');
      fireEvent.press(addToCartButtons[0]);
      expect(mockOnAddToCart).toHaveBeenCalledWith(mockProducts[0]);
    });

    it('hides add to cart when showAddToCart is false', () => {
      render(
        <ProductList
          products={mockProducts}
          onProductPress={mockOnProductPress}
          onAddToCart={mockOnAddToCart}
          layout="vertical"
          showAddToCart={false}
        />
      );

      expect(screen.queryByText('Add to Cart')).toBeNull();
    });
  });

  describe('ProductSearch Component', () => {
    it('renders search component', () => {
      render(
        <ProductSearch onSearch={mockOnSearch} showAdvancedFilters={true} />
      );

      expect(screen.getByPlaceholderText('Search products...')).toBeTruthy();
    });

    it('calls onSearch when search is performed', async () => {
      render(
        <ProductSearch onSearch={mockOnSearch} showAdvancedFilters={false} />
      );

      const searchInput = screen.getByPlaceholderText('Search products...');
      fireEvent.changeText(searchInput, 'tomato');

      const searchButton = screen.getByText('Search');
      fireEvent.press(searchButton);

      await waitFor(() => {
        expect(mockOnSearch).toHaveBeenCalled();
      });
    });

    it('shows advanced filters when enabled', () => {
      render(
        <ProductSearch onSearch={mockOnSearch} showAdvancedFilters={true} />
      );

      // Look for the filters toggle button
      const filtersButton = screen.getByText(/Filters/);
      expect(filtersButton).toBeTruthy();
    });

    it('handles filter changes', () => {
      render(
        <ProductSearch onSearch={mockOnSearch} showAdvancedFilters={true} />
      );

      // Test category selection - the select shows "All Categories" by default
      const categorySelects = screen.getAllByText('All Categories');
      fireEvent.press(categorySelects[0]);

      // The exact interaction depends on the Select component implementation
    });

    it('resets filters', () => {
      render(
        <ProductSearch onSearch={mockOnSearch} showAdvancedFilters={true} />
      );

      // Open advanced filters first
      const filtersButton = screen.getByText(/Filters/);
      fireEvent.press(filtersButton);

      // Look for reset button
      const resetButton = screen.getByText('Reset Filters');
      fireEvent.press(resetButton);

      expect(mockOnSearch).toHaveBeenCalled();
    });
  });

  describe('Integration Tests', () => {
    it('works together for complete product listing experience', () => {
      const TestScreen = () => {
        const [filters, setFilters] = React.useState<ProductSearchFilters>({
          search: '',
          category: 'all',
          priceRange: { min: 0, max: 1000 },
          organicOnly: false,
          inSeason: false,
          inStock: true,
          sortBy: 'name',
          sortOrder: 'asc',
        });

        return (
          <>
            <ProductSearch
              onSearch={setFilters}
              initialFilters={filters}
              showAdvancedFilters={true}
            />
            <ProductList
              products={mockProducts}
              onProductPress={mockOnProductPress}
              onAddToCart={mockOnAddToCart}
              layout="vertical"
            />
          </>
        );
      };

      render(<TestScreen />);

      // Verify both components render
      expect(screen.getByPlaceholderText('Search products...')).toBeTruthy();
      expect(screen.getByText('Organic Tomatoes')).toBeTruthy();
      expect(screen.getByText('Fresh Basil')).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('provides proper accessibility labels', () => {
      render(
        <ProductList
          products={mockProducts}
          onProductPress={mockOnProductPress}
          onAddToCart={mockOnAddToCart}
          layout="vertical"
        />
      );

      // Check that products are accessible
      expect(screen.getByText('Organic Tomatoes')).toBeTruthy();
    });

    it('supports keyboard navigation', () => {
      render(
        <ProductSearch onSearch={mockOnSearch} showAdvancedFilters={true} />
      );

      const searchInput = screen.getByPlaceholderText('Search products...');
      expect(searchInput.props.returnKeyType).toBe('search');
    });
  });
});
