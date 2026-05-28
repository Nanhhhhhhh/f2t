// src/test-utils/index.tsx
// Standard test helpers for React Native component tests.

import React, { type ReactElement } from 'react';
import { render, type RenderOptions } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// ── Query wrapper ─────────────────────────────────────────────────────────────

function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 0,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

function TestProviders({ children }: { children: React.ReactNode }): ReactElement {
  const queryClient = createTestQueryClient();
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

// Custom render — wraps with all standard providers
function customRender(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) {
  return render(ui, { wrapper: TestProviders, ...options });
}

export * from '@testing-library/react-native';
export { customRender as render };

// ── Mock data factories ───────────────────────────────────────────────────────

export function mockId(): string {
  return Array.from({ length: 24 }, () =>
    Math.floor(Math.random() * 16).toString(16),
  ).join('');
}

export function mockUser(overrides?: Record<string, unknown>) {
  return {
    id: mockId(),
    email: 'user@example.com',
    firstName: 'Test',
    lastName: 'User',
    role: 'consumer' as const,
    emailVerified: false,
    phoneVerified: false,
    avatarUrl: null,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

export function mockFarm(overrides?: Record<string, unknown>) {
  return {
    id: mockId(),
    name: 'Test Farm',
    description: 'A test farm',
    ownerId: mockId(),
    isActive: true,
    deliveryMethods: ['delivery'],
    deliveryZones: [],
    logoUrl: null,
    coverImageUrl: null,
    location: { type: 'Point', coordinates: [106.6297, 10.8231] },
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

export function mockProduct(overrides?: Record<string, unknown>) {
  return {
    id: mockId(),
    farmId: mockId(),
    name: 'Test Product',
    description: 'A test product',
    category: 'vegetables',
    pricePerUnit: 50000,
    unit: 'kg',
    availableQuantity: 100,
    isOrganic: false,
    status: 'available',
    images: [],
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

export function mockOrder(overrides?: Record<string, unknown>) {
  return {
    id: mockId(),
    consumerId: mockId(),
    farmId: mockId(),
    items: [
      {
        productId: mockId(),
        productName: 'Test Product',
        quantity: 2,
        pricePerUnit: 50000,
        unit: 'kg',
      },
    ],
    status: 'pending',
    paymentStatus: 'pending',
    paymentMethod: 'cash',
    totalAmount: 100000,
    trackingSteps: [],
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

// ── Async helpers ─────────────────────────────────────────────────────────────

// Wait for all pending promises to resolve
export function flushPromises(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, 0));
}
