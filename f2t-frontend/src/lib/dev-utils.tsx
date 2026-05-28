import { signInBypass, signOut } from '@/lib/auth';
import type { AuthFarmData, AuthUserData, TokenType } from '@/lib/auth/utils';
import { Env } from '@/lib/env';

/**
 * Development utilities for testing and debugging
 * Only works in development environment
 */
export class DevUtils {
  /**
   * Check if currently in development mode
   */
  static isDevelopment(): boolean {
    return Env.APP_ENV === 'development';
  }

  /**
   * Log auth bypass information
   */
  static logBypassInfo(): void {
    if (!this.isDevelopment()) return;

  }

  /**
   * Quick login as consumer
   */
  static loginAsConsumer(): void {
    if (!this.isDevelopment()) {
      return;
    }

    signInBypass('consumer');
  }

  /**
   * Quick login as farm
   */
  static loginAsFarm(): void {
    if (!this.isDevelopment()) {
      return;
    }

    signInBypass('farm');
  }

  /**
   * Logout and reset auth state
   */
  static logout(): void {
    if (!this.isDevelopment()) {
      return;
    }

    signOut();
  }

  /**
   * Toggle between consumer and farm mode
   */
  static toggleUserMode(): void {
    if (!this.isDevelopment()) {
      return;
    }

    // Import auth state to check current user
    const { useAuth } = require('@/lib/auth');
    const user = useAuth.getState().user;

    if (user?.role === 'consumer') {
      this.loginAsFarm();
    } else {
      this.loginAsConsumer();
    }
  }

  /**
   * Print current user information
   */
  static printCurrentUser(): void {
    if (!this.isDevelopment()) return;

    const { useAuth } = require('@/lib/auth');
    const { user, farm, token } = useAuth.getState();

  }

  /**
   * Reset entire app state to initial state
   */
  static resetAppState(): void {
    if (!this.isDevelopment()) {
      return;
    }

    signOut();

    // Clear any other stores if needed
    // Example: clear first time flag, etc.
  }
}

// Mock data functions for testing
export function getMockToken(): TokenType {
  return {
    access: 'mock_access_token_' + Date.now(),
    refresh: 'mock_refresh_token_' + Date.now(),
  };
}

export function getMockConsumerUser(): AuthUserData {
  return {
    id: 'mock_consumer_' + Date.now(),
    email: 'consumer@example.com',
    firstName: 'Mock',
    lastName: 'Consumer',
    phoneNumber: '+1-555-0123',
    role: 'consumer',
    status: 'active',
    permissions: ['view_farms', 'place_orders', 'view_orders'],
    lastLoginAt: new Date().toISOString(),
    emailVerified: true,
    phoneVerified: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function getMockFarmUser(): AuthUserData {
  return {
    id: 'mock_farm_user_' + Date.now(),
    email: 'farm@example.com',
    firstName: 'Mock Farm',
    lastName: 'Owner',
    phoneNumber: '+1-555-0123',
    role: 'farm',
    status: 'active',
    permissions: [
      'manage_farm',
      'manage_products',
      'view_orders',
      'manage_orders',
    ],
    lastLoginAt: new Date().toISOString(),
    emailVerified: true,
    phoneVerified: true,
    farmId: 'mock_farm_' + Date.now(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function getMockFarmData(): AuthFarmData {
  return {
    id: 'mock_farm_' + Date.now(),
    ownerId: 'mock_farm_user_' + Date.now(),
    name: 'Mock Farm',
    description: 'A mock farm for testing purposes',
    location: {
      coordinates: { latitude: 37.7749, longitude: -122.4194 },
      address: {
        street: '123 Mock Farm Road',
        city: 'San Francisco',
        state: 'CA',
        zipCode: '94102',
        country: 'USA',
      },
      farmingArea: 50,
    },
    verificationStatus: 'verified',
    contactEmail: 'farm@example.com',
    contactPhone: '+1-555-0123',
    deliveryMethods: ['pickup', 'farm_delivery'],
    deliveryZones: [],
    businessHours: {
      monday: { openTime: '08:00', closeTime: '18:00', isOpen: true },
      tuesday: { openTime: '08:00', closeTime: '18:00', isOpen: true },
      wednesday: { openTime: '08:00', closeTime: '18:00', isOpen: true },
      thursday: { openTime: '08:00', closeTime: '18:00', isOpen: true },
      friday: { openTime: '08:00', closeTime: '18:00', isOpen: true },
      saturday: { openTime: '09:00', closeTime: '17:00', isOpen: true },
      sunday: { openTime: '10:00', closeTime: '16:00', isOpen: false },
    },
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Expose DevUtils to global scope for easy debugging
 * Only in development mode
 */
if (DevUtils.isDevelopment()) {
  // @ts-ignore
  global.DevUtils = DevUtils;
}
