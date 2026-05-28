import React, { useEffect, useState } from 'react';

import { Button, Input, Select, Text, View } from '@/components/ui';
import { useDebounce } from '@/lib/hooks/use-debounce';

export type FarmSearchFilters = {
  search: string;
  deliveryMethod: 'all' | 'pickup' | 'farm_delivery' | 'both';
  sortBy: 'name' | 'distance' | 'createdAt';
  sortOrder: 'asc' | 'desc';
  isActive: boolean;
};

export type FarmSearchProps = {
  filters: FarmSearchFilters;
  onFiltersChange: (filters: FarmSearchFilters) => void;
  onSearch: () => void;
  onClear: () => void;
  showLocationSort?: boolean;
  loading?: boolean;
};

const deliveryMethodOptions = [
  { label: 'All Methods', value: 'all' },
  { label: 'Farm Pickup', value: 'pickup' },
  { label: 'Farm Delivery', value: 'farm_delivery' },
  { label: 'Pickup & Delivery', value: 'both' },
];

const sortByOptions = [
  { label: 'Name', value: 'name' },
  { label: 'Date Added', value: 'createdAt' },
];

const sortByOptionsWithDistance = [
  { label: 'Name', value: 'name' },
  { label: 'Distance', value: 'distance' },
  { label: 'Date Added', value: 'createdAt' },
];

const sortOrderOptions = [
  { label: 'A-Z / Nearest', value: 'asc' },
  { label: 'Z-A / Farthest', value: 'desc' },
];

// Advanced filters component
const AdvancedFilters = ({
  filters,
  onFiltersChange,
  onSearch,
  onClear,
  showLocationSort,
  loading,
}: {
  filters: FarmSearchFilters;
  onFiltersChange: (filters: FarmSearchFilters) => void;
  onSearch: () => void;
  onClear: () => void;
  showLocationSort: boolean;
  loading: boolean;
}) => {
  const handleDeliveryMethodChange = (deliveryMethod: string | number) => {
    onFiltersChange({
      ...filters,
      deliveryMethod: deliveryMethod as FarmSearchFilters['deliveryMethod'],
    });
  };

  const handleSortByChange = (sortBy: string | number) => {
    onFiltersChange({
      ...filters,
      sortBy: sortBy as FarmSearchFilters['sortBy'],
    });
  };

  const handleSortOrderChange = (sortOrder: string | number) => {
    onFiltersChange({
      ...filters,
      sortOrder: sortOrder as FarmSearchFilters['sortOrder'],
    });
  };

  const handleActiveToggle = () => {
    onFiltersChange({ ...filters, isActive: !filters.isActive });
  };

  return (
    <View className="border-t border-gray-200 pt-4 dark:border-gray-700">
      <Text className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">
        Filters
      </Text>

      {/* Delivery Method Filter */}
      <View className="mb-4">
        <Text className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          Delivery Method
        </Text>
        <Select
          options={deliveryMethodOptions}
          value={filters.deliveryMethod}
          onSelect={handleDeliveryMethodChange}
          placeholder="Select delivery method"
        />
      </View>

      {/* Sort Options */}
      <View className="mb-4 flex-row space-x-3">
        <View className="flex-1">
          <Text className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            Sort By
          </Text>
          <Select
            options={
              showLocationSort ? sortByOptionsWithDistance : sortByOptions
            }
            value={filters.sortBy}
            onSelect={handleSortByChange}
            placeholder="Sort by"
          />
        </View>

        <View className="flex-1">
          <Text className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            Order
          </Text>
          <Select
            options={sortOrderOptions}
            value={filters.sortOrder}
            onSelect={handleSortOrderChange}
            placeholder="Order"
          />
        </View>
      </View>

      {/* Active Status Toggle */}
      <View className="mb-4 flex-row items-center justify-between">
        <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Show only active farms
        </Text>
        <Button
          label={filters.isActive ? 'Active Only' : 'All Farms'}
          onPress={handleActiveToggle}
          variant={filters.isActive ? 'default' : 'outline'}
          className="px-4"
        />
      </View>

      {/* Action Buttons */}
      <View className="flex-row space-x-3">
        <Button
          label="Apply Filters"
          onPress={onSearch}
          className="flex-1"
          disabled={loading}
        />

        <Button
          label="Clear All"
          onPress={onClear}
          variant="outline"
          className="flex-1"
        />
      </View>
    </View>
  );
};

// Search input section component
const SearchSection = ({
  searchValue,
  onSearchChange,
  onSearch,
  loading,
  isExpanded,
  onToggleFilters,
}: {
  searchValue: string;
  onSearchChange: (value: string) => void;
  onSearch: () => void;
  loading: boolean;
  isExpanded: boolean;
  onToggleFilters: () => void;
}) => (
  <View className="mb-4">
    <Input
      placeholder="Search farms by name or description..."
      value={searchValue}
      onChangeText={onSearchChange}
      className="mb-3"
    />

    <View className="flex-row space-x-3">
      <Button
        label="Search"
        onPress={onSearch}
        className="flex-1"
        disabled={loading}
      />

      <Button
        label={isExpanded ? 'Hide Filters' : 'Filters'}
        onPress={onToggleFilters}
        variant="outline"
      />
    </View>
  </View>
);

export const FarmSearch = ({
  filters,
  onFiltersChange,
  onSearch,
  onClear,
  showLocationSort = false,
  loading = false,
}: FarmSearchProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [localSearch, setLocalSearch] = useState(filters.search);
  const debouncedSearch = useDebounce(localSearch, 400);

  useEffect(() => {
    if (debouncedSearch !== filters.search) {
      onFiltersChange({ ...filters, search: debouncedSearch });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  const handleToggleFilters = () => {
    setIsExpanded(!isExpanded);
  };

  const handleClear = () => {
    setLocalSearch('');
    onClear();
    setIsExpanded(false);
  };

  return (
    <View className="bg-white p-4 dark:bg-gray-800">
      <SearchSection
        searchValue={localSearch}
        onSearchChange={setLocalSearch}
        onSearch={onSearch}
        loading={loading}
        isExpanded={isExpanded}
        onToggleFilters={handleToggleFilters}
      />

      {/* Advanced Filters */}
      {isExpanded && (
        <AdvancedFilters
          filters={filters}
          onFiltersChange={onFiltersChange}
          onSearch={onSearch}
          onClear={handleClear}
          showLocationSort={showLocationSort}
          loading={loading}
        />
      )}
    </View>
  );
};
