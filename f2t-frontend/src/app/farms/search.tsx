import { useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { Linking, Alert } from 'react-native';

import { type GetFarmsRequest, useGetFarms } from '@/api/farms';
import { FarmCard } from '@/components/farms';
import {
  FarmLocationFilter,
  type FarmLocationFilterOptions,
} from '@/components/farms/farm-location-filter';
import {
  SearchResultsScreen,
  type SortOption,
  type SortSelection,
} from '@/components/search';
import { useLocation } from '@/lib/hooks/use-location';
import type { Farm } from '@/types';

// Farm sort options
const FARM_SORT_OPTIONS: SortOption[] = [
  {
    label: 'Name (A-Z)',
    value: 'name',
    order: 'asc',
    description: 'Alphabetical order',
  },
  {
    label: 'Name (Z-A)',
    value: 'name',
    order: 'desc',
    description: 'Reverse alphabetical',
  },
  {
    label: 'Nearest First',
    value: 'distance',
    order: 'asc',
    description: 'Closest to you',
  },
  {
    label: 'Recently Added',
    value: 'createdAt',
    order: 'desc',
    description: 'Newest farms',
  },
  {
    label: 'Oldest First',
    value: 'createdAt',
    order: 'asc',
    description: 'Established farms',
  },
];

export default function FarmSearchScreen() {
  const router = useRouter();
  const { coordinates: userLocation } = useLocation();

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [showLocationFilter, setShowLocationFilter] = useState(false);

  // Location filter state
  const [locationFilters, setLocationFilters] =
    useState<FarmLocationFilterOptions>({
      maxDistance: 100,
      useCurrentLocation: true,
    });

  // Sort state
  const [currentSort, setCurrentSort] = useState<SortSelection>({
    sortBy: userLocation ? 'distance' : 'name',
    sortOrder: 'asc',
  });

  // Determine the location to use for filtering
  const filterLocation = locationFilters.useCurrentLocation
    ? userLocation
    : locationFilters.customLocation;

  // Fetch farms
  const {
    data: farmsResponse,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useGetFarms({
    variables: {
      search: searchQuery || undefined,
      sortBy: currentSort.sortBy as GetFarmsRequest['sortBy'],
      sortOrder: currentSort.sortOrder,
      isActive: true,
      limit: 50,
      ...(filterLocation && {
        location: {
          latitude: filterLocation.latitude,
          longitude: filterLocation.longitude,
          radius: locationFilters.maxDistance,
        },
      }),
    },
  });

  const farms = useMemo(() => {
    return (
      farmsResponse?.pages?.flatMap((page) =>
        page.success ? page.data?.farms || page.data?.items || [] : []
      ) || []
    );
  }, [farmsResponse]);

  // Handle search change
  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  // Handle location filter apply
  const handleLocationFilterApply = useCallback(
    (newFilters: FarmLocationFilterOptions) => {
      setLocationFilters(newFilters);
    },
    []
  );

  // Handle sort change
  const handleSortChange = useCallback((sort: SortSelection) => {
    setCurrentSort(sort);
  }, []);

  // Handle farm press
  const handleFarmPress = useCallback(
    (farm: Farm) => {
      router.push(`/farms/${farm.id}`);
    },
    [router]
  );

  // Handle view products
  const handleViewProducts = useCallback(
    (farm: Farm) => {
      router.push(`/farms/${farm.id}/products`);
    },
    [router]
  );

  // Handle contact farm
  const handleContactFarm = useCallback((farm: Farm) => {
    const phone = farm.contactPhone;
    if (phone) {
      Linking.openURL('tel:' + phone);
    } else {
      Alert.alert('Thông tin', 'Trang trại chưa cung cấp số điện thoại.');
    }
  }, []);

  // Calculate active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (locationFilters.maxDistance !== 100) count++;
    if (!locationFilters.useCurrentLocation) count++;
    return count;
  }, [locationFilters]);

  // Filter sort options based on location availability
  const availableSortOptions = useMemo(() => {
    if (!userLocation) {
      return FARM_SORT_OPTIONS.filter((opt) => opt.value !== 'distance');
    }
    return FARM_SORT_OPTIONS;
  }, [userLocation]);

  return (
    <>
      <SearchResultsScreen
        data={farms}
        isLoading={isLoading}
        isRefreshing={isFetching}
        error={error ? 'Failed to load farms' : null}
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        searchPlaceholder="Search farms..."
        showFilters={!!userLocation}
        onFilterPress={() => setShowLocationFilter(true)}
        activeFilterCount={activeFilterCount}
        sortOptions={availableSortOptions}
        currentSort={currentSort}
        onSortChange={handleSortChange}
        renderItem={(farm: Farm) => (
          <FarmCard
            farm={farm}
            onPress={() => handleFarmPress(farm)}
            onViewProducts={() => handleViewProducts(farm)}
            onContact={() => handleContactFarm(farm)}
            showDistance={!!userLocation}
            userLocation={userLocation || undefined}
            variant="default"
          />
        )}
        keyExtractor={(farm: Farm) => farm.id}
        emptyTitle="No farms found"
        emptyDescription={
          searchQuery
            ? `No farms match "${searchQuery}". Try different keywords or adjust your location filter.`
            : 'Start searching to discover local farms in your area.'
        }
        emptyAction={{
          label: 'Clear Search',
          onPress: () => {
            setSearchQuery('');
            setLocationFilters({
              maxDistance: 100,
              useCurrentLocation: true,
            });
          },
        }}
        onRefresh={refetch}
        title="Search Farms"
        subtitle={
          userLocation && filterLocation
            ? `Within ${locationFilters.maxDistance}km of your location`
            : 'Find local farms near you'
        }
      />

      {/* Location Filter Modal */}
      {userLocation && (
        <FarmLocationFilter
          visible={showLocationFilter}
          onClose={() => setShowLocationFilter(false)}
          onApply={handleLocationFilterApply}
          initialFilters={locationFilters}
        />
      )}
    </>
  );
}
