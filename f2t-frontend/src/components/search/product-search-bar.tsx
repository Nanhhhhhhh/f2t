import { Filter, SortAsc, SortDesc } from 'lucide-react-native';
import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, TouchableOpacity } from 'react-native';

// import { Badge } from '@/components/ui/badge';
import { ProductCard } from '@/components/products/product-card';
import { Text as UIText, View } from '@/components/ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLocation } from '@/lib/hooks/use-location';
import type { Product } from '@/types';

import type { SearchFilter } from './search-bar';

// Product search specific types
export type ProductSearchFilter = SearchFilter & {
  maxDistance?: number;
  minRating?: number;
  farmName?: string;
  tags?: string[];
  seasonal?: boolean;
};

export type ProductSearchBarProps = {
  // Data
  products: Product[];

  // Configuration
  placeholder?: string;
  showLocationFilter?: boolean;
  showRatingFilter?: boolean;
  showFarmFilter?: boolean;
  showTagFilter?: boolean;
  showSeasonalFilter?: boolean;

  // Callbacks
  onSearch: (filter: ProductSearchFilter) => void;
  onProductPress?: (product: Product) => void;
  onFilterPress?: () => void;
  onSortPress?: () => void;
  onClear?: () => void;

  // State
  loading?: boolean;
  error?: string | null;
  currentFilter?: ProductSearchFilter;

  // Styling
  className?: string;
  showResults?: boolean;
  maxResults?: number;
};

// Product search utility functions
const searchInProduct = (product: Product, query: string): boolean => {
  if (!query.trim()) return true;

  const searchQuery = query.toLowerCase();
  const searchableFields = [
    product.name,
    product.description,
    product.category,
    product.subcategory,
    product.tags?.join(' '),
  ].filter(Boolean);

  return searchableFields.some((field) =>
    String(field).toLowerCase().includes(searchQuery)
  );
};

const filterByDistance = (
  product: Product,
  userLocation: { latitude: number; longitude: number } | null,
  maxDistance: number
): boolean => {
  // Product type doesn't have farm.location, so we'll skip this filter for now
  return true;
};

const filterByRating = (product: Product, minRating: number): boolean => {
  // Product type doesn't have rating, so we'll skip this filter for now
  return true;
};

const filterByFarm = (product: Product, farmName: string): boolean => {
  // Product type doesn't have farm, so we'll skip this filter for now
  return true;
};

const filterByTags = (product: Product, tags: string[]): boolean => {
  if (!tags.length) return true;
  return tags.some((tag) => product.tags?.includes(tag)) || false;
};

const filterBySeasonal = (product: Product, seasonal: boolean): boolean => {
  if (seasonal === undefined) return true;
  return Boolean(product.seasonalAvailability?.length) === seasonal;
};

const sortProducts = (
  products: Product[],
  sortBy: string | undefined,
  sortOrder: 'asc' | 'desc' = 'asc',
  userLocation: { latitude: number; longitude: number } | null = null
): Product[] => {
  if (!sortBy) return products;

  return [...products].sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case 'price':
        comparison = (a.pricePerUnit || 0) - (b.pricePerUnit || 0);
        break;
      case 'name':
        comparison = a.name.localeCompare(b.name);
        break;
      case 'rating':
        // Product type doesn't have rating, so we'll skip this sort for now
        comparison = 0;
        break;
      case 'distance':
        // Product type doesn't have farm.location, so we'll skip this sort for now
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

// Main ProductSearchBar component
export function ProductSearchBar({
  products,
  placeholder = 'Search products...',
  showLocationFilter = true,
  showRatingFilter = true,
  showFarmFilter = true,
  showTagFilter = true,
  showSeasonalFilter = true,
  onSearch,
  onProductPress,
  onFilterPress,
  onSortPress,
  onClear,
  loading = false,
  error = null,
  currentFilter,
  className = '',
  showResults = true,
  maxResults = 20,
}: ProductSearchBarProps) {
  const [query, setQuery] = useState(currentFilter?.query || '');
  const [filters, setFilters] = useState<ProductSearchFilter>(
    currentFilter || {
      query: '',
      maxDistance: 50,
      minRating: 0,
      tags: [],
      seasonal: undefined,
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
    (newFilters: Partial<ProductSearchFilter>) => {
      const updatedFilters = { ...filters, ...newFilters };
      setFilters(updatedFilters);
      onSearch(updatedFilters);
    },
    [filters, onSearch]
  );

  // Filter and search products
  const filteredProducts = useMemo(() => {
    let result = products;

    // Apply text search
    if (query.trim()) {
      result = result.filter((product) => searchInProduct(product, query));
    }

    // Apply distance filter
    if (filters.maxDistance && userLocation) {
      result = result.filter((product) =>
        filterByDistance(product, userLocation, filters.maxDistance!)
      );
    }

    // Apply rating filter
    if (filters.minRating && filters.minRating > 0) {
      result = result.filter((product) =>
        filterByRating(product, filters.minRating!)
      );
    }

    // Apply farm filter
    if (filters.farmName) {
      result = result.filter((product) =>
        filterByFarm(product, filters.farmName!)
      );
    }

    // Apply tag filter
    if (filters.tags && filters.tags.length > 0) {
      result = result.filter((product) => filterByTags(product, filters.tags!));
    }

    // Apply seasonal filter
    if (filters.seasonal !== undefined) {
      result = result.filter((product) =>
        filterBySeasonal(product, filters.seasonal!)
      );
    }

    // Apply sorting
    result = sortProducts(
      result,
      filters.sortBy,
      filters.sortOrder,
      userLocation
    );

    // Limit results
    if (maxResults && result.length > maxResults) {
      result = result.slice(0, maxResults);
    }

    return result;
  }, [products, query, filters, userLocation, maxResults]);

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

    if (filters.tags && filters.tags.length > 0) {
      activeFilters.push(
        <View
          key="tags"
          className="mb-2 mr-2 rounded-full bg-gray-100 px-2 py-1 dark:bg-gray-800"
        >
          <UIText className="text-xs text-gray-700 dark:text-gray-300">
            {filters.tags.length} tags
          </UIText>
        </View>
      );
    }

    if (filters.seasonal !== undefined) {
      activeFilters.push(
        <View
          key="seasonal"
          className="mb-2 mr-2 rounded-full bg-gray-100 px-2 py-1 dark:bg-gray-800"
        >
          <UIText className="text-xs text-gray-700 dark:text-gray-300">
            {filters.seasonal ? 'Seasonal' : 'Year-round'}
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
              tags: [],
              seasonal: undefined,
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

  // Render product result
  const renderProduct = (product: Product, index: number) => {
    return (
      <ProductCard
        key={product.id}
        product={product}
        onPress={() => onProductPress?.(product)}
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
          ) : filteredProducts.length === 0 ? (
            <View className="flex-row items-center justify-center py-8">
              <UIText className="text-gray-500 dark:text-gray-400">
                {query
                  ? 'No products found'
                  : 'Start typing to search products...'}
              </UIText>
            </View>
          ) : (
            <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
              {filteredProducts.map(renderProduct)}
            </ScrollView>
          )}
        </View>
      )}

      {/* Search Stats */}
      {query && filteredProducts.length > 0 && (
        <View className="flex-row items-center justify-between border-t border-gray-200 pt-2 dark:border-gray-700">
          <UIText className="text-sm text-gray-600 dark:text-gray-400">
            {filteredProducts.length} product
            {filteredProducts.length !== 1 ? 's' : ''} found
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
// export type { ProductSearchFilter, ProductSearchBarProps };
