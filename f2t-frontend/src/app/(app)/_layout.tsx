import { Link, Redirect, SplashScreen, Tabs } from 'expo-router';
import React, { useCallback, useEffect, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import * as SafeAreaContext from 'react-native-safe-area-context';

import { Pressable, Text, View } from '@/components/ui';
import {
  Cart as CartIcon,
  Dashboard as DashboardIcon,
  Farm as FarmIcon,
  Feed as FeedIcon,
  Home as HomeIcon,
  Orders as OrdersIcon,
  Products as ProductsIcon,
  Settings as SettingsIcon,
} from '@/components/ui/icons';
import { useAuth, useDeveloperMode, useIsFirstTime } from '@/lib';
import { useCartItemCount } from '@/lib/cart';

// Hook for managing app initialization
const useAppInitialization = () => {
  const status = useAuth.use.status();
  const signInBypass = useAuth.use.signInBypass();
  const [isFirstTime, setIsFirstTime] = useIsFirstTime();
  const { shouldBypassLogin } = useDeveloperMode();
  const signOutAction = useAuth.use.signOut();

  const hideSplash = useCallback(async () => {
    await SplashScreen.hideAsync();
  }, []);

  useEffect(() => {
    if (status !== 'idle') {
      setTimeout(() => {
        hideSplash();
      }, 1000);
    }
  }, [hideSplash, status]);

  // Bypass login logic for development testing
  useEffect(() => {
    if (shouldBypassLogin && status === 'signOut') {
      // Default bypass as consumer, can change to 'farm' if need to test farm features
      signInBypass('consumer');
    }
  }, [shouldBypassLogin, status, signInBypass]);

  return { status, isFirstTime, shouldBypassLogin };
};

// Cart badge component
const CartBadge = ({ count }: { count: number }) => {
  if (count === 0) return null;

  return (
    <View className="absolute -right-1 -top-1 size-4 items-center justify-center rounded-full bg-red-500">
      <Text className="text-[10px] font-bold text-white">
        {count > 9 ? '9+' : count}
      </Text>
    </View>
  );
};

export default function TabLayout() {
  const { status, isFirstTime, shouldBypassLogin } = useAppInitialization();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const insets = SafeAreaContext.useSafeAreaInsets();

  const user = useAuth.use.user();
  const isUserFarm = user?.role === 'farm';
  const cartItemCount = useCartItemCount();

  const screenOptions = useMemo(
    () => ({
      tabBarActiveTintColor: '#3B82F6',
      tabBarInactiveTintColor: isDark ? '#6B7280' : '#9CA3AF',
      tabBarStyle: {
        backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: isDark ? '#374151' : '#E5E7EB',
        height: 60 + insets.bottom,
        paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
        paddingTop: 8,
      },
      tabBarLabelStyle: {
        fontSize: 12,
        fontWeight: '600' as const,
      },
      tabBarItemStyle: {
        paddingVertical: 4,
        height: 52,
      },
    }),
    [isDark, insets.bottom]
  );

  if (isFirstTime) {
    return <Redirect href="/onboarding" />;
  }

  // If bypass login is enabled, don't redirect to login screen
  if (status === 'signOut' && !shouldBypassLogin) {
    return <Redirect href="/login" />;
  }

  // Admin users should always use the dedicated admin interface
  if (user?.role === 'admin') {
    return <Redirect href="/admin" />;
  }

  return (
    <Tabs screenOptions={screenOptions}>
      {/* Home/Dashboard Tab - Different for consumer vs farm */}
      <Tabs.Screen
        name="index"
        options={{
          title: isUserFarm ? 'Dashboard' : 'Home',
          headerShown: false,
          tabBarIcon: ({ color }) => (
            <View style={{ width: 24, height: 24, alignItems: 'center', justifyContent: 'center' }}>
              {isUserFarm ? <DashboardIcon color={color} /> : <HomeIcon color={color} />}
            </View>
          ),
          tabBarButtonTestID: 'home-tab',
        }}
      />

      {/* Feed Tab - For everyone */}
      <Tabs.Screen
        name="feed"
        options={{
          title: 'Feed',
          headerShown: false,
          tabBarIcon: ({ color }) => (
            <View style={{ width: 24, height: 24, alignItems: 'center', justifyContent: 'center' }}>
              <FeedIcon color={color} />
            </View>
          ),
          tabBarButtonTestID: 'feed-tab',
        }}
      />

      {/* Farms Tab - Browse local farms */}
      <Tabs.Screen
        name="farms"
        options={{
          title: 'Farms',
          headerShown: false,
          tabBarIcon: ({ color }) => (
            <View style={{ width: 24, height: 24, alignItems: 'center', justifyContent: 'center' }}>
              <FarmIcon color={color} />
            </View>
          ),
          tabBarButtonTestID: 'farms-tab',
          href: isUserFarm ? null : '/farms',
        }}
      />

      {/* Products Tab - For consumers to browse */}
      <Tabs.Screen
        name="products"
        options={{
          title: 'Products',
          headerShown: false,
          tabBarIcon: ({ color }) => (
            <View style={{ width: 24, height: 24, alignItems: 'center', justifyContent: 'center' }}>
              <ProductsIcon color={color} />
            </View>
          ),
          tabBarButtonTestID: 'products-tab',
          href: isUserFarm ? null : '/products',
        }}
      />

      {/* Inventory Tab - Only for farms */}
      <Tabs.Screen
        name="inventory"
        options={{
          title: 'Inventory',
          headerShown: false,
          tabBarIcon: ({ color }) => (
            <View style={{ width: 24, height: 24, alignItems: 'center', justifyContent: 'center' }}>
              <ProductsIcon color={color} />
            </View>
          ),
          tabBarButtonTestID: 'inventory-tab',
          href: isUserFarm ? '/inventory' : null,
        }}
      />

      {/* Orders Tab - For both consumers and farms */}
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Orders',
          headerShown: false,
          tabBarIcon: ({ color }) => (
            <View style={{ width: 24, height: 24, alignItems: 'center', justifyContent: 'center' }}>
              <OrdersIcon color={color} />
            </View>
          ),
          tabBarButtonTestID: 'orders-tab',
          href: isUserFarm ? '/farm/orders' : '/orders',
        }}
      />

      {/* Cart Tab - Only for consumers */}
      <Tabs.Screen
        name="cart"
        options={{
          title: 'Cart',
          headerShown: false,
          tabBarIcon: ({ color }) => (
            <View style={{ width: 24, height: 24, alignItems: 'center', justifyContent: 'center' }}>
              <CartIcon color={color} />
              <CartBadge count={cartItemCount} />
            </View>
          ),
          tabBarButtonTestID: 'cart-tab',
          href: isUserFarm ? null : '/cart',
        }}
      />

      {/* Profile Tab - For all users */}
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          headerShown: false,
          tabBarIcon: ({ color }) => (
            <View style={{ width: 24, height: 24, alignItems: 'center', justifyContent: 'center' }}>
              <SettingsIcon color={color} />
            </View>
          ),
          tabBarButtonTestID: 'profile-tab',
        }}
      />

      {/* Hidden tabs - Routes that should not show in the tab bar */}
      <Tabs.Screen
        name="settings"
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="dashboard"
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="home"
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="style"
        options={{
          href: null,
        }}
      />

      {/* Sub-layouts are handled by their own _layout.tsx files */}
      <Tabs.Screen
        name="farm"
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="payment/result"
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="profile/edit"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}

const CreateNewPostLink = () => {
  return (
    <Link href="/feed/add-post" asChild>
      <Pressable>
        <Text className="px-3 text-primary-300">Create</Text>
      </Pressable>
    </Link>
  );
};
