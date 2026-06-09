import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { CrossSell } from './cross-sell';

const mockAddItem = jest.fn();
jest.mock('@/lib/cart', () => ({ useCart: () => ({ addItem: mockAddItem }) }));

const mockUse = jest.fn();
jest.mock('@/api/recommendations/use-cross-sell', () => ({
  useCrossSell: (args: any) => mockUse(args),
}));

describe('CrossSell', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders nothing when no recommendations', () => {
    mockUse.mockReturnValue({ data: { success: true, data: [] }, isLoading: false });
    const { toJSON } = render(<CrossSell productIds={['p1']} />);
    expect(toJSON()).toBeNull();
  });

  it('renders products and adds to cart on press', () => {
    mockUse.mockReturnValue({
      data: { success: true, data: [{ id: 'p2', name: 'Rau mùi', pricePerUnit: 10000 }] },
      isLoading: false,
    });
    render(<CrossSell productIds={['p1']} />);
    expect(screen.getByText('Rau mùi')).toBeTruthy();
    fireEvent.press(screen.getByTestId('cross-sell-add-p2'));
    expect(mockAddItem).toHaveBeenCalled();
  });
});
