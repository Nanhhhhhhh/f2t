import { act, renderHook } from '@testing-library/react-native';

import { getCurrentFarm, signIn, signOut, updateFarm, useAuth } from './index';
import type { AuthFarmData, AuthUserData } from './utils';

// Mock MMKV
jest.mock('react-native-mmkv', () => ({
  MMKV: jest.fn(() => ({
    getString: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
  })),
}));

describe('Enhanced Auth Store', () => {
  const mockUser: AuthUserData = {
    id: '1',
    email: 'farm@example.com',
    firstName: 'John',
    lastName: 'Farmer',
    phoneNumber: '+1234567890',
    role: 'farm',
    status: 'active',
    createdAt: '2023-01-01',
    updatedAt: '2023-01-01',
    permissions: ['farm:products:create', 'farm:orders:view'],
    emailVerified: true,
    phoneVerified: true,
    farmId: 'farm-1',
  };

  const mockFarm: AuthFarmData = {
    id: 'farm-1',
    ownerId: '1',
    name: 'Green Valley Farm',
    description: 'Organic vegetables and fruits',
    location: {
      coordinates: { latitude: 40.7128, longitude: -74.006 },
      address: {
        street: '123 Farm Road',
        city: 'Farmville',
        state: 'NY',
        zipCode: '12345',
        country: 'USA',
        formattedAddress: '123 Farm Road, Farmville, NY 12345, USA',
      },
      farmingArea: 25,
      organicCertified: true,
    },
    verificationStatus: 'verified',
    contactEmail: 'contact@greenvalley.com',
    contactPhone: '+1234567890',
    deliveryMethods: ['pickup', 'farm_delivery'],
    deliveryZones: [],
    businessHours: {
      monday: { isOpen: true, openTime: '08:00', closeTime: '17:00' },
      tuesday: { isOpen: true, openTime: '08:00', closeTime: '17:00' },
      wednesday: { isOpen: true, openTime: '08:00', closeTime: '17:00' },
      thursday: { isOpen: true, openTime: '08:00', closeTime: '17:00' },
      friday: { isOpen: true, openTime: '08:00', closeTime: '17:00' },
      saturday: { isOpen: true, openTime: '09:00', closeTime: '15:00' },
      sunday: { isOpen: false, openTime: '00:00', closeTime: '00:00' },
    },
    isActive: true,
    createdAt: '2023-01-01',
    updatedAt: '2023-01-01',
  };

  beforeEach(() => {
    // Reset auth state
    act(() => {
      signOut();
    });
  });

  it('should handle farm user sign in with farm data', () => {
    const { result } = renderHook(() => useAuth.use.user());

    act(() => {
      signIn({
        token: { access: 'access-token', refresh: 'refresh-token' },
        user: mockUser,
        farm: mockFarm,
      });
    });

    expect(result.current?.role).toBe('farm');
    expect(result.current?.farmId).toBe('farm-1');
  });

  it('should store and retrieve farm data correctly', () => {
    const { result: farmResult } = renderHook(() => useAuth.use.farm());
    const { result: hasFarmResult } = renderHook(() =>
      useAuth.use.hasFarmData()
    );

    act(() => {
      signIn({
        token: { access: 'access-token', refresh: 'refresh-token' },
        user: mockUser,
        farm: mockFarm,
      });
    });

    expect(farmResult.current?.name).toBe('Green Valley Farm');
    expect(farmResult.current?.id).toBe('farm-1');
    expect(hasFarmResult.current()).toBe(true);
  });

  it('should handle consumer user sign in without farm data', () => {
    const consumerUser: AuthUserData = {
      ...mockUser,
      role: 'consumer',
      farmId: undefined,
    };

    const { result: farmResult } = renderHook(() => useAuth.use.farm());
    const { result: hasFarmResult } = renderHook(() =>
      useAuth.use.hasFarmData()
    );

    act(() => {
      signIn({
        token: { access: 'access-token', refresh: 'refresh-token' },
        user: consumerUser,
      });
    });

    expect(farmResult.current).toBeNull();
    expect(hasFarmResult.current()).toBe(false);
  });

  it('should update farm information correctly', () => {
    const { result: farmResult } = renderHook(() => useAuth.use.farm());

    act(() => {
      signIn({
        token: { access: 'access-token', refresh: 'refresh-token' },
        user: mockUser,
        farm: mockFarm,
      });
    });

    act(() => {
      updateFarm({
        name: 'Updated Farm Name',
        description: 'Updated description',
      });
    });

    expect(farmResult.current?.name).toBe('Updated Farm Name');
    expect(farmResult.current?.description).toBe('Updated description');
    expect(farmResult.current?.id).toBe('farm-1'); // Should preserve other data
  });

  it('should clear farm data on sign out', () => {
    const { result: farmResult } = renderHook(() => useAuth.use.farm());

    act(() => {
      signIn({
        token: { access: 'access-token', refresh: 'refresh-token' },
        user: mockUser,
        farm: mockFarm,
      });
    });

    expect(farmResult.current).toBeTruthy();

    act(() => {
      signOut();
    });

    expect(farmResult.current).toBeNull();
  });

  it('should provide correct farm info through getFarmInfo helper', () => {
    act(() => {
      signIn({
        token: { access: 'access-token', refresh: 'refresh-token' },
        user: mockUser,
        farm: mockFarm,
      });
    });

    const farmInfo = getCurrentFarm();
    expect(farmInfo?.name).toBe('Green Valley Farm');
    expect(farmInfo?.id).toBe('farm-1');
  });

  it('should return null farm info for consumer users', () => {
    const consumerUser: AuthUserData = {
      ...mockUser,
      role: 'consumer',
      farmId: undefined,
    };

    act(() => {
      signIn({
        token: { access: 'access-token', refresh: 'refresh-token' },
        user: consumerUser,
      });
    });

    const farmInfo = getCurrentFarm();
    expect(farmInfo).toBeNull();
  });
});
