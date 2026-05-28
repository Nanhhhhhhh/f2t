import React from 'react';

import type { RouteGuardProps } from './route-guard';
import { RouteGuard } from './route-guard';

/**
 * Higher-order component for adding authentication and authorization to any component
 */
export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  guardProps: Omit<RouteGuardProps, 'children'>
) {
  const displayName = Component.displayName || Component.name || 'Component';

  const WrappedComponent = (props: P) => {
    return (
      <RouteGuard {...guardProps}>
        <Component {...props} />
      </RouteGuard>
    );
  };

  WrappedComponent.displayName = `withAuth(${displayName})`;

  return WrappedComponent;
}

/**
 * HOC specifically for farm-only components
 */
export function withFarmAuth<P extends object>(
  Component: React.ComponentType<P>,
  options?: {
    requireFarmData?: boolean;
    requiredPermissions?: string[];
    fallbackRoute?: string;
  }
) {
  return withAuth(Component, {
    allowedRoles: ['farm'],
    requireFarmData: options?.requireFarmData ?? true,
    requiredPermissions: options?.requiredPermissions ?? [],
    fallbackRoute: options?.fallbackRoute ?? '/login',
  });
}

/**
 * HOC specifically for consumer-only components
 */
export function withConsumerAuth<P extends object>(
  Component: React.ComponentType<P>,
  options?: {
    requiredPermissions?: string[];
    fallbackRoute?: string;
  }
) {
  return withAuth(Component, {
    allowedRoles: ['consumer'],
    requireFarmData: false,
    requiredPermissions: options?.requiredPermissions ?? [],
    fallbackRoute: options?.fallbackRoute ?? '/login',
  });
}
