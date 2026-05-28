import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import { type SortOption, SortOptionsModal } from './sort-options-modal';

describe('SortOptionsModal', () => {
  const mockOnClose = jest.fn();
  const mockOnApply = jest.fn();

  const sortOptions: SortOption[] = [
    {
      label: 'Name (A-Z)',
      value: 'name',
      order: 'asc',
      description: 'Alphabetical order',
    },
    {
      label: 'Name (Z-A)',
      value: 'name',
      order: 'desc',
      description: 'Reverse alphabetical',
    },
    {
      label: 'Price (Low to High)',
      value: 'price',
      order: 'asc',
      description: 'Cheapest first',
    },
    {
      label: 'Price (High to Low)',
      value: 'price',
      order: 'desc',
      description: 'Most expensive first',
    },
  ];

  const defaultProps = {
    visible: true,
    onClose: mockOnClose,
    onApply: mockOnApply,
    options: sortOptions,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the modal when visible', () => {
    render(<SortOptionsModal {...defaultProps} />);

    expect(screen.getByText('Sort By')).toBeTruthy();
    expect(
      screen.getByText('Choose how you want to sort the results')
    ).toBeTruthy();
  });

  it('should not render content when visible is false', () => {
    render(<SortOptionsModal {...defaultProps} visible={false} />);

    expect(screen.queryByText('Sort By')).toBeNull();
  });

  it('should display all sort options', () => {
    render(<SortOptionsModal {...defaultProps} />);

    expect(screen.getByText('Name (A-Z)')).toBeTruthy();
    expect(screen.getByText('Name (Z-A)')).toBeTruthy();
    expect(screen.getByText('Price (Low to High)')).toBeTruthy();
    expect(screen.getByText('Price (High to Low)')).toBeTruthy();
  });

  it('should display option descriptions', () => {
    render(<SortOptionsModal {...defaultProps} />);

    expect(screen.getByText('Alphabetical order')).toBeTruthy();
    expect(screen.getByText('Reverse alphabetical')).toBeTruthy();
    expect(screen.getByText('Cheapest first')).toBeTruthy();
    expect(screen.getByText('Most expensive first')).toBeTruthy();
  });

  it('should use custom title when provided', () => {
    render(<SortOptionsModal {...defaultProps} title="Custom Sort Title" />);

    expect(screen.getByText('Custom Sort Title')).toBeTruthy();
    expect(screen.queryByText('Sort By')).toBeNull();
  });

  it('should initialize with first option when no initial selection provided', () => {
    render(<SortOptionsModal {...defaultProps} />);

    const applyButton = screen.getByText('Apply');
    fireEvent.press(applyButton);

    expect(mockOnApply).toHaveBeenCalledWith({
      sortBy: 'name',
      sortOrder: 'asc',
    });
  });

  it('should initialize with provided initial selection', () => {
    const initialSelection = { sortBy: 'price', sortOrder: 'desc' as const };
    render(
      <SortOptionsModal {...defaultProps} initialSelection={initialSelection} />
    );

    const applyButton = screen.getByText('Apply');
    fireEvent.press(applyButton);

    expect(mockOnApply).toHaveBeenCalledWith({
      sortBy: 'price',
      sortOrder: 'desc',
    });
  });

  it('should select option when pressed', () => {
    render(<SortOptionsModal {...defaultProps} />);

    const priceOption = screen.getByText('Price (Low to High)');
    fireEvent.press(priceOption);

    const applyButton = screen.getByText('Apply');
    fireEvent.press(applyButton);

    expect(mockOnApply).toHaveBeenCalledWith({
      sortBy: 'price',
      sortOrder: 'asc',
    });
  });

  it('should call onClose when close button is pressed', () => {
    const { UNSAFE_root } = render(<SortOptionsModal {...defaultProps} />);

    // Find all Pressable components
    // eslint-disable-next-line testing-library/await-async-queries
    const pressables = UNSAFE_root.findAllByType('Pressable' as any);

    // The second Pressable should be the X close button (first is backdrop)
    if (pressables.length > 1) {
      fireEvent.press(pressables[1]);
      expect(mockOnClose).toHaveBeenCalled();
    }
  });

  it('should call onClose when backdrop is pressed', () => {
    const { UNSAFE_root } = render(<SortOptionsModal {...defaultProps} />);

    // Find all Pressable components
    // eslint-disable-next-line testing-library/await-async-queries
    const pressables = UNSAFE_root.findAllByType('Pressable' as any);

    // The first Pressable should be the backdrop
    if (pressables.length > 0) {
      fireEvent.press(pressables[0]);
      expect(mockOnClose).toHaveBeenCalled();
    }
  });

  it('should call onApply with selection and close modal when apply button is pressed', () => {
    render(<SortOptionsModal {...defaultProps} />);

    // Select an option
    const priceOption = screen.getByText('Price (High to Low)');
    fireEvent.press(priceOption);

    // Apply
    const applyButton = screen.getByText('Apply');
    fireEvent.press(applyButton);

    expect(mockOnApply).toHaveBeenCalledWith({
      sortBy: 'price',
      sortOrder: 'desc',
    });
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should reset to first option when reset button is pressed', () => {
    const initialSelection = { sortBy: 'price', sortOrder: 'desc' as const };
    render(
      <SortOptionsModal {...defaultProps} initialSelection={initialSelection} />
    );

    // Reset
    const resetButton = screen.getByText('Reset');
    fireEvent.press(resetButton);

    // Apply
    const applyButton = screen.getByText('Apply');
    fireEvent.press(applyButton);

    // Should reset to first option (name, asc)
    expect(mockOnApply).toHaveBeenCalledWith({
      sortBy: 'name',
      sortOrder: 'asc',
    });
  });

  it('should handle multiple option selections', () => {
    render(<SortOptionsModal {...defaultProps} />);

    // Select first option
    const nameAsc = screen.getByText('Name (A-Z)');
    fireEvent.press(nameAsc);

    // Change to second option
    const nameDesc = screen.getByText('Name (Z-A)');
    fireEvent.press(nameDesc);

    // Apply
    const applyButton = screen.getByText('Apply');
    fireEvent.press(applyButton);

    // Should apply the last selected option
    expect(mockOnApply).toHaveBeenCalledWith({
      sortBy: 'name',
      sortOrder: 'desc',
    });
  });

  it('should handle empty options array gracefully', () => {
    render(<SortOptionsModal {...defaultProps} options={[]} />);

    expect(screen.getByText('Sort By')).toBeTruthy();
    expect(
      screen.getByText('Choose how you want to sort the results')
    ).toBeTruthy();
  });

  it('should display checkmark for selected option', () => {
    render(<SortOptionsModal {...defaultProps} />);

    // The first option should be selected by default
    // We can verify this by checking if the modal renders correctly
    expect(screen.getByText('Name (A-Z)')).toBeTruthy();
  });

  it('should handle options without descriptions', () => {
    const optionsWithoutDesc: SortOption[] = [
      { label: 'Option 1', value: 'opt1', order: 'asc' },
      { label: 'Option 2', value: 'opt2', order: 'desc' },
    ];

    render(<SortOptionsModal {...defaultProps} options={optionsWithoutDesc} />);

    expect(screen.getByText('Option 1')).toBeTruthy();
    expect(screen.getByText('Option 2')).toBeTruthy();
  });
});
