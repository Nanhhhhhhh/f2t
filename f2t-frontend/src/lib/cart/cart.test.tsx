/* eslint-disable testing-library/no-render-in-lifecycle */
// Mock MMKV with more comprehensive functionality
import { act, renderHook } from '@testing-library/react-native';

import type { Product } from '@/types';

import {
  useCart,
  useCartIsEmpty,
  useCartItemCount,
  useCartItems,
  useCartTotal,
} from './index';
import {
  calculateCartTotals,
  generateCartSummary,
  getCartItemForProduct,
  groupCartItemsByFarm,
  isProductInCart,
  validateCartForCheckout,
} from './utils';

const mockStorage = {
  getString: jest.fn(),
  set: jest.fn(),
  delete: jest.fn(),
  clearAll: jest.fn(),
  getAllKeys: jest.fn(() => []),
  contains: jest.fn(() => false),
};

// Mock MMKV before importing the cart module
jest.mock('react-native-mmkv', () => ({
  MMKV: jest.fn(() => mockStorage),
}));

// Mock product data
const createMockProduct = (overrides: Partial<Product> = {}): Product => ({
  id: 'product-1',
  farmId: 'farm-1',
  name: 'Fresh Tomatoes',
  description: 'Organic, locally grown tomatoes',
  category: 'leafy',
  subcategory: 'nightshades',
  pricePerUnit: 4.99,
  unit: 'kg',
  availableQuantity: 10,
  status: 'available',
  images: ['image1.jpg'],
  harvestDate: '2024-01-15',
  deliveryDate: '2024-01-15',
  estimatedShelfLife: 7,
  minimumOrder: 1,
  isOrganic: true,
  tags: ['organic', 'fresh'],
  seasonalAvailability: ['summer'],
  nutritionalInfo: {
    calories: 18,
    protein: 0.9,
    carbs: 3.9,
    fat: 0.2,
    fiber: 1.2,
    vitamins: ['C', 'K'],
  },
  allergenInfo: [],
  storageInstructions: 'Store in cool, dry place',
  farmingMethods: ['organic'],
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  ...overrides,
});

describe('Cart Store', () => {
  beforeEach(() => {
    // Reset cart before each test
    const { result } = renderHook(() => useCart());
    act(() => {
      result.current.clearCart();
    });
  });

  describe('Basic Cart Operations', () => {
    it('should start with empty cart', () => {
      const { result } = renderHook(() => useCart());

      expect(result.current.items).toEqual([]);
      expect(result.current.isEmpty).toBe(true);
      expect(result.current.totalItems).toBe(0);
      expect(result.current.totalPrice).toBe(0);
    });

    it('should add item to cart', () => {
      const { result } = renderHook(() => useCart());
      const product = createMockProduct();

      act(() => {
        result.current.addItem(product, 2);
      });

      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0].productId).toBe(product.id);
      expect(result.current.items[0].quantity).toBe(2);
      expect(result.current.totalItems).toBe(2);
      expect(result.current.totalPrice).toBe(9.98);
    });

    it('should use AI dynamicPrice for totals when present', () => {
      const { result } = renderHook(() => useCart());
      const product = createMockProduct({ dynamicPrice: 3.0 });

      act(() => {
        result.current.addItem(product, 2);
      });

      // 3.0 (AI) * 2, not 4.99 (base) * 2
      expect(result.current.totalPrice).toBe(6.0);
    });

    it('should update quantity when adding existing product', () => {
      const { result } = renderHook(() => useCart());
      const product = createMockProduct();

      act(() => {
        result.current.addItem(product, 2);
        result.current.addItem(product, 3);
      });

      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0].quantity).toBe(5);
      expect(result.current.totalItems).toBe(5);
    });

    it('should remove item from cart', () => {
      const { result } = renderHook(() => useCart());
      const product = createMockProduct();

      act(() => {
        result.current.addItem(product, 2);
      });

      expect(result.current.items).toHaveLength(1);
      const cartItemId = result.current.items[0].id;

      act(() => {
        result.current.removeItem(cartItemId);
      });

      expect(result.current.items).toHaveLength(0);
      expect(result.current.isEmpty).toBe(true);
    });

    it('should update item quantity', () => {
      const { result } = renderHook(() => useCart());
      const product = createMockProduct();

      act(() => {
        result.current.addItem(product, 2);
      });

      expect(result.current.items).toHaveLength(1);
      const cartItemId = result.current.items[0].id;

      act(() => {
        result.current.updateQuantity(cartItemId, 5);
      });

      expect(result.current.items[0].quantity).toBe(5);
      expect(result.current.totalItems).toBe(5);
    });

    it('should remove item when quantity is set to 0', () => {
      const { result } = renderHook(() => useCart());
      const product = createMockProduct();

      act(() => {
        result.current.addItem(product, 2);
      });

      expect(result.current.items).toHaveLength(1);
      const cartItemId = result.current.items[0].id;

      act(() => {
        result.current.updateQuantity(cartItemId, 0);
      });

      expect(result.current.items).toHaveLength(0);
    });

    it('should clear entire cart', () => {
      const { result } = renderHook(() => useCart());
      const product1 = createMockProduct({ id: 'product-1' });
      const product2 = createMockProduct({ id: 'product-2' });

      act(() => {
        result.current.addItem(product1, 2);
        result.current.addItem(product2, 3);
        result.current.clearCart();
      });

      expect(result.current.items).toHaveLength(0);
      expect(result.current.isEmpty).toBe(true);
    });
  });

  describe('Cart Validation', () => {
    it('should validate cart items correctly', () => {
      const { result } = renderHook(() => useCart());
      const product = createMockProduct({ availableQuantity: 5 });

      act(() => {
        result.current.addItem(product, 3);
      });

      const validation = validateCartForCheckout(result.current.items);
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect insufficient stock', () => {
      const { result } = renderHook(() => useCart());
      const product = createMockProduct({ availableQuantity: 2 });

      // Test canAddItem validation
      const { canAdd, reason } = result.current.canAddItem(product, 5);
      expect(canAdd).toBe(false);
      expect(reason).toContain('Only 2 kgs available');

      // Test validation function
      const validation = validateCartForCheckout([
        {
          id: 'test-item',
          productId: product.id,
          product,
          quantity: 5,
          farmId: product.farmId,
          addedAt: new Date().toISOString(),
        },
      ]);
      expect(validation.isValid).toBe(false);
      expect(validation.errors[0]).toContain('Only 2 kgs available');
    });

    it('should detect minimum order violation', () => {
      const { result } = renderHook(() => useCart());
      const product = createMockProduct({ minimumOrder: 3 });

      // Test canAddItem validation
      const { canAdd, reason } = result.current.canAddItem(product, 1);
      expect(canAdd).toBe(false);
      expect(reason).toContain('Minimum order quantity is 3 kgs');

      // Test validation function
      const validation = validateCartForCheckout([
        {
          id: 'test-item',
          productId: product.id,
          product,
          quantity: 1,
          farmId: product.farmId,
          addedAt: new Date().toISOString(),
        },
      ]);
      expect(validation.isValid).toBe(false);
      expect(validation.errors[0]).toContain('Minimum order quantity is 3 kgs');
    });
  });

  describe('Cart Utilities', () => {
    it('should calculate cart totals correctly', () => {
      const product1 = createMockProduct({
        id: 'product-1',
        pricePerUnit: 5.0,
      });
      const product2 = createMockProduct({
        id: 'product-2',
        pricePerUnit: 3.0,
        farmId: 'farm-2',
      });

      const items = [
        {
          id: 'cart-1',
          productId: 'product-1',
          product: product1,
          quantity: 2,
          farmId: 'farm-1',
          addedAt: '2024-01-01T00:00:00Z',
        },
        {
          id: 'cart-2',
          productId: 'product-2',
          product: product2,
          quantity: 3,
          farmId: 'farm-2',
          addedAt: '2024-01-01T00:00:00Z',
        },
      ];

      const totals = calculateCartTotals(items);

      expect(totals.subtotal).toBe(19.0); // (5 * 2) + (3 * 3)
      expect(totals.deliveryFee).toBe(10.0); // 2 farms * $5
      expect(totals.tax).toBeCloseTo(1.9, 5); // 10% of $19
      expect(totals.total).toBeCloseTo(30.9, 5);
      expect(totals.itemCount).toBe(5);
      expect(totals.farmCount).toBe(2);
    });

    it('should group items by farm', () => {
      const product1 = createMockProduct({ id: 'product-1', farmId: 'farm-1' });
      const product2 = createMockProduct({ id: 'product-2', farmId: 'farm-1' });
      const product3 = createMockProduct({ id: 'product-3', farmId: 'farm-2' });

      const items = [
        {
          id: 'cart-1',
          productId: 'product-1',
          product: product1,
          quantity: 2,
          farmId: 'farm-1',
          addedAt: '2024-01-01T00:00:00Z',
        },
        {
          id: 'cart-2',
          productId: 'product-2',
          product: product2,
          quantity: 1,
          farmId: 'farm-1',
          addedAt: '2024-01-01T00:00:00Z',
        },
        {
          id: 'cart-3',
          productId: 'product-3',
          product: product3,
          quantity: 3,
          farmId: 'farm-2',
          addedAt: '2024-01-01T00:00:00Z',
        },
      ];

      const groups = groupCartItemsByFarm(items);

      expect(groups).toHaveLength(2);
      expect(groups[0].farmId).toBe('farm-1');
      expect(groups[0].items).toHaveLength(2);
      expect(groups[1].farmId).toBe('farm-2');
      expect(groups[1].items).toHaveLength(1);
    });

    it('should generate cart summary', () => {
      const product1 = createMockProduct({ id: 'product-1', farmId: 'farm-1' });
      const product2 = createMockProduct({ id: 'product-2', farmId: 'farm-2' });

      const items = [
        {
          id: 'cart-1',
          productId: 'product-1',
          product: product1,
          quantity: 2,
          farmId: 'farm-1',
          addedAt: '2024-01-01T00:00:00Z',
        },
        {
          id: 'cart-2',
          productId: 'product-2',
          product: product2,
          quantity: 1,
          farmId: 'farm-2',
          addedAt: '2024-01-01T00:00:00Z',
        },
      ];

      const summary = generateCartSummary(items);

      expect(summary).toContain('3 items');
      expect(summary).toContain('2 farms');
    });

    it('should check if product is in cart', () => {
      const product1 = createMockProduct({ id: 'product-1' });
      const product2 = createMockProduct({ id: 'product-2' });

      const items = [
        {
          id: 'cart-1',
          productId: 'product-1',
          product: product1,
          quantity: 2,
          farmId: 'farm-1',
          addedAt: '2024-01-01T00:00:00Z',
        },
      ];

      expect(isProductInCart(items, 'product-1')).toBe(true);
      expect(isProductInCart(items, 'product-2')).toBe(false);
    });

    it('should get cart item for product', () => {
      const product1 = createMockProduct({ id: 'product-1' });

      const items = [
        {
          id: 'cart-1',
          productId: 'product-1',
          product: product1,
          quantity: 2,
          farmId: 'farm-1',
          addedAt: '2024-01-01T00:00:00Z',
        },
      ];

      const cartItem = getCartItemForProduct(items, 'product-1');
      expect(cartItem).toBeDefined();
      expect(cartItem?.id).toBe('cart-1');
    });
  });

  describe('Cart Hooks', () => {
    it('should provide cart items hook', () => {
      const { result } = renderHook(() => useCartItems());
      expect(result.current).toEqual([]);
    });

    it('should provide cart total hook', () => {
      const { result } = renderHook(() => useCartTotal());
      expect(result.current).toBe(0);
    });

    it('should provide cart item count hook', () => {
      const { result } = renderHook(() => useCartItemCount());
      expect(result.current).toBe(0);
    });

    it('should provide cart is empty hook', () => {
      const { result } = renderHook(() => useCartIsEmpty());
      expect(result.current).toBe(true);
    });
  });

  describe('Cart Persistence with MMKV', () => {
    beforeEach(() => {
      // Reset all mocks before each test
      jest.clearAllMocks();
      mockStorage.getString.mockReturnValue(null);
      mockStorage.set.mockImplementation(() => {});
      mockStorage.delete.mockImplementation(() => {});
      mockStorage.clearAll.mockImplementation(() => {});
      mockStorage.getAllKeys.mockReturnValue([]);
      mockStorage.contains.mockReturnValue(false);
    });

    it('should save cart data to MMKV storage when items are added', () => {
      const { result } = renderHook(() => useCart());
      const product = createMockProduct();

      act(() => {
        result.current.addItem(product, 2);
      });

      // Verify that set was called with cart data
      expect(mockStorage.set).toHaveBeenCalledWith(
        'cart-storage',
        expect.stringContaining('"items":')
      );
    });

    it('should load cart data from MMKV storage on initialization', () => {
      const savedCartData = JSON.stringify({
        state: {
          items: [
            {
              id: 'cart-item-1',
              productId: 'product-1',
              product: createMockProduct(),
              quantity: 2,
              farmId: 'farm-1',
              addedAt: '2024-01-15T10:00:00Z',
            },
          ],
          lastUpdated: '2024-01-15T10:00:00Z',
        },
        version: 0,
      });

      mockStorage.getString.mockReturnValue(savedCartData);

      const { result } = renderHook(() => useCart());

      // Verify that getString was called to load data
      expect(mockStorage.getString).toHaveBeenCalledWith('cart-storage');

      // Verify that cart was loaded with saved data
      expect(result.current.items).toHaveLength(1);
      expect(result.current.totalItems).toBe(2);
    });

    it('should handle corrupted storage data gracefully', () => {
      mockStorage.getString.mockReturnValue('invalid-json-data');

      const { result } = renderHook(() => useCart());

      // Should not throw error and should initialize with empty cart
      expect(result.current.items).toHaveLength(0);
      expect(result.current.isEmpty).toBe(true);
    });

    it('should handle missing storage data gracefully', () => {
      mockStorage.getString.mockReturnValue(null);

      const { result } = renderHook(() => useCart());

      // Should initialize with empty cart
      expect(result.current.items).toHaveLength(0);
      expect(result.current.isEmpty).toBe(true);
    });

    it('should clear storage when clearStorage is called', () => {
      const { result } = renderHook(() => useCart());

      act(() => {
        result.current.clearStorage();
      });

      expect(mockStorage.delete).toHaveBeenCalledWith('cart-storage');
    });

    it('should persist only items and lastUpdated, not UI state', () => {
      const { result } = renderHook(() => useCart());
      const product = createMockProduct();

      act(() => {
        result.current.addItem(product, 1);
        result.current.openCart(); // UI state change
      });

      // Verify that set was called
      expect(mockStorage.set).toHaveBeenCalled();

      const savedData = JSON.parse(mockStorage.set.mock.calls[0][1]);

      // Should contain items and lastUpdated
      expect(savedData.state).toHaveProperty('items');
      expect(savedData.state).toHaveProperty('lastUpdated');

      // Should not contain UI state like isOpen
      expect(savedData.state).not.toHaveProperty('isOpen');
    });

    it('should update lastUpdated timestamp when cart changes', () => {
      const { result } = renderHook(() => useCart());
      const product = createMockProduct();

      act(() => {
        result.current.addItem(product, 1);
      });

      expect(result.current.lastUpdated).toBeTruthy();
      expect(new Date(result.current.lastUpdated!).getTime()).toBeCloseTo(
        Date.now(),
        -2
      );
    });

    it('should handle storage errors gracefully', () => {
      mockStorage.set.mockImplementation(() => {
        throw new Error('Storage write failed');
      });

      const { result } = renderHook(() => useCart());
      const product = createMockProduct();

      // Should not throw error even if storage fails
      expect(() => {
        act(() => {
          result.current.addItem(product, 1);
        });
      }).not.toThrow();

      // Cart should still work in memory
      expect(result.current.items).toHaveLength(1);
    });

    it('should migrate old cart data format if needed', () => {
      // Simulate old format without lastUpdated
      const oldFormatData = JSON.stringify({
        state: {
          items: [
            {
              id: 'cart-item-1',
              productId: 'product-1',
              product: createMockProduct(),
              quantity: 1,
              farmId: 'farm-1',
              addedAt: '2024-01-15T10:00:00Z',
            },
          ],
        },
        version: 0,
      });

      mockStorage.getString.mockReturnValue(oldFormatData);

      const { result } = renderHook(() => useCart());

      // Should handle old format and add lastUpdated
      expect(result.current.items).toHaveLength(1);
      expect(result.current.lastUpdated).toBeTruthy();
    });

    it('should handle large cart data efficiently', () => {
      const { result } = renderHook(() => useCart());

      // Add many items to test performance
      const products = Array.from({ length: 100 }, (_, i) =>
        createMockProduct({ id: `product-${i}`, name: `Product ${i}` })
      );

      act(() => {
        products.forEach((product) => {
          result.current.addItem(product, 1);
        });
      });

      expect(result.current.items).toHaveLength(100);
      expect(mockStorage.set).toHaveBeenCalled();
    });
  });
});
