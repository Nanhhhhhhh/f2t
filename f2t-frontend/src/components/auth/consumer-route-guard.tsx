import React from 'react';

import type { RouteGuardProps } from './route-guard';
import { RouteGuard } from './route-guard';

export type ConsumerRouteGuardProps = Omit<
  RouteGuardProps,
  'allowedRoles' | 'requireFarmData'
> & {
  requiredConsumerPermissions?: string[];
};

export const ConsumerRouteGuard = ({
  children,
  requiredConsumerPermissions = [],
  requiredPermissions = [],
  ...props
}: ConsumerRouteGuardProps) => {
  // Combine consumer-specific permissions with any additional permissions
  const allRequiredPermissions = [
    ...requiredPermissions,
    ...requiredConsumerPermissions,
  ];

  return (
    <RouteGuard
      allowedRoles={['consumer']}
      requireFarmData={false}
      requiredPermissions={allRequiredPermissions}
      {...props}
    >
      {children}
    </RouteGuard>
  );
};
