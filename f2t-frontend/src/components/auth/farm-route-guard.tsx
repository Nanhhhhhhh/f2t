import React from 'react';

import type { RouteGuardProps } from './route-guard';
import { RouteGuard } from './route-guard';

export type FarmRouteGuardProps = Omit<RouteGuardProps, 'allowedRoles'> & {
  requireFarmData?: boolean;
  requiredFarmPermissions?: string[];
};

export const FarmRouteGuard = ({
  children,
  requireFarmData = true,
  requiredFarmPermissions = [],
  requiredPermissions = [],
  ...props
}: FarmRouteGuardProps) => {
  // Combine farm-specific permissions with any additional permissions
  const allRequiredPermissions = [
    ...requiredPermissions,
    ...requiredFarmPermissions,
  ];

  return (
    <RouteGuard
      allowedRoles={['farm']}
      requireFarmData={requireFarmData}
      requiredPermissions={allRequiredPermissions}
      {...props}
    >
      {children}
    </RouteGuard>
  );
};
