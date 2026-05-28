import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import type { Farm } from '@/types';

import { FarmCard } from './farm-card';

// Mock the farm API utilities
jest.mock('@/api/farms', () => ({
  formatFarmAddress: jest.fn(
    (farm) => `${farm.location.address.city}, ${farm.location.address.state}`
  ),
  formatBusinessHours: jest.fn(() => 'Mon-Fri 9AM-5PM'),
  isFarmOpen: jest.fn(() => true),
  getDeliveryMethodsText: jest.fn(() => 'Pickup & Delivery'),
  calculateDistance: jest.fn(() => 5.2),
}));

// Mock farm data factory
const createMockFarm = (overrides: Partial<Farm> = {}): Farm => {
  const baseFarm: Farm = {
    id: 'farm-1',
    ownerId: 'owner-1',
    name: 'Green Valley Farm',
    description: 'Fresh organic vegetables and fruits from our family farm',
    location: {
      coordinates: { latitude: 40.7128, longitude: -74.006 },
      address: {
        street: '123 Farm Road',
        city: 'Farmville',
        state: 'NY',
        zipCode: '12345',
        country: 'USA',
      },
      farmingArea: 10,
    },
    contactEmail: 'info@greenvalley.com',
    contactPhone: '+1-555-0123',
    deliveryMethods: ['pickup', 'farm_delivery'],
    verificationStatus: 'verified',
    deliveryZones: [
      {
        id: 'zone-1',
        farmId: 'farm-1',
        name: 'Downtown Area',
        area: {
          center: { latitude: 40.7128, longitude: -74.006 },
          radius: 5,
          name: 'Downtown Area',
        },
        deliveryFee: 5,
        estimatedDeliveryTime: 1,
        isActive: true,
        workingDays: [1, 2, 3, 4, 5],
        workingHours: {
          start: '09:00',
          end: '17:00',
        },
      },
    ],
    businessHours: {
      monday: { openTime: '09:00', closeTime: '17:00', isOpen: true },
      tuesday: { openTime: '09:00', closeTime: '17:00', isOpen: true },
      wednesday: { openTime: '09:00', closeTime: '17:00', isOpen: true },
      thursday: { openTime: '09:00', closeTime: '17:00', isOpen: true },
      friday: { openTime: '09:00', closeTime: '17:00', isOpen: true },
      saturday: { openTime: '10:00', closeTime: '15:00', isOpen: true },
      sunday: { openTime: '10:00', closeTime: '15:00', isOpen: false },
    },
    isActive: true,
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z',
  };

  return { ...baseFarm, ...overrides };
};

const mockFarm = createMockFarm();

const mockUserLocation = {
  latitude: 40.7589,
  longitude: -73.9851,
};

describe('FarmCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders farm information correctly', () => {
    render(<FarmCard farm={mockFarm} />);

    expect(screen.getByText('Green Valley Farm')).toBeTruthy();
    expect(
      screen.getByText(
        'Fresh organic vegetables and fruits from our family farm'
      )
    ).toBeTruthy();
    expect(screen.getByText('📍 Farmville, NY')).toBeTruthy();
    expect(screen.getByText('📞 +1-555-0123')).toBeTruthy();
  });

  it('shows open status when farm is open', () => {
    render(<FarmCard farm={mockFarm} />);

    expect(screen.getByText('Open Now')).toBeTruthy();
  });

  it('shows distance when user location is provided', () => {
    render(
      <FarmCard
        farm={mockFarm}
        showDistance={true}
        userLocation={mockUserLocation}
      />
    );

    expect(screen.getByText('• 5.2 km')).toBeTruthy();
  });

  it('calls onPress when card is pressed', () => {
    const onPress = jest.fn();
    render(<FarmCard farm={mockFarm} onPress={onPress} />);

    fireEvent.press(screen.getByText('Green Valley Farm'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('calls onViewProducts when View Products button is pressed', () => {
    const onViewProducts = jest.fn();
    render(<FarmCard farm={mockFarm} onViewProducts={onViewProducts} />);

    fireEvent.press(screen.getByText('View Products'));
    expect(onViewProducts).toHaveBeenCalledTimes(1);
  });

  it('calls onContact when Contact button is pressed', () => {
    const onContact = jest.fn();
    render(<FarmCard farm={mockFarm} onContact={onContact} />);

    fireEvent.press(screen.getByText('Contact'));
    expect(onContact).toHaveBeenCalledTimes(1);
  });

  it('renders compact variant correctly', () => {
    render(<FarmCard farm={mockFarm} variant="compact" />);

    expect(screen.getByText('Green Valley Farm')).toBeTruthy();
    expect(screen.getByText('Farmville, NY')).toBeTruthy();
    expect(screen.getByText('Open')).toBeTruthy();

    // Should not show action buttons in compact mode
    expect(screen.queryByText('View Products')).toBeNull();
    expect(screen.queryByText('Contact')).toBeNull();
  });

  it('renders detailed variant with additional information', () => {
    render(<FarmCard farm={mockFarm} variant="detailed" />);

    expect(screen.getByText('Delivery Areas:')).toBeTruthy();
    expect(screen.getByText('Downtown Area')).toBeTruthy();
    expect(screen.getByText('Active')).toBeTruthy();
    expect(screen.getByText('Status')).toBeTruthy();
  });

  it('hides action buttons when showActions is false', () => {
    render(<FarmCard farm={mockFarm} showActions={false} />);

    expect(screen.queryByText('View Products')).toBeNull();
    expect(screen.queryByText('Contact')).toBeNull();
  });

  it('handles farm without business hours', () => {
    const farmWithoutHours = {
      ...mockFarm,
      businessHours: {
        monday: { openTime: '00:00', closeTime: '00:00', isOpen: false },
        tuesday: { openTime: '00:00', closeTime: '00:00', isOpen: false },
        wednesday: { openTime: '00:00', closeTime: '00:00', isOpen: false },
        thursday: { openTime: '00:00', closeTime: '00:00', isOpen: false },
        friday: { openTime: '00:00', closeTime: '00:00', isOpen: false },
        saturday: { openTime: '00:00', closeTime: '00:00', isOpen: false },
        sunday: { openTime: '00:00', closeTime: '00:00', isOpen: false },
      },
    };
    render(<FarmCard farm={farmWithoutHours} />);

    expect(screen.getByText('Green Valley Farm')).toBeTruthy();
    // Should still render without crashing
  });

  it('handles farm without delivery zones', () => {
    const farmWithoutZones = { ...mockFarm, deliveryZones: [] };
    render(<FarmCard farm={farmWithoutZones} variant="detailed" />);

    expect(screen.queryByText('Delivery Areas:')).toBeNull();
    expect(screen.getByText('Green Valley Farm')).toBeTruthy();
  });

  it('shows closed status for inactive farm', () => {
    // Mock isFarmOpen to return false
    const { isFarmOpen } = require('@/api/farms');
    isFarmOpen.mockReturnValue(false);

    render(<FarmCard farm={mockFarm} />);

    expect(screen.getByText('Closed')).toBeTruthy();
  });
});
