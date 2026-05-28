import { Filter, SortAsc, SortDesc } from 'lucide-react-native';
import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, TouchableOpacity } from 'react-native';

// import { Badge } from '@/components/ui/badge';
import { FarmCard } from '@/components/farms/farm-card';
import { Text as UIText, View } from '@/components/ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLocation } from '@/lib/hooks/use-location';
import { calculateDistance } from '@/lib/location/utils';
import type { Farm } from '@/types';

import type { SearchFilter } from './search-bar';

// Farm search specific types
export type FarmSearchFilter = SearchFilter & {
  maxDistance?: number;
  minRating?: number;
  certifications?: string[];
  organicOnly?: boolean;
  hasProducts?: boolean;
  farmType?: 'small' | 'medium' | 'large' | 'all';
};

export type FarmSearchBarProps = {
  // Data
  farms: Farm[];

  // Configuration
  placeholder?: string;
  showLocationFilter?: boolean;
  showRatingFilter?: boolean;
  showCertificationFilter?: boolean;
  showOrganicFilter?: boolean;
  showProductFilter?: boolean;
  showFarmTypeFilter?: boolean;

  // Callbacks
  onSearch: (filter: FarmSearchFilter) => void;
  onFarmPress?: (farm: Farm) => void;
  onFilterPress?: () => void;
  onSortPress?: () => void;
  onClear?: () => void;

  // State
  loading?: boolean;
  error?: string | null;
  currentFilter?: FarmSearchFilter;

  // Styling
  className?: string;
  showResults?: boolean;
  maxResults?: number;
};

// Farm search utility functions
const searchInFarm = (farm: Farm, query: string): boolean => {
  if (!query.trim()) return true;

  const searchQuery = query.toLowerCase();
  const searchableFields = [
    farm.name,
    farm.description,
    farm.location?.address?.city,
    farm.location?.address?.state,
    farm.contactEmail,
    farm.contactPhone,
  ].filter(Boolean);

  return searchableFields.some((field) =>
    String(field).toLowerCase().includes(searchQuery)
  );
};

const filterByDistance = (
  farm: Farm,
  userLocation: { latitude: number; longitude: number } | null,
  maxDistance: number
): boolean => {
  if (!userLocation || !farm.location?.coordinates) return true;

  const distance = calculateDistance(userLocation, farm.location.coordinates);

  return distance <= maxDistance;
};

const filterByRating = (farm: Farm, minRating: number): boolean => {
  // Farm type doesn't have rating, so we'll skip this filter for now
  return true;
};

const filterByCertifications = (
  farm: Farm,
  certifications: string[]
): boolean => {
  // Farm type doesn't have certifications, so we'll skip this filter for now
  return true;
};

const filterByOrganic = (farm: Farm, organicOnly: boolean): boolean => {
  if (!organicOnly) return true;
  // Farm type doesn't have organicCertified, so we'll skip this filter for now
  return true;
};

const filterByProducts = (farm: Farm, hasProducts: boolean): boolean => {
  if (hasProducts === undefined) return true;
  // Farm type doesn't have productCount, so we'll skip this filter for now
  return true;
};

const filterByFarmType = (farm: Farm, farmType: string): boolean => {
  if (farmType === 'all') return true;

  // Farm type doesn't have size, so we'll skip this filter for now
  return true;
};

const sortFarms = (
  farms: Farm[],
  sortBy: string | undefined,
  sortOrder: 'asc' | 'desc' = 'asc',
  userLocation: { latitude: number; longitude: number } | null = null
): Farm[] => {
  if (!sortBy) return farms;

  return [...farms].sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case 'name':
        comparison = a.name.localeCompare(b.name);
        break;
      case 'rating':
        // Farm type doesn't have rating, so we'll skip this sort for now
        comparison = 0;
        break;
      case 'distance':
        if (
          userLocation &&
          a.location?.coordinates &&
          b.location?.coordinates
        ) {
          const distanceA = calculateDistance(
            userLocation,
            a.location.coordinates
          );
          const distanceB = calculateDistance(
            userLocation,
            b.location.coordinates
          );
          comparison = distanceA - distanceB;
        }
        break;
      case 'productCount':
        // Farm type doesn't have productCount, so we'll skip this sort for now
        comparison = 0;
        break;
      case 'relevance':
      default:
        // For relevance, we could implement a scoring system
        // For now, just maintain original order
        comparison = 0;
    }

    return sortOrder === 'asc' ? comparison : -comparison;
  });
};

// Main FarmSearchBar component
export function FarmSearchBar({
  farms,
  placeholder = 'Search farms...',
  showLocationFilter = true,
  showRatingFilter = true,
  showCertificationFilter = true,
  showOrganicFilter = true,
  showProductFilter = true,
  showFarmTypeFilter = true,
  onSearch,
  onFarmPress,
  onFilterPress,
  onSortPress,
  onClear,
  loading = false,
  error = null,
  currentFilter,
  className = '',
  showResults = true,
  maxResults = 20,
}: FarmSearchBarProps) {
  const [query, setQuery] = useState(currentFilter?.query || '');
  const [filters, setFilters] = useState<FarmSearchFilter>(
    currentFilter || {
      query: '',
      maxDistance: 100,
      minRating: 0,
      certifications: [],
      organicOnly: false,
      hasProducts: undefined,
      farmType: 'all',
    }
  );

  const { coordinates: userLocation } = useLocation();

  // Handle input change
  const handleInputChange = useCallback(
    (text: string) => {
      setQuery(text);
      const newFilters = { ...filters, query: text };
      setFilters(newFilters);
      onSearch(newFilters);
    },
    [filters, onSearch]
  );

  // Handle clear search
  const handleClear = useCallback(() => {
    setQuery('');
    const newFilters = { ...filters, query: '' };
    setFilters(newFilters);
    onClear?.();
    onSearch(newFilters);
  }, [filters, onClear, onSearch]);

  // Handle filter change
  const handleFilterChange = useCallback(
    (newFilters: Partial<FarmSearchFilter>) => {
      const updatedFilters = { ...filters, ...newFilters };
      setFilters(updatedFilters);
      onSearch(updatedFilters);
    },
    [filters, onSearch]
  );

  // Filter and search farms
  const filteredFarms = useMemo(() => {
    let result = farms;

    // Apply text search
    if (query.trim()) {
      result = result.filter((farm) => searchInFarm(farm, query));
    }

    // Apply distance filter
    if (filters.maxDistance && userLocation) {
      result = result.filter((farm) =>
        filterByDistance(farm, userLocation, filters.maxDistance!)
      );
    }

    // Apply rating filter
    if (filters.minRating && filters.minRating > 0) {
      result = result.filter((farm) =>
        filterByRating(farm, filters.minRating!)
      );
    }

    // Apply certification filter
    if (filters.certifications && filters.certifications.length > 0) {
      result = result.filter((farm) =>
        filterByCertifications(farm, filters.certifications!)
      );
    }

    // Apply organic filter
    if (filters.organicOnly) {
      result = result.filter((farm) =>
        filterByOrganic(farm, filters.organicOnly!)
      );
    }

    // Apply product filter
    if (filters.hasProducts !== undefined) {
      result = result.filter((farm) =>
        filterByProducts(farm, filters.hasProducts!)
      );
    }

    // Apply farm type filter
    if (filters.farmType && filters.farmType !== 'all') {
      result = result.filter((farm) =>
        filterByFarmType(farm, filters.farmType!)
      );
    }

    // Apply sorting
    result = sortFarms(result, filters.sortBy, filters.sortOrder, userLocation);

    // Limit results
    if (maxResults && result.length > maxResults) {
      result = result.slice(0, maxResults);
    }

    return result;
  }, [farms, query, filters, userLocation, maxResults]);

  // Render active filters
  const renderActiveFilters = () => {
    const activeFilters = [];

    if (filters.maxDistance) {
      activeFilters.push(
        <View
          key="distance"
          className="mb-2 mr-2 rounded-full bg-gray-100 px-2 py-1 dark:bg-gray-800"
        >
          <UIText className="text-xs text-gray-700 dark:text-gray-300">
            Within {filters.maxDistance}km
          </UIText>
        </View>
      );
    }

    if (filters.minRating && filters.minRating > 0) {
      activeFilters.push(
        <View
          key="rating"
          className="mb-2 mr-2 rounded-full bg-gray-100 px-2 py-1 dark:bg-gray-800"
        >
          <UIText className="text-xs text-gray-700 dark:text-gray-300">
            {filters.minRating}+ stars
          </UIText>
        </View>
      );
    }

    if (filters.organicOnly) {
      activeFilters.push(
        <View
          key="organic"
          className="mb-2 mr-2 rounded-full bg-gray-100 px-2 py-1 dark:bg-gray-800"
        >
          <UIText className="text-xs text-gray-700 dark:text-gray-300">
            Organic only
          </UIText>
        </View>
      );
    }

    if (filters.hasProducts) {
      activeFilters.push(
        <View
          key="products"
          className="mb-2 mr-2 rounded-full bg-gray-100 px-2 py-1 dark:bg-gray-800"
        >
          <UIText className="text-xs text-gray-700 dark:text-gray-300">
            Has products
          </UIText>
        </View>
      );
    }

    if (filters.farmType && filters.farmType !== 'all') {
      activeFilters.push(
        <View
          key="type"
          className="mb-2 mr-2 rounded-full bg-gray-100 px-2 py-1 dark:bg-gray-800"
        >
          <UIText className="text-xs text-gray-700 dark:text-gray-300">
            {filters.farmType} farm
          </UIText>
        </View>
      );
    }

    if (activeFilters.length === 0) return null;

    return (
      <View className="mb-3 flex-row flex-wrap">
        {activeFilters}
        <TouchableOpacity
          onPress={() =>
            handleFilterChange({
              maxDistance: undefined,
              minRating: 0,
              certifications: [],
              organicOnly: false,
              hasProducts: undefined,
              farmType: 'all',
            })
          }
          className="ml-auto"
        >
          <UIText className="text-sm text-blue-600 dark:text-blue-400">
            Clear all
          </UIText>
        </TouchableOpacity>
      </View>
    );
  };

  // Render farm result
  const renderFarm = (farm: Farm, index: number) => {
    const distance =
      userLocation && farm.location?.coordinates
        ? calculateDistance(userLocation, farm.location.coordinates)
        : null;

    return (
      <FarmCard
        key={farm.id}
        farm={farm}
        onPress={() => onFarmPress?.(farm)}
        showDistance={!!distance}
        userLocation={userLocation || undefined}
      />
    );
  };

  return (
    <View className={`space-y-4 ${className}`}>
      {/* Search Input */}
      <View className="flex-row items-center space-x-2">
        <View className="relative flex-1">
          <Input
            value={query}
            onChangeText={handleInputChange}
            placeholder={placeholder}
            className="pr-10"
          />
        </View>

        {/* Filter Button */}
        <Button
          variant="outline"
          size="sm"
          onPress={onFilterPress}
          className="px-3"
        >
          <Filter size={16} className="mr-1" />
          <UIText className="text-sm">Filter</UIText>
        </Button>

        {/* Sort Button */}
        <Button
          variant="outline"
          size="sm"
          onPress={onSortPress}
          className="px-3"
        >
          {filters.sortOrder === 'desc' ? (
            <SortDesc size={16} className="mr-1" />
          ) : (
            <SortAsc size={16} className="mr-1" />
          )}
          <UIText className="text-sm">Sort</UIText>
        </Button>
      </View>

      {/* Active Filters */}
      {renderActiveFilters()}

      {/* Search Results */}
      {showResults && (
        <View className="flex-1">
          {loading ? (
            <View className="flex-row items-center justify-center py-8">
              <UIText className="text-gray-600 dark:text-gray-400">
                Searching...
              </UIText>
            </View>
          ) : error ? (
            <View className="flex-row items-center justify-center py-8">
              <UIText className="text-red-600 dark:text-red-400">
                {error}
              </UIText>
            </View>
          ) : filteredFarms.length === 0 ? (
            <View className="flex-row items-center justify-center py-8">
              <UIText className="text-gray-500 dark:text-gray-400">
                {query ? 'No farms found' : 'Start typing to search farms...'}
              </UIText>
            </View>
          ) : (
            <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
              {filteredFarms.map(renderFarm)}
            </ScrollView>
          )}
        </View>
      )}

      {/* Search Stats */}
      {query && filteredFarms.length > 0 && (
        <View className="flex-row items-center justify-between border-t border-gray-200 pt-2 dark:border-gray-700">
          <UIText className="text-sm text-gray-600 dark:text-gray-400">
            {filteredFarms.length} farm{filteredFarms.length !== 1 ? 's' : ''}{' '}
            found
          </UIText>
          {filters.sortBy && (
            <UIText className="text-sm text-gray-500 dark:text-gray-500">
              Sorted by {filters.sortBy} ({filters.sortOrder})
            </UIText>
          )}
        </View>
      )}
    </View>
  );
}

// Export types for external use
// export type { FarmSearchFilter, FarmSearchBarProps };
