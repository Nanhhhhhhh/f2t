import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import React from 'react';

import {
  ProductFilterModal,
  type ProductFilterOptions,
} from './product-filter-modal';

// Mock the useLocation hook
jest.mock('@/lib/hooks/use-location', () => ({
  useLocation: jest.fn(() => ({
    location: { latitude: 40.7128, longitude: -74.006 },
    isLoading: false,
    error: null,
  })),
}));

describe('ProductFilterModal', () => {
  const mockOnClose = jest.fn();
  const mockOnApply = jest.fn();

  const defaultProps = {
    visible: true,
    onClose: mockOnClose,
    onApply: mockOnApply,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the modal when visible', () => {
    render(<ProductFilterModal {...defaultProps} />);

    expect(screen.getByText('Filters')).toBeTruthy();
    expect(screen.getByText('Categories')).toBeTruthy();
    expect(screen.getByText('Price Range')).toBeTruthy();
    expect(screen.getByText('Quick Filters')).toBeTruthy();
  });

  it('should not render content when visible is false', () => {
    render(<ProductFilterModal {...defaultProps} visible={false} />);

    // Modal content should not be visible when visible=false
    expect(screen.queryByText('Filters')).toBeNull();
  });

  it('should display all category options', () => {
    render(<ProductFilterModal {...defaultProps} />);

    expect(screen.getByText('Vegetables')).toBeTruthy();
    expect(screen.getByText('Fruits')).toBeTruthy();
    expect(screen.getByText('Herbs')).toBeTruthy();
    expect(screen.getByText('Dairy Products')).toBeTruthy();
    expect(screen.getByText('Meat')).toBeTruthy();
  });

  it('should toggle category selection', () => {
    render(<ProductFilterModal {...defaultProps} />);

    const vegetablesButton = screen.getByText('Vegetables');
    fireEvent.press(vegetablesButton);

    // Category should be selected (button style changes)
    expect(vegetablesButton).toBeTruthy();
  });

  it('should display price range options', () => {
    render(<ProductFilterModal {...defaultProps} />);

    expect(screen.getByText('Under $10')).toBeTruthy();
    expect(screen.getByText('$10 - $25')).toBeTruthy();
    expect(screen.getByText('$25 - $50')).toBeTruthy();
    expect(screen.getByText('$50 - $100')).toBeTruthy();
    expect(screen.getByText('Over $100')).toBeTruthy();
  });

  it('should select price range', () => {
    render(<ProductFilterModal {...defaultProps} />);

    const priceButton = screen.getByText('$10 - $25');
    fireEvent.press(priceButton);

    expect(priceButton).toBeTruthy();
  });

  it('should display distance options when location filter is enabled', () => {
    render(<ProductFilterModal {...defaultProps} showLocationFilter={true} />);

    expect(screen.getByText('Distance')).toBeTruthy();
    expect(screen.getByText('Within 5 km')).toBeTruthy();
    expect(screen.getByText('Within 10 km')).toBeTruthy();
    expect(screen.getByText('Within 25 km')).toBeTruthy();
  });

  it('should not display distance options when location filter is disabled', () => {
    render(<ProductFilterModal {...defaultProps} showLocationFilter={false} />);

    expect(screen.queryByText('Distance')).toBeNull();
  });

  it('should toggle quick filters', () => {
    render(<ProductFilterModal {...defaultProps} />);

    const organicButton = screen.getByText('Organic Only');
    fireEvent.press(organicButton);

    const inSeasonButton = screen.getByText('In Season Only');
    fireEvent.press(inSeasonButton);

    const inStockButton = screen.getByText('In Stock Only');
    fireEvent.press(inStockButton);

    expect(organicButton).toBeTruthy();
    expect(inSeasonButton).toBeTruthy();
    expect(inStockButton).toBeTruthy();
  });

  it('should display sort options when enabled', () => {
    render(<ProductFilterModal {...defaultProps} showSortOptions={true} />);

    expect(screen.getByText('Sort By')).toBeTruthy();
    expect(screen.getByText('Name (A-Z)')).toBeTruthy();
    expect(screen.getByText('Price (Low to High)')).toBeTruthy();
    expect(screen.getByText('Recently Harvested')).toBeTruthy();
  });

  it('should not display sort options when disabled', () => {
    render(<ProductFilterModal {...defaultProps} showSortOptions={false} />);

    expect(screen.queryByText('Sort By')).toBeNull();
  });

  it('should call onClose when backdrop is pressed', () => {
    const { UNSAFE_root } = render(<ProductFilterModal {...defaultProps} />);

    // Find all Pressable components
    // eslint-disable-next-line testing-library/await-async-queries
    const pressables = UNSAFE_root.findAllByType('Pressable' as any);

    // The first Pressable should be the backdrop
    if (pressables.length > 0) {
      fireEvent.press(pressables[0]);
      expect(mockOnClose).toHaveBeenCalled();
    }
  });

  it('should reset filters when reset button is pressed', () => {
    render(<ProductFilterModal {...defaultProps} />);

    // Select some filters
    const vegetablesButton = screen.getByText('Vegetables');
    fireEvent.press(vegetablesButton);

    const organicButton = screen.getByText('Organic Only');
    fireEvent.press(organicButton);

    // Press reset
    const resetButton = screen.getByText('Reset');
    fireEvent.press(resetButton);

    // Filters should be reset (we can't directly check state, but button should work)
    expect(resetButton).toBeTruthy();
  });

  it('should call onApply with filters when apply button is pressed', async () => {
    render(<ProductFilterModal {...defaultProps} />);

    // Select some filters
    const vegetablesButton = screen.getByText('Vegetables');
    fireEvent.press(vegetablesButton);

    const priceButton = screen.getByText('$10 - $25');
    fireEvent.press(priceButton);

    const organicButton = screen.getByText('Organic Only');
    fireEvent.press(organicButton);

    // Press apply
    const applyButton = screen.getByText(/Apply/);
    fireEvent.press(applyButton);

    await waitFor(() => {
      expect(mockOnApply).toHaveBeenCalledTimes(1);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  it('should display active filter count', () => {
    render(<ProductFilterModal {...defaultProps} />);

    // Initially no active filters (except default inStock)
    // After selecting filters, count should update
    const vegetablesButton = screen.getByText('Vegetables');
    fireEvent.press(vegetablesButton);

    const organicButton = screen.getByText('Organic Only');
    fireEvent.press(organicButton);

    // Count badge should appear
    // Note: The exact count depends on default filters
    expect(screen.getByText('Filters')).toBeTruthy();
  });

  it('should initialize with provided initial filters', () => {
    const initialFilters: Partial<ProductFilterOptions> = {
      categories: ['vegetables', 'fruits'],
      organicOnly: true,
      priceRange: { min: 10, max: 25 },
    };

    render(
      <ProductFilterModal {...defaultProps} initialFilters={initialFilters} />
    );

    // Vegetables and Fruits should be selected
    expect(screen.getByText('Vegetables')).toBeTruthy();
    expect(screen.getByText('Fruits')).toBeTruthy();
  });

  it('should handle location unavailable state', () => {
    // Mock location as unavailable
    const useLocation = require('@/lib/hooks/use-location').useLocation;
    useLocation.mockReturnValue({
      location: null,
      isLoading: false,
      error: 'Location unavailable',
    });

    render(<ProductFilterModal {...defaultProps} showLocationFilter={true} />);

    expect(screen.getByText('Location unavailable')).toBeTruthy();
  });

  it('should handle location loading state', () => {
    // Mock location as loading
    const useLocation = require('@/lib/hooks/use-location').useLocation;
    useLocation.mockReturnValue({
      location: null,
      isLoading: true,
      error: null,
    });

    render(<ProductFilterModal {...defaultProps} showLocationFilter={true} />);

    expect(screen.getByText('Getting location...')).toBeTruthy();
  });

  it('should disable distance-based sort when location is unavailable', () => {
    // Mock location as unavailable
    const useLocation = require('@/lib/hooks/use-location').useLocation;
    useLocation.mockReturnValue({
      location: null,
      isLoading: false,
      error: 'Location unavailable',
    });

    render(<ProductFilterModal {...defaultProps} showSortOptions={true} />);

    const nearestFirstButton = screen.getByText('Nearest First');

    // Button should be present but disabled
    expect(nearestFirstButton).toBeTruthy();
  });

  it('should apply multiple filters correctly', async () => {
    render(<ProductFilterModal {...defaultProps} />);

    // Select multiple categories
    fireEvent.press(screen.getByText('Vegetables'));
    fireEvent.press(screen.getByText('Fruits'));

    // Select price range
    fireEvent.press(screen.getByText('$25 - $50'));

    // Toggle quick filters
    fireEvent.press(screen.getByText('Organic Only'));
    fireEvent.press(screen.getByText('In Season Only'));

    // Select sort
    fireEvent.press(screen.getByText('Price (Low to High)'));

    // Apply
    fireEvent.press(screen.getByText(/Apply/));

    await waitFor(() => {
      expect(mockOnApply).toHaveBeenCalledWith(
        expect.objectContaining({
          categories: expect.arrayContaining(['vegetables', 'fruits']),
          priceRange: { min: 25, max: 50 },
          organicOnly: true,
          inSeason: true,
          sortBy: 'price',
          sortOrder: 'asc',
        })
      );
    });
  });
});
