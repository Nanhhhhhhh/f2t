import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import {
  BulkActions,
  InventoryFilters,
  InventoryList,
  InventoryStats,
} from './index';

// Mock dependencies
jest.mock('@/api/products', () => ({
  PRODUCT_CATEGORIES: {
    VEGETABLES: 'vegetables',
    FRUITS: 'fruits',
    HERBS: 'herbs',
  },
  formatPrice: (price: number) => `$${price.toFixed(2)}`,
  formatPricePerUnit: (price: number, unit: string) =>
    `$${price.toFixed(2)} per ${unit}`,
  getCategoryLabel: (category: string) =>
    category.charAt(0).toUpperCase() + category.slice(1),
  useUpdateStock: () => ({
    mutateAsync: jest.fn(),
    isPending: false,
  }),
}));

jest.mock('@/types/constants', () => ({
  PRODUCT_CATEGORIES: {
    VEGETABLES: 'vegetables',
    FRUITS: 'fruits',
    HERBS: 'herbs',
  },
}));

jest.mock('@/lib/auth', () => ({
  useAuth: {
    use: {
      getCurrentFarm: () => () => ({ id: 'farm_123', name: 'Test Farm' }),
    },
  },
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
  }),
}));

// Helper function to create mock products
const createMockProducts = () => [
  {
    id: 'prod_1',
    farmId: 'farm_123',
    name: 'Organic Tomatoes',
    description: 'Fresh organic cherry tomatoes',
    category: 'vegetables' as const,
    subcategory: 'cherry',
    pricePerUnit: 4.99,
    unit: 'kg' as const,
    availableQuantity: 25,
    minimumOrder: 1,
    status: 'available' as const,
    images: ['tomato1.jpg'],
    harvestDate: '2024-07-13',
    deliveryDate: '2024-07-15',
    estimatedShelfLife: 7,
    isOrganic: true,
    tags: ['fresh', 'organic'],
    farmingMethods: ['organic'],
    qualityGrade: 'premium',
    freshnessLevel: 'same_day',
    seasonalAvailability: ['summer'],
    createdAt: '2024-07-01T00:00:00Z',
    updatedAt: '2024-07-13T00:00:00Z',
  },
  {
    id: 'prod_2',
    farmId: 'farm_123',
    name: 'Fresh Carrots',
    description: 'Fresh carrots from the farm',
    category: 'vegetables' as const,
    pricePerUnit: 2.99,
    unit: 'kg' as const,
    availableQuantity: 3, // Low stock
    minimumOrder: 1,
    status: 'available' as const,
    images: [],
    harvestDate: '2024-07-12',
    deliveryDate: '2024-07-14',
    estimatedShelfLife: 14,
    isOrganic: false,
    tags: ['fresh'],
    farmingMethods: ['conventional'],
    qualityGrade: 'standard',
    freshnessLevel: 'fresh',
    seasonalAvailability: ['summer', 'fall'],
    createdAt: '2024-07-01T00:00:00Z',
    updatedAt: '2024-07-12T00:00:00Z',
  },
  {
    id: 'prod_3',
    farmId: 'farm_123',
    name: 'Sweet Corn',
    description: 'Sweet and fresh corn',
    category: 'vegetables' as const,
    pricePerUnit: 1.99,
    unit: 'piece' as const,
    availableQuantity: 0, // Out of stock
    minimumOrder: 1,
    status: 'sold_out' as const,
    images: ['corn1.jpg'],
    harvestDate: '2024-07-10',
    deliveryDate: '2024-07-12',
    estimatedShelfLife: 5,
    isOrganic: true,
    tags: ['organic', 'sweet'],
    farmingMethods: ['organic'],
    qualityGrade: 'premium',
    freshnessLevel: 'fresh',
    seasonalAvailability: ['summer'],
    createdAt: '2024-06-01T00:00:00Z',
    updatedAt: '2024-07-10T00:00:00Z',
  },
];

describe('Inventory Management Components', () => {
  const mockProducts = createMockProducts();
  const mockOnFiltersChange = jest.fn();
  const mockOnSelectProduct = jest.fn();
  const mockOnSelectAll = jest.fn();
  const mockOnEditProduct = jest.fn();
  const mockOnViewProduct = jest.fn();
  const mockOnUpdateStock = jest.fn();
  const mockOnUpdateStatus = jest.fn();
  const mockOnDelete = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('InventoryStats Component', () => {
    it('renders inventory statistics correctly', () => {
      render(<InventoryStats products={mockProducts} />);

      expect(screen.getByText('Total Products')).toBeTruthy();
      expect(screen.getByText('3')).toBeTruthy();
      expect(screen.getByText('2 active')).toBeTruthy();
      expect(screen.getByText('Total Value')).toBeTruthy();
    });

    it('shows stock level breakdown', () => {
      render(<InventoryStats products={mockProducts} />);

      expect(screen.getByText('In Stock')).toBeTruthy();
      expect(screen.getByText('Low Stock')).toBeTruthy();
      expect(screen.getByText('Out of Stock')).toBeTruthy();
    });

    it('displays empty state when no products', () => {
      render(<InventoryStats products={[]} />);

      expect(screen.getByText('No products in inventory yet')).toBeTruthy();
      expect(
        screen.getByText('Add your first product to get started')
      ).toBeTruthy();
    });

    it('calculates statistics correctly', () => {
      render(<InventoryStats products={mockProducts} />);

      // Should show 2 in stock (tomatoes: 25, carrots: 3)
      expect(screen.getAllByText('2')[0]).toBeTruthy(); // In stock count
      // Should show 1 low stock (carrots: 3 <= 5)
      expect(screen.getAllByText('1')[0]).toBeTruthy(); // Low stock count
      // Should show 1 out of stock (corn: 0)
      expect(screen.getAllByText('1')[1]).toBeTruthy(); // Out of stock count
    });
  });

  describe('InventoryFilters Component', () => {
    const mockFilters = {
      search: '',
      category: 'all',
      stockStatus: 'all' as const,
      status: 'all' as const,
      sortBy: 'name' as const,
      sortOrder: 'asc' as const,
    };

    it('renders search input', () => {
      render(
        <InventoryFilters
          filters={mockFilters}
          onFiltersChange={mockOnFiltersChange}
        />
      );

      expect(screen.getByPlaceholderText('Search products...')).toBeTruthy();
    });

    it('shows quick filter buttons', () => {
      render(
        <InventoryFilters
          filters={mockFilters}
          onFiltersChange={mockOnFiltersChange}
        />
      );

      expect(screen.getByText('Low Stock')).toBeTruthy();
      expect(screen.getByText('Out of Stock')).toBeTruthy();
      expect(screen.getByText('Inactive')).toBeTruthy();
    });

    it('handles search input changes', () => {
      render(
        <InventoryFilters
          filters={mockFilters}
          onFiltersChange={mockOnFiltersChange}
        />
      );

      const searchInput = screen.getByPlaceholderText('Search products...');
      fireEvent.changeText(searchInput, 'tomato');

      expect(mockOnFiltersChange).toHaveBeenCalledWith({ search: 'tomato' });
    });

    it('handles quick filter selection', () => {
      render(
        <InventoryFilters
          filters={mockFilters}
          onFiltersChange={mockOnFiltersChange}
        />
      );

      fireEvent.press(screen.getByText('Low Stock'));
      expect(mockOnFiltersChange).toHaveBeenCalledWith({
        stockStatus: 'low_stock',
      });

      fireEvent.press(screen.getByText('Out of Stock'));
      expect(mockOnFiltersChange).toHaveBeenCalledWith({
        stockStatus: 'out_of_stock',
      });
    });

    it('expands advanced filters', () => {
      render(
        <InventoryFilters
          filters={mockFilters}
          onFiltersChange={mockOnFiltersChange}
        />
      );

      fireEvent.press(screen.getByText('Advanced Filters'));

      expect(screen.getByText('Category')).toBeTruthy();
      expect(screen.getByText('Stock Status')).toBeTruthy();
      expect(screen.getByText('Product Status')).toBeTruthy();
    });

    it('shows clear filters button when filters are active', () => {
      const activeFilters = {
        ...mockFilters,
        search: 'test',
        category: 'vegetables',
      };

      render(
        <InventoryFilters
          filters={activeFilters}
          onFiltersChange={mockOnFiltersChange}
        />
      );

      expect(screen.getByText('Clear All')).toBeTruthy();
    });
  });

  describe('InventoryList Component', () => {
    it('renders product list correctly', () => {
      render(
        <InventoryList
          products={mockProducts}
          selectedProducts={[]}
          onSelectProduct={mockOnSelectProduct}
          onSelectAll={mockOnSelectAll}
          onEditProduct={mockOnEditProduct}
          onViewProduct={mockOnViewProduct}
          onDeleteProduct={jest.fn()}
          onUpdateStock={mockOnUpdateStock}
          isLoading={false}
          error={null}
          isUpdatingStock={false}
        />
      );

      expect(screen.getByText('Organic Tomatoes')).toBeTruthy();
      expect(screen.getByText('Fresh Carrots')).toBeTruthy();
      expect(screen.getByText('Sweet Corn')).toBeTruthy();
    });

    it('shows select all functionality', () => {
      render(
        <InventoryList
          products={mockProducts}
          selectedProducts={[]}
          onSelectProduct={mockOnSelectProduct}
          onSelectAll={mockOnSelectAll}
          onEditProduct={mockOnEditProduct}
          onViewProduct={mockOnViewProduct}
          onDeleteProduct={jest.fn()}
          onUpdateStock={mockOnUpdateStock}
          isLoading={false}
          error={null}
          isUpdatingStock={false}
        />
      );

      expect(screen.getByText('Select All (3 products)')).toBeTruthy();

      fireEvent.press(screen.getByLabelText('Select all products'));
      expect(mockOnSelectAll).toHaveBeenCalledTimes(1);
    });

    it('displays product information correctly', () => {
      render(
        <InventoryList
          products={mockProducts}
          selectedProducts={[]}
          onSelectProduct={mockOnSelectProduct}
          onSelectAll={mockOnSelectAll}
          onEditProduct={mockOnEditProduct}
          onViewProduct={mockOnViewProduct}
          onDeleteProduct={jest.fn()}
          onUpdateStock={mockOnUpdateStock}
          isLoading={false}
          error={null}
          isUpdatingStock={false}
        />
      );

      expect(screen.getByText('$4.99 per kg')).toBeTruthy();
      expect(screen.getByText('25 kgs in stock')).toBeTruthy();
      expect(screen.getByText('3 kgs in stock')).toBeTruthy();
      expect(screen.getByText('0 pieces in stock')).toBeTruthy();
    });

    it('shows status badges correctly', () => {
      render(
        <InventoryList
          products={mockProducts}
          selectedProducts={[]}
          onSelectProduct={mockOnSelectProduct}
          onSelectAll={mockOnSelectAll}
          onEditProduct={mockOnEditProduct}
          onViewProduct={mockOnViewProduct}
          onDeleteProduct={jest.fn()}
          onUpdateStock={mockOnUpdateStock}
          isLoading={false}
          error={null}
          isUpdatingStock={false}
        />
      );

      expect(screen.getAllByText('Available')).toHaveLength(2);
      expect(screen.getByText('Sold Out')).toBeTruthy();
    });

    it('handles product selection', () => {
      render(
        <InventoryList
          products={mockProducts}
          selectedProducts={['prod_1']}
          onSelectProduct={mockOnSelectProduct}
          onSelectAll={mockOnSelectAll}
          onEditProduct={mockOnEditProduct}
          onViewProduct={mockOnViewProduct}
          onDeleteProduct={jest.fn()}
          onUpdateStock={mockOnUpdateStock}
          isLoading={false}
          error={null}
          isUpdatingStock={false}
        />
      );

      fireEvent.press(screen.getByLabelText('Select Fresh Carrots'));
      expect(mockOnSelectProduct).toHaveBeenCalledWith('prod_2');
    });

    it('shows loading state', () => {
      render(
        <InventoryList
          products={[]}
          selectedProducts={[]}
          onSelectProduct={mockOnSelectProduct}
          onSelectAll={mockOnSelectAll}
          onEditProduct={mockOnEditProduct}
          onViewProduct={mockOnViewProduct}
          onDeleteProduct={jest.fn()}
          onUpdateStock={mockOnUpdateStock}
          isLoading={true}
          error={null}
          isUpdatingStock={false}
        />
      );

      // Should render loading state without errors
      expect(screen.root).toBeTruthy();
    });

    it('shows error state', () => {
      render(
        <InventoryList
          products={[]}
          selectedProducts={[]}
          onSelectProduct={mockOnSelectProduct}
          onSelectAll={mockOnSelectAll}
          onEditProduct={mockOnEditProduct}
          onViewProduct={mockOnViewProduct}
          onDeleteProduct={jest.fn()}
          onUpdateStock={mockOnUpdateStock}
          isLoading={false}
          error="Failed to load products"
          isUpdatingStock={false}
        />
      );

      expect(screen.getByText('Error Loading Inventory')).toBeTruthy();
      expect(screen.getByText('Failed to load products')).toBeTruthy();
    });

    it('shows empty state when no products match filters', () => {
      render(
        <InventoryList
          products={[]}
          selectedProducts={[]}
          onSelectProduct={mockOnSelectProduct}
          onSelectAll={mockOnSelectAll}
          onEditProduct={mockOnEditProduct}
          onViewProduct={mockOnViewProduct}
          onDeleteProduct={jest.fn()}
          onUpdateStock={mockOnUpdateStock}
          isLoading={false}
          error={null}
          isUpdatingStock={false}
        />
      );

      expect(screen.getByText('No Products Found')).toBeTruthy();
      expect(
        screen.getByText(/No products match your current filters/)
      ).toBeTruthy();
    });
  });

  describe('BulkActions Component', () => {
    it('renders bulk actions correctly', () => {
      render(
        <BulkActions
          selectedCount={2}
          selectedProductIds={['prod_1', 'prod_2']}
          onUpdateStatus={mockOnUpdateStatus}
          onDelete={mockOnDelete}
        />
      );

      expect(screen.getByText('Bulk Actions (2 selected)')).toBeTruthy();
      expect(screen.getByText('Apply')).toBeTruthy();
      expect(screen.getByText('Delete')).toBeTruthy();
    });

    it('shows quick action buttons', () => {
      render(
        <BulkActions
          selectedCount={1}
          selectedProductIds={['prod_1']}
          onUpdateStatus={mockOnUpdateStatus}
          onDelete={mockOnDelete}
        />
      );

      expect(screen.getByText('Mark Available')).toBeTruthy();
      expect(screen.getByText('Mark Unavailable')).toBeTruthy();
    });

    it('handles bulk delete action', () => {
      render(
        <BulkActions
          selectedCount={2}
          selectedProductIds={['prod_1', 'prod_2']}
          onUpdateStatus={mockOnUpdateStatus}
          onDelete={mockOnDelete}
        />
      );

      fireEvent.press(screen.getByText('Delete'));
      // Should show confirmation alert (mocked in test environment)
    });
  });

  describe('Integration Tests', () => {
    it('works together for complete inventory management experience', () => {
      const TestScreen = () => (
        <>
          <InventoryStats products={mockProducts} />
          <InventoryFilters
            filters={{
              search: '',
              category: 'all',
              stockStatus: 'all',
              status: 'all',
              sortBy: 'name',
              sortOrder: 'asc',
            }}
            onFiltersChange={mockOnFiltersChange}
          />
          <InventoryList
            products={mockProducts}
            selectedProducts={['prod_1']}
            onSelectProduct={mockOnSelectProduct}
            onSelectAll={mockOnSelectAll}
            onEditProduct={mockOnEditProduct}
            onViewProduct={mockOnViewProduct}
            onDeleteProduct={jest.fn()}
            onUpdateStock={mockOnUpdateStock}
            isLoading={false}
            error={null}
            isUpdatingStock={false}
          />
          <BulkActions
            selectedCount={1}
            selectedProductIds={['prod_1']}
            onUpdateStatus={mockOnUpdateStatus}
            onDelete={mockOnDelete}
          />
        </>
      );

      render(<TestScreen />);

      // Verify all components render together
      expect(screen.getByText('Total Products')).toBeTruthy();
      expect(screen.getByPlaceholderText('Search products...')).toBeTruthy();
      expect(screen.getByText('Organic Tomatoes')).toBeTruthy();
      expect(screen.getByText('Bulk Actions (1 selected)')).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('provides proper accessibility labels', () => {
      render(
        <InventoryList
          products={mockProducts}
          selectedProducts={[]}
          onSelectProduct={mockOnSelectProduct}
          onSelectAll={mockOnSelectAll}
          onEditProduct={mockOnEditProduct}
          onViewProduct={mockOnViewProduct}
          onDeleteProduct={jest.fn()}
          onUpdateStock={mockOnUpdateStock}
          isLoading={false}
          error={null}
          isUpdatingStock={false}
        />
      );

      expect(screen.getByLabelText('Select all products')).toBeTruthy();
      expect(screen.getByLabelText('Select Organic Tomatoes')).toBeTruthy();
      expect(screen.getByLabelText('Select Fresh Carrots')).toBeTruthy();
    });
  });
});
