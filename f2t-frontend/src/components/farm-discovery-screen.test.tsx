import { render, screen } from '@testing-library/react-native';
import React from 'react';

import FarmDiscoveryScreen from '@/components/farms/farm-discovery-screen';

// Mock dependencies
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

jest.mock('expo-location', () => ({
  getForegroundPermissionsAsync: jest.fn(() =>
    Promise.resolve({ granted: false })
  ),
  requestForegroundPermissionsAsync: jest.fn(() =>
    Promise.resolve({ granted: true })
  ),
  getCurrentPositionAsync: jest.fn(() =>
    Promise.resolve({
      coords: { latitude: 37.7749, longitude: -122.4194 },
    })
  ),
  Accuracy: { Balanced: 4 },
}));

jest.mock('@/lib/auth', () => ({
  useAuth: {
    use: {
      user: () => ({ id: '1', role: 'consumer' }),
      isConsumer: () => true,
    },
  },
}));

// Mock farm data
const createMockFarm = () => ({
  id: '1',
  name: 'Test Farm',
  description: 'A test farm',
  location: {
    address: {
      street: '123 Farm St',
      city: 'Farmville',
      state: 'CA',
      zipCode: '12345',
    },
    coordinates: { latitude: 37.7749, longitude: -122.4194 },
  },
  contactPhone: '555-0123',
  deliveryMethods: ['pickup'],
  businessHours: {
    monday: { openTime: '09:00', closeTime: '17:00', isOpen: true },
    tuesday: { openTime: '09:00', closeTime: '17:00', isOpen: true },
    wednesday: { openTime: '09:00', closeTime: '17:00', isOpen: true },
    thursday: { openTime: '09:00', closeTime: '17:00', isOpen: true },
    friday: { openTime: '09:00', closeTime: '17:00', isOpen: true },
    saturday: { openTime: '09:00', closeTime: '17:00', isOpen: true },
    sunday: { openTime: '09:00', closeTime: '17:00', isOpen: false },
  },
  isActive: true,
  deliveryZones: [],
});

// Mock API response
const createMockApiResponse = () => ({
  data: {
    pages: [
      {
        success: true,
        data: {
          farms: [createMockFarm()],
          total: 1,
          page: 1,
          limit: 20,
          hasMore: false,
        },
      },
    ],
  },
  isLoading: false,
  error: null,
  refetch: jest.fn(),
  fetchNextPage: jest.fn(),
  hasNextPage: false,
  isFetchingNextPage: false,
});

jest.mock('@/api/farms', () => ({
  useGetFarms: () => createMockApiResponse(),
  isFarmOpen: jest.fn(() => true),
  calculateDistance: jest.fn(() => 5.2),
  formatFarmAddress: jest.fn(() => '123 Farm St, Farmville, CA, 12345'),
  formatBusinessHours: jest.fn(() => 'Mon-Sat 9:00 AM - 5:00 PM'),
  getDeliveryMethodsText: jest.fn(() => 'Farm Pickup'),
}));

describe('FarmDiscoveryScreen', () => {
  it('renders the discovery screen with header', () => {
    render(<FarmDiscoveryScreen />);

    expect(screen.getByText('Discover Farms')).toBeTruthy();
    expect(screen.getByText('Find fresh, local produce near you')).toBeTruthy();
  });

  it('shows farm count', () => {
    render(<FarmDiscoveryScreen />);

    expect(screen.getByText('1 farm found')).toBeTruthy();
  });

  it('renders location permission request when not granted', () => {
    render(<FarmDiscoveryScreen />);

    expect(screen.getByText('Enable Location for Better Results')).toBeTruthy();
    expect(screen.getByText('Enable Location')).toBeTruthy();
  });

  it('displays farm information', () => {
    render(<FarmDiscoveryScreen />);

    expect(screen.getByText('Test Farm')).toBeTruthy();
    expect(screen.getByText('A test farm')).toBeTruthy();
  });
});
