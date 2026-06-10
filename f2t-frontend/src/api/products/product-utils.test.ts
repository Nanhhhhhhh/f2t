import {
  filterProducts,
  formatPrice,
  formatPricePerUnit,
  formatUnit,
  getCategoryLabel,
  getFreshnessLabel,
  getProductAvailabilityStatus,
  isProductExpired,
  isProductFresh,
  isProductInSeason,
  searchProducts,
  sortProducts,
} from './index';

// Test helper functions
const setupMockDate = (dateString: string) => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date(dateString));
};

const teardownMockDate = () => {
  jest.useRealTimers();
};

// Test data
const mockSearchProducts = [
  {
    name: 'Organic Tomatoes',
    description: 'Fresh red tomatoes',
    category: 'leafy',
  },
  {
    name: 'Apple Juice',
    description: 'Sweet apple juice',
    category: 'beverages',
  },
  { name: 'Carrots', description: 'Orange carrots', category: 'leafy' },
];

const mockFilterProducts = [
  {
    name: 'Organic Tomatoes',
    category: 'leafy',
    price: 5.99,
    organicCertified: true,
    stockQuantity: 10,
  },
  {
    name: 'Regular Apples',
    category: 'fruit',
    price: 3.5,
    organicCertified: false,
    stockQuantity: 0,
  },
];

const mockSortProducts = [
  { name: 'Zucchini', price: 2.99, harvestDate: '2024-07-10' },
  { name: 'Apples', price: 4.99, harvestDate: '2024-07-15' },
  { name: 'Bananas', price: 1.99, harvestDate: '2024-07-12' },
];

describe('Product Utility Functions', () => {
  describe('formatPrice', () => {
    it('formats price correctly', () => {
      expect(formatPrice(10.99)).toBe('$10.99');
      expect(formatPrice(0)).toBe('$0.00');
      expect(formatPrice(1000)).toBe('$1,000.00');
    });
  });

  describe('formatUnit', () => {
    it('formats units correctly', () => {
      expect(formatUnit('lb')).toBe('pound');
      expect(formatUnit('kg')).toBe('kilogram');
      expect(formatUnit('each')).toBe('each');
      expect(formatUnit('unknown')).toBe('unknown');
    });
  });

  describe('formatPricePerUnit', () => {
    it('formats price per unit correctly', () => {
      expect(formatPricePerUnit(5.99, 'lb')).toBe('$5.99 per pound');
      expect(formatPricePerUnit(2.5, 'each')).toBe('$2.50 per each');
    });
  });

  describe('getCategoryLabel', () => {
    it('formats category labels correctly', () => {
      expect(getCategoryLabel('vegetables')).toBe('Vegetables');
      expect(getCategoryLabel('nuts_seeds')).toBe('Nuts & Seeds');
      expect(getCategoryLabel('unknown')).toBe('unknown');
    });
  });

  describe('isProductInSeason', () => {
    beforeEach(() => {
      setupMockDate('2024-07-15');
    });

    afterEach(() => {
      teardownMockDate();
    });

    it('returns true for products without seasonal availability', () => {
      expect(isProductInSeason({})).toBe(true);
    });

    it('returns true for products in season (same year)', () => {
      expect(
        isProductInSeason({
          seasonalAvailability: { startMonth: 5, endMonth: 9 },
        })
      ).toBe(true);
    });

    it('returns false for products out of season', () => {
      expect(
        isProductInSeason({
          seasonalAvailability: { startMonth: 10, endMonth: 12 },
        })
      ).toBe(false);
    });

    it('handles cross-year seasons correctly', () => {
      expect(
        isProductInSeason({
          seasonalAvailability: { startMonth: 11, endMonth: 2 },
        })
      ).toBe(false);
    });
  });

  describe('isProductFresh', () => {
    beforeEach(() => {
      setupMockDate('2024-07-15');
    });

    afterEach(() => {
      teardownMockDate();
    });

    it('returns false for products without harvest date', () => {
      expect(isProductFresh()).toBe(false);
    });

    it('returns true for recently harvested products', () => {
      expect(isProductFresh('2024-07-14')).toBe(true);
      expect(isProductFresh('2024-07-10')).toBe(true);
    });

    it('returns false for old products', () => {
      expect(isProductFresh('2024-07-01')).toBe(false);
    });
  });

  describe('isProductExpired', () => {
    beforeEach(() => {
      setupMockDate('2024-07-15');
    });

    afterEach(() => {
      teardownMockDate();
    });

    it('returns false for products without expiry date', () => {
      expect(isProductExpired()).toBe(false);
    });

    it('returns false for non-expired products', () => {
      expect(isProductExpired('2024-07-20')).toBe(false);
    });

    it('returns true for expired products', () => {
      expect(isProductExpired('2024-07-10')).toBe(true);
    });
  });

  describe('getProductAvailabilityStatus', () => {
    it('returns correct status for various product states', () => {
      expect(
        getProductAvailabilityStatus({
          stockQuantity: 10,
          isActive: false,
        })
      ).toBe('inactive');

      expect(
        getProductAvailabilityStatus({
          stockQuantity: 0,
          isActive: true,
        })
      ).toBe('out_of_stock');

      expect(
        getProductAvailabilityStatus({
          stockQuantity: 3,
          isActive: true,
        })
      ).toBe('low_stock');

      expect(
        getProductAvailabilityStatus({
          stockQuantity: 10,
          isActive: true,
        })
      ).toBe('available');
    });
  });

  describe('searchProducts', () => {
    it('returns all products for empty search', () => {
      expect(searchProducts(mockSearchProducts, '')).toEqual(
        mockSearchProducts
      );
      expect(searchProducts(mockSearchProducts, '   ')).toEqual(
        mockSearchProducts
      );
    });

    it('searches by name', () => {
      const result = searchProducts(mockSearchProducts, 'tomato');
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Organic Tomatoes');
    });

    it('searches by description', () => {
      const result = searchProducts(mockSearchProducts, 'sweet');
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Apple Juice');
    });

    it('searches by category', () => {
      const result = searchProducts(mockSearchProducts, 'vegetables');
      expect(result).toHaveLength(2);
    });
  });

  describe('filterProducts', () => {
    it('filters by category', () => {
      const result = filterProducts(mockFilterProducts, {
        category: 'leafy',
      });
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Organic Tomatoes');
    });

    it('filters by organic certification', () => {
      const result = filterProducts(mockFilterProducts, { organicOnly: true });
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Organic Tomatoes');
    });

    it('filters by stock availability', () => {
      const result = filterProducts(mockFilterProducts, { inStock: true });
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Organic Tomatoes');
    });
  });

  describe('sortProducts', () => {
    it('sorts by name', () => {
      const result = sortProducts(mockSortProducts, 'name');
      expect(result.map((p) => p.name)).toEqual([
        'Apples',
        'Bananas',
        'Zucchini',
      ]);
    });

    it('sorts by price', () => {
      const result = sortProducts(mockSortProducts, 'price');
      expect(result.map((p) => p.price)).toEqual([1.99, 2.99, 4.99]);
    });

    it('sorts in descending order', () => {
      const result = sortProducts(mockSortProducts, 'price', 'desc');
      expect(result.map((p) => p.price)).toEqual([4.99, 2.99, 1.99]);
    });
  });

  describe('getFreshnessLabel', () => {
    it('returns null when score is null or undefined', () => {
      expect(getFreshnessLabel(null)).toBeNull();
      expect(getFreshnessLabel(undefined)).toBeNull();
    });

    it('maps score >= 0.8 to the fresh tag', () => {
      const result = getFreshnessLabel(0.82);
      expect(result).toEqual({
        tag: 'fresh',
        label: 'Tươi',
        color: 'green',
        display: 'Tươi · 82%',
      });
    });

    it('maps score in [0.4, 0.8) to the aging tag', () => {
      const result = getFreshnessLabel(0.5);
      expect(result?.tag).toBe('aging');
      expect(result?.label).toBe('Hơi cũ');
      expect(result?.color).toBe('yellow');
      expect(result?.display).toBe('Hơi cũ · 50%');
    });

    it('maps score < 0.4 to the critical tag', () => {
      const result = getFreshnessLabel(0.2);
      expect(result?.tag).toBe('critical');
      expect(result?.label).toBe('Sắp hỏng');
      expect(result?.color).toBe('red');
      expect(result?.display).toBe('Sắp hỏng · 20%');
    });

    it('uses 0.8 and 0.4 as inclusive lower bounds', () => {
      expect(getFreshnessLabel(0.8)?.tag).toBe('fresh');
      expect(getFreshnessLabel(0.4)?.tag).toBe('aging');
    });
  });
});
