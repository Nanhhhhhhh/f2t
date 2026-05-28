import React, { useState } from 'react';
import { Pressable } from 'react-native';

import type { ProductSearchFilters } from '@/api/products';
import { getCategoryLabel, PRODUCT_CATEGORIES } from '@/api/products';
import { Button, Input, Select, Text, View } from '@/components/ui';

type ProductSearchProps = {
  onSearch: (filters: ProductSearchFilters) => void;
  initialFilters?: Partial<ProductSearchFilters>;
  showAdvancedFilters?: boolean;
  loading?: boolean;
};

// Category options for the select component
const categoryOptions = [
  { label: 'All Categories', value: 'all' },
  ...Object.values(PRODUCT_CATEGORIES).map((category) => ({
    label: getCategoryLabel(category),
    value: category,
  })),
];

// Sort options
const sortOptions = [
  { label: 'Name (A-Z)', value: 'name' },
  { label: 'Price (Low to High)', value: 'price' },
  { label: 'Harvest Date (Recent)', value: 'harvestDate' },
  { label: 'Popularity', value: 'popularity' },
];

// Price range presets (VND)
const priceRangeOptions = [
  { label: 'Any Price', min: 0, max: 500000 },
  { label: 'Under 50k', min: 0, max: 50000 },
  { label: '50k - 100k', min: 50000, max: 100000 },
  { label: '100k - 200k', min: 100000, max: 200000 },
  { label: 'Over 200k', min: 200000, max: 500000 },
];

export const ProductSearch = ({
  onSearch,
  initialFilters = {},
  showAdvancedFilters = true,
  loading = false,
}: ProductSearchProps) => {
  const [filters, setFilters] = useState<ProductSearchFilters>({
    search: initialFilters.search || '',
    category: initialFilters.category || 'all',
    priceRange: initialFilters.priceRange || { min: 0, max: 500000 }, // VND
    organicOnly: initialFilters.organicOnly || false,
    inSeason: initialFilters.inSeason || false,
    inStock: initialFilters.inStock || true,
    sortBy: initialFilters.sortBy || 'name',
    sortOrder: initialFilters.sortOrder || 'asc',
  });

  const [showFilters, setShowFilters] = useState(false);

  const handleFilterChange = <K extends keyof ProductSearchFilters>(
    key: K,
    value: ProductSearchFilters[K]
  ) => {
    const updatedFilters = { ...filters, [key]: value };
    setFilters(updatedFilters);

    // Auto-apply filter for category, sortBy, and sortOrder changes
    if (key === 'category' || key === 'sortBy' || key === 'sortOrder') {
      onSearch(updatedFilters);
    }
  };

  const handlePriceRangeChange = (preset: { min: number; max: number }) => {
    // Update price range but don't auto-apply (user needs to click "Apply Filters")
    setFilters((prev) => ({ ...prev, priceRange: preset }));
  };

  const handleSearch = () => {
    onSearch(filters);
  };

  const handleReset = () => {
    const resetFilters: ProductSearchFilters = {
      search: '',
      category: 'all',
      priceRange: { min: 0, max: 500000 }, // VND
      organicOnly: false,
      inSeason: false,
      inStock: true,
      sortBy: 'name',
      sortOrder: 'asc',
    };
    setFilters(resetFilters);
    onSearch(resetFilters);
  };

  const toggleSortOrder = () => {
    const newOrder = filters.sortOrder === 'asc' ? 'desc' : 'asc';
    handleFilterChange('sortOrder', newOrder);
  };

  return (
    <View className="bg-white p-4 dark:bg-gray-800">
      {/* Search Input */}
      <View className="mb-4">
        <Input
          placeholder="Search products..."
          value={filters.search}
          onChangeText={(text) =>
            setFilters((prev) => ({ ...prev, search: text }))
          }
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
      </View>

      {/* Quick Filters Row */}
      <View className="mb-4 flex-row items-center justify-between">
        <View className="flex-1 flex-row space-x-2">
          {/* Category Filter */}
          <View className="flex-1">
            <Select
              value={filters.category}
              onSelect={(value) =>
                handleFilterChange('category', value as string)
              }
              options={categoryOptions}
              placeholder="Category"
            />
          </View>

          {/* Sort Filter */}
          <View className="flex-1">
            <Select
              value={filters.sortBy}
              onSelect={(value) =>
                handleFilterChange(
                  'sortBy',
                  value as ProductSearchFilters['sortBy']
                )
              }
              options={sortOptions}
              placeholder="Sort by"
            />
          </View>

          {/* Sort Order Toggle */}
          <Pressable
            onPress={toggleSortOrder}
            className="items-center justify-center rounded-lg border border-gray-300 px-3 dark:border-gray-600"
          >
            <Text className="text-gray-700 dark:text-gray-300">
              {filters.sortOrder === 'asc' ? '↑' : '↓'}
            </Text>
          </Pressable>
        </View>

        {/* Advanced Filters Toggle */}
        {showAdvancedFilters && (
          <Pressable
            onPress={() => setShowFilters(!showFilters)}
            className="ml-2 rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600"
          >
            <Text className="text-sm text-gray-700 dark:text-gray-300">
              Filters {showFilters ? '−' : '+'}
            </Text>
          </Pressable>
        )}
      </View>

      {/* Advanced Filters */}
      {showAdvancedFilters && showFilters && (
        <View className="mb-4 rounded-lg border border-gray-200 p-4 dark:border-gray-700">
          {/* Price Range */}
          <View className="mb-4">
            <Text className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              Price Range
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {priceRangeOptions.map((option, index) => (
                <Pressable
                  key={index}
                  onPress={() => handlePriceRangeChange(option)}
                  className={`rounded-full border px-3 py-1 ${
                    filters.priceRange.min === option.min &&
                    filters.priceRange.max === option.max
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                >
                  <Text
                    className={`text-sm ${
                      filters.priceRange.min === option.min &&
                      filters.priceRange.max === option.max
                        ? 'text-blue-700 dark:text-blue-300'
                        : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Toggle Filters */}
          <View className="mb-4 flex-row flex-wrap gap-3">
            <Pressable
              onPress={() =>
                setFilters((prev) => ({
                  ...prev,
                  organicOnly: !prev.organicOnly,
                }))
              }
              className={`rounded-full border px-3 py-2 ${
                filters.organicOnly
                  ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                  : 'border-gray-300 dark:border-gray-600'
              }`}
            >
              <Text
                className={`text-sm ${
                  filters.organicOnly
                    ? 'text-green-700 dark:text-green-300'
                    : 'text-gray-700 dark:text-gray-300'
                }`}
              >
                🌱 Organic Only
              </Text>
            </Pressable>

            <Pressable
              onPress={() =>
                setFilters((prev) => ({ ...prev, inSeason: !prev.inSeason }))
              }
              className={`rounded-full border px-3 py-2 ${
                filters.inSeason
                  ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
                  : 'border-gray-300 dark:border-gray-600'
              }`}
            >
              <Text
                className={`text-sm ${
                  filters.inSeason
                    ? 'text-orange-700 dark:text-orange-300'
                    : 'text-gray-700 dark:text-gray-300'
                }`}
              >
                🍂 In Season
              </Text>
            </Pressable>

            <Pressable
              onPress={() =>
                setFilters((prev) => ({ ...prev, inStock: !prev.inStock }))
              }
              className={`rounded-full border px-3 py-2 ${
                filters.inStock
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-300 dark:border-gray-600'
              }`}
            >
              <Text
                className={`text-sm ${
                  filters.inStock
                    ? 'text-blue-700 dark:text-blue-300'
                    : 'text-gray-700 dark:text-gray-300'
                }`}
              >
                📦 In Stock
              </Text>
            </Pressable>
          </View>

          {/* Action Buttons */}
          <View className="flex-row space-x-3">
            <Button
              label="Reset Filters"
              onPress={handleReset}
              variant="outline"
              className="flex-1"
            />
            <Button
              label="Apply Filters"
              onPress={handleSearch}
              variant="default"
              className="flex-1"
              loading={loading}
            />
          </View>
        </View>
      )}

      {/* Search Button (when advanced filters are hidden) */}
      {!showAdvancedFilters && (
        <Button
          label="Search"
          onPress={handleSearch}
          variant="default"
          loading={loading}
        />
      )}
    </View>
  );
};
