import { type Href, useRouter } from 'expo-router';
import React, { useEffect } from 'react';

import { Button, Text, View } from '@/components/ui';
import { useAuth } from '@/lib';
import type { UserRole } from '@/types';

export type RouteGuardProps = {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  requiredPermissions?: string[];
  requireFarmData?: boolean;
  fallbackRoute?: string;
  showFallbackUI?: boolean;
  fallbackComponent?: React.ComponentType;
};

// Fallback components for different error states
const AccessDeniedScreen = ({
  allowedRoles,
  onGoBack,
}: {
  allowedRoles: string[];
  onGoBack: () => void;
}) => (
  <View className="flex-1 items-center justify-center p-6">
    <View className="mb-6 items-center">
      <Text className="mb-2 text-2xl">🚫</Text>
      <Text className="mb-4 text-center text-xl font-semibold">
        Access Denied
      </Text>
      <Text className="mb-6 max-w-sm text-center text-gray-600 dark:text-gray-400">
        You don&apos;t have permission to access this feature. This area is
        restricted to {allowedRoles.join(' and ')} users.
      </Text>
    </View>

    <Button label="Go Back" onPress={onGoBack} variant="outline" />
  </View>
);

const InsufficientPermissionsScreen = ({
  onGoBack,
}: {
  onGoBack: () => void;
}) => (
  <View className="flex-1 items-center justify-center p-6">
    <View className="mb-6 items-center">
      <Text className="mb-2 text-2xl">🔒</Text>
      <Text className="mb-4 text-center text-xl font-semibold">
        Insufficient Permissions
      </Text>
      <Text className="mb-6 max-w-sm text-center text-gray-600 dark:text-gray-400">
        You don&apos;t have the required permissions to access this feature.
      </Text>
    </View>

    <Button label="Go Back" onPress={onGoBack} variant="outline" />
  </View>
);

const FarmSetupRequiredScreen = ({
  onSetupFarm,
  onGoBack,
}: {
  onSetupFarm: () => void;
  onGoBack: () => void;
}) => (
  <View className="flex-1 items-center justify-center p-6">
    <View className="mb-6 items-center">
      <Text className="mb-2 text-2xl">🚜</Text>
      <Text className="mb-4 text-center text-xl font-semibold">
        Farm Setup Required
      </Text>
      <Text className="mb-6 max-w-sm text-center text-gray-600 dark:text-gray-400">
        You need to set up your farm profile to access this feature.
      </Text>
    </View>

    <View className="flex-row space-x-4">
      <Button label="Set Up Farm" onPress={onSetupFarm} className="flex-1" />
      <Button
        label="Go Back"
        onPress={onGoBack}
        variant="outline"
        className="flex-1"
      />
    </View>
  </View>
);

export const RouteGuard = ({
  children,
  allowedRoles,
  requiredPermissions = [],
  requireFarmData = false,
  fallbackRoute = '/login',
  showFallbackUI = true,
  fallbackComponent: FallbackComponent,
}: RouteGuardProps) => {
  const router = useRouter();
  const user = useAuth.use.user();
  const isAuthenticated = useAuth.use.status() === 'signIn';
  const hasPermission = useAuth.use.hasPermission();
  const hasFarmData = useAuth.use.hasFarmData();

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace(fallbackRoute as Href);
    }
  }, [isAuthenticated, router, fallbackRoute]);

  if (!isAuthenticated || !user) {
    return null;
  }

  // Check role permissions
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    if (FallbackComponent) return <FallbackComponent />;
    if (!showFallbackUI) return null;
    return (
      <AccessDeniedScreen
        allowedRoles={allowedRoles}
        onGoBack={() => router.back()}
      />
    );
  }

  // Check specific permissions
  for (const permission of requiredPermissions) {
    if (!hasPermission(permission)) {
      if (FallbackComponent) return <FallbackComponent />;
      if (!showFallbackUI) return null;
      return <InsufficientPermissionsScreen onGoBack={() => router.back()} />;
    }
  }

  // Check farm data requirement
  if (requireFarmData && !hasFarmData()) {
    if (FallbackComponent) return <FallbackComponent />;
    if (!showFallbackUI) return null;
    return (
      <FarmSetupRequiredScreen
        onSetupFarm={() => router.push('/farms/register' as Href)}
        onGoBack={() => router.back()}
      />
    );
  }

  return <>{children}</>;
};
