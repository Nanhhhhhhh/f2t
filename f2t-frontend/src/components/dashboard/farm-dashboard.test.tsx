import { render, screen } from '@testing-library/react-native';
import React from 'react';

import { FarmDashboard } from './farm-dashboard';

// Mock dependencies
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

jest.mock('@/lib/auth', () => ({
  useAuth: {
    use: {
      farm: () => ({
        id: 'farm_123',
        name: 'Test Farm',
        description: 'A test farm',
      }),
    },
  },
}));

jest.mock('@/api/farms', () => ({
  useGetFarm: () => ({
    data: {
      success: true,
      data: {
        id: 'farm_123',
        name: 'Test Farm',
        description: 'A test farm for testing',
        location: {
          address: {
            city: 'Test City',
            state: 'Test State',
          },
        },
        isActive: true,
      },
    },
    isLoading: false,
    error: null,
    refetch: jest.fn(),
  }),
  useFarmAnalytics: () => ({
    data: {
      success: true,
      data: {
        totalOrders: 25,
        totalRevenue: 1250.5,
        averageOrderValue: 50.02,
        topProducts: [],
        customerMetrics: {
          totalCustomers: 42,
          newCustomers: 8,
          returningCustomers: 34,
        },
        deliveryMetrics: {
          pickupOrders: 15,
          deliveryOrders: 10,
          averageDeliveryTime: 45,
        },
      },
    },
    isLoading: false,
    error: null,
  }),
}));

describe('FarmDashboard', () => {
  it('renders the dashboard header', () => {
    render(<FarmDashboard />);

    expect(screen.getByText('Farm Dashboard')).toBeTruthy();
    expect(screen.getByText('Test Farm')).toBeTruthy();
  });

  it('renders quick actions section', () => {
    render(<FarmDashboard />);

    expect(screen.getByText('Quick Actions')).toBeTruthy();
    expect(screen.getByText('View Profile')).toBeTruthy();
    expect(screen.getByText('Edit Profile')).toBeTruthy();
    expect(screen.getByText('Products')).toBeTruthy();
    expect(screen.getByText('Orders')).toBeTruthy();
    expect(screen.getByText('Analytics')).toBeTruthy();
  });

  it('renders quick stats section', () => {
    render(<FarmDashboard />);

    expect(screen.getByText('Quick Stats')).toBeTruthy();
    expect(screen.getByText('Total Orders')).toBeTruthy();
    expect(screen.getByText('Revenue')).toBeTruthy();
    expect(screen.getByText('Avg Order Value')).toBeTruthy();
    expect(screen.getByText('Total Customers')).toBeTruthy();
  });

  it('renders recent orders section', () => {
    render(<FarmDashboard />);

    expect(screen.getByText('Recent Orders')).toBeTruthy();
  });

  it('renders product management section', () => {
    render(<FarmDashboard />);

    expect(screen.getByText('Product Management')).toBeTruthy();
    expect(screen.getByText('Add Product')).toBeTruthy();
  });
});
