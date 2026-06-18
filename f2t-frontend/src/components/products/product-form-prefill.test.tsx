import { render, screen } from '@testing-library/react-native';
import React from 'react';

import { ProductForm } from './product-form';

// Mock chỉ API + side-effect modules. KHÔNG mock react-hook-form (cần RHF thật
// để kiểm tra defaultValues có prefill input không).
jest.mock('@/api/products', () => ({
  PRODUCT_CATEGORIES: { VEGETABLES: 'vegetables', FRUITS: 'fruits', HERBS: 'herbs' },
  getCategoryLabel: (c: string) => c,
  useCreateProduct: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useUpdateProduct: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));
jest.mock('@/types/constants', () => ({
  SEASONS: { SPRING: 'spring', SUMMER: 'summer', FALL: 'fall', WINTER: 'winter', YEAR_ROUND: 'year_round' },
}));
jest.mock('./image-picker', () => ({ ProductImagePicker: () => null }));
jest.mock('./nutritional-info-form', () => ({ NutritionalInfoForm: () => null }));

const mockProduct = {
  id: 'prod_123',
  farmId: 'farm_123',
  name: 'Organic Tomatoes',
  description: 'Fresh organic tomatoes',
  category: 'herbs' as const,
  pricePerUnit: 4.99,
  unit: 'kg' as const,
  availableQuantity: 25,
  minimumOrder: 1,
  status: 'available' as const,
  images: [],
  isOrganic: true,
  seasonalAvailability: [],
  tags: [],
} as any;

describe('ProductForm prefill (real react-hook-form)', () => {
  it('hiển thị giá trị product trong input khi edit', () => {
    render(<ProductForm product={mockProduct} farmId="farm_123" />);
    expect(screen.getByDisplayValue('Organic Tomatoes')).toBeTruthy();
    expect(screen.getByDisplayValue('Fresh organic tomatoes')).toBeTruthy();
    expect(screen.getByDisplayValue('4.99')).toBeTruthy();
  });
});
