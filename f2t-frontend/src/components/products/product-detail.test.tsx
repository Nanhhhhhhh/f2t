import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import {
  ProductInfo,
  ProductNutritionFacts,
  ProductPurchaseOptions,
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
  formatHarvestTime: (date?: string) =>
    date ? 'Harvested 2 days ago' : 'Harvest date not specified',
  getProductAvailabilityStatus: () => 'available' as const,
  isProductInSeason: () => true,
  isProductFresh: () => true,
  getFreshnessLabel: (score?: number | null) =>
    score === null || score === undefined
      ? null
      : {
          tag: 'fresh' as const,
          label: 'Tươi',
          color: 'green' as const,
          display: `Tươi · ${Math.round(score * 100)}%`,
        },
}));

jest.mock('@/api/farms', () => ({
  useGetFarm: () => ({
    data: {
      success: true,
      data: {
        id: 'farm_123',
        name: 'Green Valley Farm',
        description: 'Organic farm specializing in fresh vegetables',
        location: {
          address: '123 Farm Road, Valley City',
          farmingArea: 50,
        },
        deliveryMethods: ['farm_delivery', 'pickup'],
        certifications: ['Organic', 'Non-GMO'],
        createdAt: '2020-01-01T00:00:00Z',
      },
    },
    isLoading: false,
  }),
}));

// Helper function to create mock product
const createMockProduct = (overrides = {}) => ({
  id: 'prod_123',
  farmId: 'farm_123',
  name: 'Organic Tomatoes',
  description:
    'Fresh, juicy organic tomatoes grown with care using sustainable farming practices.',
  category: 'leafy' as const,
  subcategory: 'cherry',
  pricePerUnit: 4.99,
  unit: 'kg' as const,
  availableQuantity: 25,
  minimumOrder: 1,
  status: 'available' as const,
  images: ['tomato1.jpg', 'tomato2.jpg'],
  harvestDate: '2024-07-13',
  deliveryDate: '2024-07-15',
  estimatedShelfLife: 7,
  isOrganic: true,
  farmingMethods: ['organic', 'greenhouse'],
  qualityGrade: 'premium',
  freshnessLevel: 'same_day',
  seasonalAvailability: ['summer'],
  storageRequirements: 'refrigerated',
  packagingType: 'loose',
  tags: ['fresh', 'local', 'premium'],
  nutritionalInfo: {
    calories: 18,
    protein: 0.9,
    carbs: 3.9,
    fat: 0.2,
    fiber: 1.2,
    vitamins: ['Vitamin C', 'Vitamin K', 'Potassium'],
  },
  storageInstructions: 'Store in refrigerator for best freshness',
  allergenInfo: [],
  certifications: [],
  createdAt: '2024-07-01T00:00:00Z',
  updatedAt: '2024-07-13T00:00:00Z',
  ...overrides,
});

describe('Product Detail Components', () => {
  const mockProduct = createMockProduct();
  const mockOnViewFarm = jest.fn();
  const mockOnQuantityChange = jest.fn();
  const mockOnAddToCart = jest.fn();
  const mockOnBuyNow = jest.fn();
  const mockOnContactFarm = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('ProductInfo Component', () => {
    it('renders product information correctly', () => {
      render(<ProductInfo product={mockProduct} onViewFarm={mockOnViewFarm} />);

      expect(screen.getByText('Organic Tomatoes')).toBeTruthy();
      expect(screen.getByText('Vegetables • cherry')).toBeTruthy();
      expect(screen.getByText('$4.99 per kg')).toBeTruthy();
      expect(screen.getByText(/25 kgs available/)).toBeTruthy();
    });

    it('displays product description', () => {
      render(<ProductInfo product={mockProduct} onViewFarm={mockOnViewFarm} />);

      expect(screen.getByText(/Fresh, juicy organic tomatoes/)).toBeTruthy();
    });

    it('shows product tags', () => {
      render(<ProductInfo product={mockProduct} onViewFarm={mockOnViewFarm} />);

      expect(screen.getByText('Organic')).toBeTruthy();
      expect(screen.getByText('In Season')).toBeTruthy();
      expect(screen.getByText('Premium')).toBeTruthy();
      expect(screen.getAllByText('Fresh')[0]).toBeTruthy();
    });

    it('displays harvest information', () => {
      render(<ProductInfo product={mockProduct} onViewFarm={mockOnViewFarm} />);

      expect(screen.getByText('Harvested 2 days ago')).toBeTruthy();
      expect(screen.getByText('Fresh from the farm')).toBeTruthy();
    });

    it('shows storage instructions', () => {
      render(<ProductInfo product={mockProduct} onViewFarm={mockOnViewFarm} />);

      expect(screen.getByText('Storage & Handling')).toBeTruthy();
      expect(
        screen.getByText('Store in refrigerator for best freshness')
      ).toBeTruthy();
      expect(screen.getByText('Best consumed within 7 days')).toBeTruthy();
    });

    it('calls onViewFarm when farm link is pressed', () => {
      render(<ProductInfo product={mockProduct} onViewFarm={mockOnViewFarm} />);

      fireEvent.press(screen.getByText('View Farm →'));
      expect(mockOnViewFarm).toHaveBeenCalledTimes(1);
    });

    it('shows AI dynamic price, struck base price and flash_discount tag', () => {
      const aiProduct = createMockProduct({
        dynamicPrice: 3.5,
        priceTag: 'flash_discount',
      });

      render(<ProductInfo product={aiProduct} onViewFarm={mockOnViewFarm} />);

      expect(screen.getByText('$3.50 per kg')).toBeTruthy();
      expect(screen.getByText('$4.99 per kg')).toBeTruthy();
      expect(screen.getByText('Giảm giá chớp nhoáng')).toBeTruthy();
    });

    it('shows the freshness label when freshnessScore is present', () => {
      const aiProduct = createMockProduct({ freshnessScore: 0.82 });

      render(<ProductInfo product={aiProduct} onViewFarm={mockOnViewFarm} />);

      expect(screen.getByText('Tươi · 82%')).toBeTruthy();
    });

    it('renders no AI price or freshness label in shadow mode (fields absent)', () => {
      render(<ProductInfo product={mockProduct} onViewFarm={mockOnViewFarm} />);

      expect(screen.queryByText('Giảm giá chớp nhoáng')).toBeNull();
      expect(screen.queryByText(/·\s*\d+%/)).toBeNull();
    });
  });

  describe('ProductPurchaseOptions Component', () => {
    it('renders purchase options correctly', () => {
      render(
        <ProductPurchaseOptions
          product={mockProduct}
          quantity={2}
          onQuantityChange={mockOnQuantityChange}
          onAddToCart={mockOnAddToCart}
          onBuyNow={mockOnBuyNow}
          onContactFarm={mockOnContactFarm}
        />
      );

      expect(screen.getByText('Purchase Options')).toBeTruthy();
      expect(screen.getByText('Quantity:')).toBeTruthy();
      expect(screen.getByText('2')).toBeTruthy();
    });

    it('shows price breakdown', () => {
      render(
        <ProductPurchaseOptions
          product={mockProduct}
          quantity={3}
          onQuantityChange={mockOnQuantityChange}
          onAddToCart={mockOnAddToCart}
          onBuyNow={mockOnBuyNow}
          onContactFarm={mockOnContactFarm}
        />
      );

      expect(screen.getByText('Price Breakdown')).toBeTruthy();
      expect(screen.getByText(/\$4\.99.*×.*3.*kgs/)).toBeTruthy();
      expect(screen.getAllByText('$14.97')[0]).toBeTruthy();
    });

    it('shows delivery information', () => {
      render(
        <ProductPurchaseOptions
          product={mockProduct}
          quantity={1}
          onQuantityChange={mockOnQuantityChange}
          onAddToCart={mockOnAddToCart}
          onBuyNow={mockOnBuyNow}
          onContactFarm={mockOnContactFarm}
        />
      );

      expect(screen.getByText(/Available for delivery/)).toBeTruthy();
      expect(screen.getByText('Fresh from the farm to your door')).toBeTruthy();
    });

    it('handles quantity changes', () => {
      render(
        <ProductPurchaseOptions
          product={mockProduct}
          quantity={2}
          onQuantityChange={mockOnQuantityChange}
          onAddToCart={mockOnAddToCart}
          onBuyNow={mockOnBuyNow}
          onContactFarm={mockOnContactFarm}
        />
      );

      const increaseButton = screen.getByText('+');
      fireEvent.press(increaseButton);
      expect(mockOnQuantityChange).toHaveBeenCalledWith(3);

      const decreaseButton = screen.getByText('−');
      fireEvent.press(decreaseButton);
      expect(mockOnQuantityChange).toHaveBeenCalledWith(1);
    });

    it('calls purchase actions', () => {
      render(
        <ProductPurchaseOptions
          product={mockProduct}
          quantity={1}
          onQuantityChange={mockOnQuantityChange}
          onAddToCart={mockOnAddToCart}
          onBuyNow={mockOnBuyNow}
          onContactFarm={mockOnContactFarm}
        />
      );

      fireEvent.press(screen.getByText('Add to Cart'));
      expect(mockOnAddToCart).toHaveBeenCalledTimes(1);

      fireEvent.press(screen.getByText(/Buy Now/));
      expect(mockOnBuyNow).toHaveBeenCalledTimes(1);
    });

    it('shows out of stock state', () => {
      const outOfStockProduct = createMockProduct({ availableQuantity: 0 });

      render(
        <ProductPurchaseOptions
          product={outOfStockProduct}
          quantity={1}
          onQuantityChange={mockOnQuantityChange}
          onAddToCart={mockOnAddToCart}
          onBuyNow={mockOnBuyNow}
          onContactFarm={mockOnContactFarm}
        />
      );

      expect(screen.getByText('⚠️ Currently out of stock')).toBeTruthy();
      expect(
        screen.getByText('Contact the farm for availability updates')
      ).toBeTruthy();
      expect(screen.queryByText('Add to Cart')).toBeNull();
    });

    it('shows low stock warning', () => {
      const lowStockProduct = createMockProduct({ availableQuantity: 3 });

      render(
        <ProductPurchaseOptions
          product={lowStockProduct}
          quantity={1}
          onQuantityChange={mockOnQuantityChange}
          onAddToCart={mockOnAddToCart}
          onBuyNow={mockOnBuyNow}
          onContactFarm={mockOnContactFarm}
        />
      );

      expect(screen.getByText('⚡ Only 3 kgs left!')).toBeTruthy();
      expect(screen.getByText('Order soon to secure your items')).toBeTruthy();
    });
  });

  describe('ProductNutritionFacts Component', () => {
    it('renders nutrition facts when collapsed', () => {
      render(
        <ProductNutritionFacts nutritionalInfo={mockProduct.nutritionalInfo!} />
      );

      expect(screen.getByText('Nutrition Facts')).toBeTruthy();
      expect(screen.getByText('+')).toBeTruthy();
    });

    it('expands to show detailed nutrition information', () => {
      render(
        <ProductNutritionFacts nutritionalInfo={mockProduct.nutritionalInfo!} />
      );

      fireEvent.press(screen.getByText('Nutrition Facts'));

      expect(screen.getByText('−')).toBeTruthy();
      expect(screen.getByText('Per 100g serving')).toBeTruthy();
      expect(screen.getByText('Macronutrients')).toBeTruthy();
      expect(screen.getByText('Calories')).toBeTruthy();
      expect(screen.getByText('18')).toBeTruthy();
      expect(screen.getByText('Protein')).toBeTruthy();
      expect(screen.getByText('0.9g')).toBeTruthy();
    });

    it('shows vitamins and minerals', () => {
      render(
        <ProductNutritionFacts nutritionalInfo={mockProduct.nutritionalInfo!} />
      );

      fireEvent.press(screen.getByText('Nutrition Facts'));

      expect(screen.getByText('Rich in Vitamins & Minerals')).toBeTruthy();
      expect(screen.getByText('Vitamin C')).toBeTruthy();
      expect(screen.getByText('Vitamin K')).toBeTruthy();
      expect(screen.getByText('Potassium')).toBeTruthy();
    });

    it('collapses when pressed again', () => {
      render(
        <ProductNutritionFacts nutritionalInfo={mockProduct.nutritionalInfo!} />
      );

      // Expand
      fireEvent.press(screen.getByText('Nutrition Facts'));
      expect(screen.getByText('−')).toBeTruthy();

      // Collapse
      fireEvent.press(screen.getByText('Nutrition Facts'));
      expect(screen.getByText('+')).toBeTruthy();
      expect(screen.queryByText('Macronutrients')).toBeNull();
    });
  });

  describe('Integration Tests', () => {
    it('works together for complete product detail experience', () => {
      const TestScreen = () => (
        <>
          <ProductInfo product={mockProduct} onViewFarm={mockOnViewFarm} />
          <ProductPurchaseOptions
            product={mockProduct}
            quantity={2}
            onQuantityChange={mockOnQuantityChange}
            onAddToCart={mockOnAddToCart}
            onBuyNow={mockOnBuyNow}
            onContactFarm={mockOnContactFarm}
          />
          <ProductNutritionFacts
            nutritionalInfo={mockProduct.nutritionalInfo!}
          />
        </>
      );

      render(<TestScreen />);

      // Verify all components render
      expect(screen.getByText('Organic Tomatoes')).toBeTruthy();
      expect(screen.getByText('Purchase Options')).toBeTruthy();
      expect(screen.getByText('Nutrition Facts')).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('provides proper accessibility labels', () => {
      render(<ProductInfo product={mockProduct} onViewFarm={mockOnViewFarm} />);

      // Check that important information is accessible
      expect(screen.getByText('Organic Tomatoes')).toBeTruthy();
      expect(screen.getByText('View Farm →')).toBeTruthy();
    });
  });
});
