import { useMemo } from 'react';

import { useAuth } from '@/lib/auth';
import type { UserRole } from '@/types';

/**
 * Hook for checking user authentication and role-based permissions
 */
export const useAuthPermissions = () => {
  const user = useAuth.use.user();
  const farm = useAuth.use.farm();
  const isAuthenticated = useAuth.use.status() === 'signIn';
  const hasPermission = useAuth.use.hasPermission();
  const hasFarmData = useAuth.use.hasFarmData();

  const permissions = useMemo(
    () => ({
      // Basic authentication
      isAuthenticated,

      // Role checks
      isConsumer: user?.role === 'consumer',
      isFarm: user?.role === 'farm',

      // Farm-specific checks
      hasFarmData: hasFarmData(),
      hasFarmProfile: user?.role === 'farm' && farm !== null,

      // Permission checker function
      hasPermission: (permission: string) => hasPermission(permission),

      // Role checker function
      hasRole: (role: UserRole) => user?.role === role,

      // Multiple role checker
      hasAnyRole: (roles: UserRole[]) =>
        user ? roles.includes(user.role) : false,

      // Permission array checker
      hasAllPermissions: (permissions: string[]) =>
        permissions.every((permission) => hasPermission(permission)),

      // Permission array checker (any)
      hasAnyPermission: (permissions: string[]) =>
        permissions.some((permission) => hasPermission(permission)),

      // Farm feature access
      canAccessFarmFeatures: user?.role === 'farm' && hasFarmData(),

      // Consumer feature access
      canAccessConsumerFeatures: user?.role === 'consumer',

      // Admin-like checks (if needed in future)
      canManageUsers: hasPermission('admin:users:manage'),
      canManageSystem: hasPermission('admin:system:manage'),
    }),
    [user, farm, isAuthenticated, hasPermission, hasFarmData]
  );

  return permissions;
};

/**
 * Hook specifically for farm permission checks
 */
export const useFarmPermissions = () => {
  const permissions = useAuthPermissions();

  return useMemo(
    () => ({
      // Basic farm access
      canAccessFarm: permissions.isFarm && permissions.hasFarmData,

      // Product management
      canCreateProducts: permissions.hasPermission('farm:products:create'),
      canUpdateProducts: permissions.hasPermission('farm:products:update'),
      canDeleteProducts: permissions.hasPermission('farm:products:delete'),
      canViewProducts: permissions.hasPermission('farm:products:view'),

      // Order management
      canViewOrders: permissions.hasPermission('farm:orders:view'),
      canUpdateOrders: permissions.hasPermission('farm:orders:update'),
      canManageOrders: permissions.hasPermission('farm:orders:manage'),

      // Farm profile management
      canUpdateFarmProfile: permissions.hasPermission('farm:profile:update'),
      canViewFarmAnalytics: permissions.hasPermission('farm:analytics:view'),

      // Delivery management
      canManageDelivery: permissions.hasPermission('farm:delivery:manage'),
      canViewDeliveryRoutes: permissions.hasPermission('farm:delivery:routes'),

      // General farm permissions
      isFarmOwner: permissions.isFarm && permissions.hasFarmData,

      // Helper functions
      hasPermission: permissions.hasPermission,
      hasAllPermissions: permissions.hasAllPermissions,
      hasAnyPermission: permissions.hasAnyPermission,
    }),
    [permissions]
  );
};

/**
 * Hook specifically for consumer permission checks
 */
export const useConsumerPermissions = () => {
  const permissions = useAuthPermissions();

  return useMemo(
    () => ({
      // Basic consumer access
      canAccessConsumerFeatures: permissions.isConsumer,

      // Shopping features
      canPlaceOrders: permissions.hasPermission('consumer:orders:create'),
      canViewOrders: permissions.hasPermission('consumer:orders:view'),
      canCancelOrders: permissions.hasPermission('consumer:orders:cancel'),

      // Profile management
      canUpdateProfile: permissions.hasPermission('consumer:profile:update'),
      canViewOrderHistory: permissions.hasPermission('consumer:orders:history'),

      // Reviews and ratings
      canWriteReviews: permissions.hasPermission('consumer:reviews:create'),
      canUpdateReviews: permissions.hasPermission('consumer:reviews:update'),

      // Wishlist and favorites
      canManageWishlist: permissions.hasPermission('consumer:wishlist:manage'),
      canManageFavorites: permissions.hasPermission(
        'consumer:favorites:manage'
      ),

      // General consumer permissions
      isConsumer: permissions.isConsumer,

      // Helper functions
      hasPermission: permissions.hasPermission,
      hasAllPermissions: permissions.hasAllPermissions,
      hasAnyPermission: permissions.hasAnyPermission,
    }),
    [permissions]
  );
};
