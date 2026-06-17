import { keepPreviousData } from '@tanstack/react-query';
import * as Location from 'expo-location';
import { type Router, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useGetFarms } from '@/api/farms';
import {
  FarmList,
  FarmLocationFilter,
  type FarmLocationFilterOptions,
  FarmSearch,
  type FarmSearchFilters,
} from '@/components/farms';
import { Button, Text, View } from '@/components/ui';
import type { Farm } from '@/types';

// Header component
const DiscoveryHeader = ({
  farms,
  searchFilters,
  userLocation,
  locationFilters,
  onOpenLocationFilter,
}: {
  farms: Farm[];
  searchFilters: FarmSearchFilters;
  userLocation: { latitude: number; longitude: number } | null;
  locationFilters: FarmLocationFilterOptions;
  onOpenLocationFilter: () => void;
}) => {
  const insets = useSafeAreaInsets();
  const headerStyle = useMemo(() => ({ paddingTop: insets.top }), [insets.top]);
  return (
    <View className="bg-white dark:bg-gray-900" style={headerStyle}>
      <View className="flex-row items-center justify-between px-4 pt-3 pb-3">
        <View className="flex-1">
          <Text className="text-xl font-bold text-gray-900 dark:text-white">
            Khám phá trang trại
          </Text>
          <Text className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
            Thực phẩm sạch từ trang trại gần bạn
          </Text>
        </View>

        {userLocation && (
          <Pressable
            onPress={onOpenLocationFilter}
            className="flex-row items-center gap-1 rounded-full border border-primary-200 bg-primary-50 px-3 py-1.5 dark:border-primary-800 dark:bg-primary-900/20"
          >
            <Text className="text-xs">📍</Text>
            <Text className="text-xs font-semibold text-primary-700 dark:text-primary-300">
              {locationFilters.maxDistance}km
            </Text>
          </Pressable>
        )}
      </View>

      {farms.length > 0 && (
        <View className="px-4 pb-2">
          <Text className="text-xs text-gray-400 dark:text-gray-500">
            {farms.length} trang trại
            {searchFilters.search ? ` cho "${searchFilters.search}"` : ''}
          </Text>
        </View>
      )}
    </View>
  );
};

// Location permission request component
const LocationPermissionRequest = ({
  onRequestPermission,
}: {
  onRequestPermission: () => void;
}) => (
  <View className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
    <Text className="mb-2 font-medium text-blue-900 dark:text-blue-100">
      Enable Location for Better Results
    </Text>
    <Text className="mb-3 text-sm text-blue-800 dark:text-blue-200">
      Allow location access to find farms near you and get distance-based
      sorting.
    </Text>
    <Button
      label="Enable Location"
      onPress={onRequestPermission}
      variant="outline"
      className="self-start"
    />
  </View>
);

// Loading state component
const LoadingState = () => {
  const insets = useSafeAreaInsets();
  const headerStyle = useMemo(() => ({ paddingTop: insets.top }), [insets.top]);
  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      <View className="bg-white dark:bg-gray-900" style={headerStyle}>
        <View className="px-4 pt-3 pb-3">
          <Text className="text-xl font-bold text-gray-900 dark:text-white">
            Khám phá trang trại
          </Text>
        </View>
      </View>
      <View className="flex-1 items-center justify-center">
        <Text className="text-sm text-gray-400 dark:text-gray-500">Đang tải...</Text>
      </View>
    </View>
  );
};

// Error state component
const ErrorState = ({ onRetry }: { onRetry: () => void }) => {
  const insets = useSafeAreaInsets();
  const headerStyle = useMemo(() => ({ paddingTop: insets.top }), [insets.top]);
  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      <View className="bg-white dark:bg-gray-900" style={headerStyle}>
        <View className="px-4 pt-3 pb-3">
          <Text className="text-xl font-bold text-gray-900 dark:text-white">
            Khám phá trang trại
          </Text>
        </View>
      </View>
      <View className="flex-1 items-center justify-center p-6">
        <Text className="mb-2 text-center text-base font-semibold text-gray-900 dark:text-white">
          Không thể tải trang trại
        </Text>
        <Text className="mb-6 text-center text-sm text-gray-400 dark:text-gray-500">
          Kiểm tra kết nối và thử lại.
        </Text>
        <Button label="Thử lại" onPress={onRetry} variant="outline" />
      </View>
    </View>
  );
};

// Hook for location management
const useLocationServices = () => {
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [locationPermission, setLocationPermission] =
    useState<Location.LocationPermissionResponse | null>(null);

  const getCurrentLocation = useCallback(async () => {
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      setUserLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Failed to get current location';

      // Fallback for development/simulator issues
      if (__DEV__) {
        setUserLocation({
          latitude: 21.0285, // Hanoi
          longitude: 105.8542,
        });
      }
    }
  }, []);

  const checkLocationPermission = useCallback(async () => {
    try {
      const permission = await Location.getForegroundPermissionsAsync();
      setLocationPermission(permission);

      if (permission.granted) {
        getCurrentLocation();
      }
    } catch (error) {
    }
  }, [getCurrentLocation]);

  const requestLocationPermission = useCallback(async () => {
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(permission);

      if (permission.granted) {
        getCurrentLocation();
      }
    } catch (error) {
    }
  }, [getCurrentLocation]);

  useEffect(() => {
    checkLocationPermission();
  }, [checkLocationPermission]);

  return { userLocation, locationPermission, requestLocationPermission };
};

// Hook for farm data and search
const useFarmData = (
  userLocation: { latitude: number; longitude: number } | null,
  locationFilters: FarmLocationFilterOptions
) => {
  const [refreshing, setRefreshing] = useState(false);
  const [searchFilters, setSearchFilters] = useState<FarmSearchFilters>({
    search: '',
    deliveryMethod: 'all',
    sortBy: userLocation ? 'distance' : 'name',
    sortOrder: 'asc',
    isActive: true,
  });

  // Determine the location to use for filtering
  const filterLocation = locationFilters.useCurrentLocation
    ? userLocation
    : locationFilters.customLocation;

  const {
    data: farmsResponse,
    isLoading,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useGetFarms({
    variables: {
      limit: 20,
      search: searchFilters.search || undefined,
      deliveryMethod:
        searchFilters.deliveryMethod !== 'all'
          ? searchFilters.deliveryMethod
          : undefined,
      sortBy: searchFilters.sortBy,
      sortOrder: searchFilters.sortOrder,
      isActive: searchFilters.isActive,
      ...(filterLocation && {
        location: {
          latitude: filterLocation.latitude,
          longitude: filterLocation.longitude,
          radius: locationFilters.maxDistance,
        },
      }),
    },
    // Giữ danh sách farm cũ khi đổi radius (query key đổi) → tránh isLoading+farms rỗng
    // làm FarmDiscoveryScreen swap sang <LoadingState/> và remount modal (lấy lại GPS).
    placeholderData: keepPreviousData,
  });

  const farms =
    farmsResponse?.pages?.flatMap((page) =>
      page.success ? page.data?.items || page.data?.farms || [] : []
    ) || [];

  return {
    farms,
    searchFilters,
    setSearchFilters,
    isLoading,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refreshing,
    setRefreshing,
  };
};

// Hook for search and filter handlers
const useSearchHandlers = ({
  userLocation,
  setSearchFilters,
  refetch,
  setRefreshing,
}: {
  userLocation: { latitude: number; longitude: number } | null;
  setSearchFilters: (filters: FarmSearchFilters) => void;
  refetch: () => void;
  setRefreshing: (refreshing: boolean) => void;
}) => {
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } catch (error) {
    } finally {
      setRefreshing(false);
    }
  }, [refetch, setRefreshing]);

  const handleSearch = useCallback(() => refetch(), [refetch]);

  const handleClearFilters = useCallback(() => {
    setSearchFilters({
      search: '',
      deliveryMethod: 'all',
      sortBy: userLocation ? 'distance' : 'name',
      sortOrder: 'asc',
      isActive: true,
    });
  }, [setSearchFilters, userLocation]);

  const handleFiltersChange = useCallback(
    (newFilters: FarmSearchFilters) => {
      setSearchFilters(newFilters);
    },
    [setSearchFilters]
  );

  return {
    handleRefresh,
    handleSearch,
    handleClearFilters,
    handleFiltersChange,
  };
};

// Hook for navigation handlers
const useNavigationHandlers = (router: Router) => {
  const handleFarmPress = useCallback(
    (farm: Farm) => {
      router.push(`/farms/${farm.id}`);
    },
    [router]
  );

  const handleViewProducts = useCallback(
    (farm: Farm) => {
      router.push(`/farms/${farm.id}/products`);
    },
    [router]
  );

  const handleContactFarm = useCallback((farm: Farm) => {
  }, []);

  return { handleFarmPress, handleViewProducts, handleContactFarm };
};

// Hook for pagination handlers
const usePaginationHandlers = ({
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
}: {
  fetchNextPage: () => void;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
}) => {
  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return { handleLoadMore };
};

// Main handlers hook
const useFarmHandlers = (params: {
  router: Router;
  userLocation: { latitude: number; longitude: number } | null;
  setSearchFilters: (filters: FarmSearchFilters) => void;
  refetch: () => void;
  setRefreshing: (refreshing: boolean) => void;
  fetchNextPage: () => void;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
}) => {
  const searchHandlers = useSearchHandlers(params);
  const navigationHandlers = useNavigationHandlers(params.router);
  const paginationHandlers = usePaginationHandlers(params);

  return { ...searchHandlers, ...navigationHandlers, ...paginationHandlers };
};

// Main hook that combines all functionality
const useFarmDiscovery = () => {
  const router = useRouter();
  const { userLocation, locationPermission, requestLocationPermission } =
    useLocationServices();

  // Location filter state
  const [locationFilters, setLocationFilters] =
    useState<FarmLocationFilterOptions>({
      maxDistance: 100,
      useCurrentLocation: true,
    });
  const [showLocationFilter, setShowLocationFilter] = useState(false);

  const {
    farms,
    searchFilters,
    setSearchFilters,
    isLoading,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refreshing,
    setRefreshing,
  } = useFarmData(userLocation, locationFilters);

  const handlers = useFarmHandlers({
    router,
    userLocation,
    setSearchFilters,
    refetch,
    setRefreshing,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  });

  const handleApplyLocationFilter = useCallback(
    (filters: FarmLocationFilterOptions) => {
      setLocationFilters(filters);
      refetch();
    },
    [refetch]
  );

  return {
    farms,
    userLocation,
    locationPermission,
    searchFilters,
    locationFilters,
    showLocationFilter,
    setShowLocationFilter,
    isLoading,
    error,
    refreshing,
    isFetchingNextPage,
    requestLocationPermission,
    refetch,
    handleApplyLocationFilter,
    ...handlers,
  };
};

// Props interface for the main content component
type FarmDiscoveryContentProps = {
  farms: Farm[];
  userLocation: { latitude: number; longitude: number } | null;
  locationPermission: Location.LocationPermissionResponse | null;
  searchFilters: FarmSearchFilters;
  locationFilters: FarmLocationFilterOptions;
  showLocationFilter: boolean;
  setShowLocationFilter: (show: boolean) => void;
  isLoading: boolean;
  refreshing: boolean;
  isFetchingNextPage: boolean;
  requestLocationPermission: () => void;
  handleRefresh: () => void;
  handleSearch: () => void;
  handleClearFilters: () => void;
  handleFiltersChange: (filters: FarmSearchFilters) => void;
  handleApplyLocationFilter: (filters: FarmLocationFilterOptions) => void;
  handleFarmPress: (farm: Farm) => void;
  handleViewProducts: (farm: Farm) => void;
  handleContactFarm: (farm: Farm) => void;
  handleLoadMore: () => void;
};

// Search section component
const SearchSection = ({
  locationPermission,
  searchFilters,
  userLocation,
  isLoading,
  requestLocationPermission,
  handleFiltersChange,
  handleSearch,
  handleClearFilters,
}: {
  locationPermission: Location.LocationPermissionResponse | null;
  searchFilters: FarmSearchFilters;
  userLocation: { latitude: number; longitude: number } | null;
  isLoading: boolean;
  requestLocationPermission: () => void;
  handleFiltersChange: (filters: FarmSearchFilters) => void;
  handleSearch: () => void;
  handleClearFilters: () => void;
}) => (
  <View className="bg-white p-4 pb-0 dark:bg-gray-800">
    {!locationPermission?.granted && (
      <LocationPermissionRequest
        onRequestPermission={requestLocationPermission}
      />
    )}
    <FarmSearch
      filters={searchFilters}
      onFiltersChange={handleFiltersChange}
      onSearch={handleSearch}
      onClear={handleClearFilters}
      showLocationSort={!!userLocation}
      loading={isLoading}
    />
  </View>
);

// Main content component
const FarmDiscoveryContent = (props: FarmDiscoveryContentProps) => (
  <View className="flex-1 bg-gray-50 dark:bg-gray-900">
    <DiscoveryHeader
      farms={props.farms}
      searchFilters={props.searchFilters}
      userLocation={props.userLocation}
      locationFilters={props.locationFilters}
      onOpenLocationFilter={() => props.setShowLocationFilter(true)}
    />

    <SearchSection
      locationPermission={props.locationPermission}
      searchFilters={props.searchFilters}
      userLocation={props.userLocation}
      isLoading={props.isLoading}
      requestLocationPermission={props.requestLocationPermission}
      handleFiltersChange={props.handleFiltersChange}
      handleSearch={props.handleSearch}
      handleClearFilters={props.handleClearFilters}
    />

    <FarmList
      farms={props.farms}
      loading={props.isLoading}
      refreshing={props.refreshing}
      onRefresh={props.handleRefresh}
      onLoadMore={props.handleLoadMore}
      onFarmPress={props.handleFarmPress}
      onViewProducts={props.handleViewProducts}
      onContactFarm={props.handleContactFarm}
      showDistance={!!props.userLocation}
      userLocation={props.userLocation || undefined}
      variant="default"
      emptyMessage="No farms found"
      emptyDescription={
        props.searchFilters.search
          ? 'Try adjusting your search terms or filters'
          : 'No farms are available in your area yet'
      }
    />

    {props.isFetchingNextPage && (
      <View className="bg-white p-4 dark:bg-gray-800">
        <Text className="text-center text-gray-600 dark:text-gray-400">
          Loading more farms...
        </Text>
      </View>
    )}

    {/* Location Filter Modal */}
    <FarmLocationFilter
      visible={props.showLocationFilter}
      onClose={() => props.setShowLocationFilter(false)}
      onApply={props.handleApplyLocationFilter}
      initialFilters={props.locationFilters}
    />
  </View>
);

export default function FarmDiscoveryScreen() {
  const discoveryData = useFarmDiscovery();

  if (discoveryData.isLoading && discoveryData.farms.length === 0) {
    return <LoadingState />;
  }

  if (discoveryData.error && discoveryData.farms.length === 0) {
    return <ErrorState onRetry={() => discoveryData.refetch()} />;
  }

  return <FarmDiscoveryContent {...discoveryData} />;
}
