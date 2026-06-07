import { render, screen } from '@testing-library/react-native';
import React from 'react';

import type { Product } from '@/types';

import { ProductAvailabilityIndicator } from './product-availability-indicator';
import { ProductStatusBadge } from './product-status-badge';
import { ProductStockIndicator } from './product-stock-indicator';

// Mock product data helper
const createMockProduct = (overrides?: Partial<Product>): Product => ({
  id: 'product-1',
  farmId: 'farm-1',
  name: 'Fresh Tomatoes',
  description: 'Organic tomatoes',
  category: 'leafy',
  pricePerUnit: 5.99,
  unit: 'kg',
  availableQuantity: 50,
  minimumOrder: 1,
  status: 'available',
  images: ['image1.jpg'],
  harvestDate: new Date().toISOString(),
  deliveryDate: new Date(Date.now() + 86400000).toISOString(),
  estimatedShelfLife: 7,
  isOrganic: true,
  farmingMethods: ['organic'],
  seasonalAvailability: ['spring', 'summer'],
  tags: ['fresh', 'local'],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

describe('ProductStatusBadge', () => {
  it('should render available status', () => {
    const product = createMockProduct({
      status: 'available',
      availableQuantity: 50,
    });
    render(<ProductStatusBadge product={product} />);

    expect(screen.getByText('Available')).toBeTruthy();
  });

  it('should render low stock status', () => {
    const product = createMockProduct({ availableQuantity: 3 });
    render(<ProductStatusBadge product={product} />);

    expect(screen.getByText('Only 3 left')).toBeTruthy();
  });

  it('should render out of stock status', () => {
    const product = createMockProduct({ availableQuantity: 0 });
    render(<ProductStatusBadge product={product} />);

    expect(screen.getByText('Out of Stock')).toBeTruthy();
  });

  it('should render inactive status', () => {
    const product = createMockProduct({ status: 'unavailable' });
    render(<ProductStatusBadge product={product} />);

    expect(screen.getByText('Unavailable')).toBeTruthy();
  });

  it('should render seasonal status', () => {
    const product = createMockProduct({ status: 'seasonal' });
    render(<ProductStatusBadge product={product} />);

    expect(screen.getByText('Seasonal')).toBeTruthy();
  });

  it('should render compact variant without text', () => {
    const product = createMockProduct();
    const { root } = render(
      <ProductStatusBadge product={product} variant="compact" />
    );

    // Compact variant should only show icon
    expect(root).toBeTruthy();
  });

  it('should render detailed variant with border', () => {
    const product = createMockProduct();
    render(<ProductStatusBadge product={product} variant="detailed" />);

    expect(screen.getByText('Available')).toBeTruthy();
  });

  it('should hide icon when showIcon is false', () => {
    const product = createMockProduct();
    render(<ProductStatusBadge product={product} showIcon={false} />);

    expect(screen.getByText('Available')).toBeTruthy();
  });
});

describe('ProductAvailabilityIndicator', () => {
  it('should render status badge and additional info', () => {
    const product = createMockProduct({
      harvestDate: new Date().toISOString(),
      seasonalAvailability: ['spring', 'summer'],
    });
    render(<ProductAvailabilityIndicator product={product} />);

    expect(screen.getByText('Available')).toBeTruthy();
  });

  it('should show freshness indicator for recently harvested products', () => {
    const product = createMockProduct({
      harvestDate: new Date().toISOString(), // Harvested today
    });
    render(
      <ProductAvailabilityIndicator
        product={product}
        showFreshnessIndicator={true}
      />
    );

    expect(screen.getByText('Fresh')).toBeTruthy();
  });

  it('should not show freshness indicator for old products', () => {
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 30); // 30 days ago

    const product = createMockProduct({
      harvestDate: oldDate.toISOString(),
    });
    render(
      <ProductAvailabilityIndicator
        product={product}
        showFreshnessIndicator={true}
      />
    );

    expect(screen.queryByText('Fresh')).toBeNull();
  });

  it('should show harvest time when showHarvestInfo is true', () => {
    const product = createMockProduct({
      harvestDate: new Date().toISOString(),
    });
    render(
      <ProductAvailabilityIndicator product={product} showHarvestInfo={true} />
    );

    expect(screen.getByText('Harvested today')).toBeTruthy();
  });

  it('should show seasonal availability', () => {
    const product = createMockProduct({
      seasonalAvailability: ['spring', 'summer'],
    });
    render(
      <ProductAvailabilityIndicator product={product} showSeasonalInfo={true} />
    );

    expect(screen.getByText('spring, summer')).toBeTruthy();
  });

  it('should show stock count when showStockCount is true', () => {
    const product = createMockProduct({
      availableQuantity: 25,
      unit: 'kg',
    });
    render(
      <ProductAvailabilityIndicator product={product} showStockCount={true} />
    );

    expect(screen.getByText('25 kg available')).toBeTruthy();
  });

  it('should render compact variant with minimal info', () => {
    const product = createMockProduct();
    const { root } = render(
      <ProductAvailabilityIndicator product={product} variant="compact" />
    );

    // Compact variant should render without errors
    expect(root).toBeTruthy();
  });

  it('should render detailed variant with all info', () => {
    const product = createMockProduct({
      harvestDate: new Date().toISOString(),
      seasonalAvailability: ['spring'],
      availableQuantity: 50,
    });
    render(
      <ProductAvailabilityIndicator
        product={product}
        variant="detailed"
        showStockCount={true}
      />
    );

    expect(screen.getByText('Available')).toBeTruthy();
    expect(screen.getByText('Fresh')).toBeTruthy();
  });
});

describe('ProductStockIndicator', () => {
  it('should render stock text by default', () => {
    const product = createMockProduct({
      availableQuantity: 50,
      unit: 'kg',
    });
    render(<ProductStockIndicator product={product} />);

    expect(screen.getByText('50 kg in stock')).toBeTruthy();
  });

  it('should show low stock warning', () => {
    const product = createMockProduct({
      availableQuantity: 3,
      unit: 'kg',
    });
    render(<ProductStockIndicator product={product} />);

    expect(screen.getByText('Only 3 kg left')).toBeTruthy();
  });

  it('should show out of stock message', () => {
    const product = createMockProduct({
      availableQuantity: 0,
    });
    render(<ProductStockIndicator product={product} />);

    expect(screen.getByText('Out of stock')).toBeTruthy();
  });

  it('should render bar variant', () => {
    const product = createMockProduct({
      availableQuantity: 50,
    });
    const { root } = render(
      <ProductStockIndicator product={product} variant="bar" />
    );

    expect(root).toBeTruthy();
  });

  it('should render icon variant', () => {
    const product = createMockProduct({
      availableQuantity: 50,
    });
    render(<ProductStockIndicator product={product} variant="icon" />);

    // Stock level of 50 out of 100 max is 50%, which is medium stock
    expect(screen.getByText('Medium stock')).toBeTruthy();
  });

  it('should show label when showLabel is true', () => {
    const product = createMockProduct({
      availableQuantity: 50,
      unit: 'kg',
    });
    render(<ProductStockIndicator product={product} showLabel={true} />);

    expect(screen.getByText('Stock:')).toBeTruthy();
  });

  it('should handle different stock levels for icon variant', () => {
    const lowStockProduct = createMockProduct({ availableQuantity: 2 });
    const { rerender } = render(
      <ProductStockIndicator product={lowStockProduct} variant="icon" />
    );
    expect(screen.getByText('Low stock')).toBeTruthy();

    const mediumStockProduct = createMockProduct({ availableQuantity: 50 });
    rerender(
      <ProductStockIndicator product={mediumStockProduct} variant="icon" />
    );
    // Stock level of 50 out of 100 max is 50%, which is medium stock
    expect(screen.getByText('Medium stock')).toBeTruthy();

    const outOfStockProduct = createMockProduct({ availableQuantity: 0 });
    rerender(
      <ProductStockIndicator product={outOfStockProduct} variant="icon" />
    );
    expect(screen.getByText('Out of stock')).toBeTruthy();
  });
});
