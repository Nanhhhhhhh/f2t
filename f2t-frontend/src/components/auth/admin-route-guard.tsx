import React from 'react';

import type { RouteGuardProps } from './route-guard';
import { RouteGuard } from './route-guard';

export type AdminRouteGuardProps = Omit<
  RouteGuardProps,
  'allowedRoles' | 'requireFarmData'
>;

export const AdminRouteGuard = ({
  children,
  requiredPermissions = [],
  ...props
}: AdminRouteGuardProps) => {
  return (
    <RouteGuard
      allowedRoles={['admin']}
      requireFarmData={false}
      requiredPermissions={requiredPermissions}
      {...props}
    >
      {children}
    </RouteGuard>
  );
};
