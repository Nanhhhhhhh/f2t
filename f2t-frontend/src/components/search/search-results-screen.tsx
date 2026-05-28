import { ArrowUpDown, ChevronDown, Search, SlidersHorizontal, X } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  TextInput,
} from 'react-native';

import { Button, Text, View } from '@/components/ui';
import { useDebounce } from '@/lib/hooks/use-debounce';

import {
  type SortOption,
  SortOptionsModal,
  type SortSelection,
} from './sort-options-modal';

export type SearchResultsScreenProps<T> = {
  // Data
  data: T[];
  isLoading?: boolean;
  isRefreshing?: boolean;
  error?: string | null;

  // Search
  searchQuery: string;
  onSearchChange: (query: string) => void;
  searchPlaceholder?: string;

  // Filters
  showFilters?: boolean;
  onFilterPress?: () => void;
  activeFilterCount?: number;

  // Sort
  sortOptions: SortOption[];
  currentSort: SortSelection;
  onSortChange: (sort: SortSelection) => void;

  // Rendering
  renderItem: (item: T, index: number) => React.ReactNode;
  keyExtractor: (item: T, index: number) => string;

  // Empty states
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: {
    label: string;
    onPress: () => void;
  };

  // Actions
  onRefresh?: () => void;
  onLoadMore?: () => void;

  // UI
  title: string;
  subtitle?: string;
  headerRight?: React.ReactNode;
  className?: string;
};

export function SearchResultsScreen<T>({
  data,
  isLoading = false,
  isRefreshing = false,
  error = null,
  searchQuery,
  onSearchChange,
  searchPlaceholder = 'Search...',
  showFilters = true,
  onFilterPress,
  activeFilterCount = 0,
  sortOptions,
  currentSort,
  onSortChange,
  renderItem,
  keyExtractor,
  emptyTitle = 'No results found',
  emptyDescription = 'Try adjusting your search or filters',
  emptyAction,
  onRefresh,
  onLoadMore,
  title,
  subtitle,
  headerRight,
  className = '',
}: SearchResultsScreenProps<T>) {
  const [showSortModal, setShowSortModal] = useState(false);
  const [localSearch, setLocalSearch] = useState(searchQuery);
  const debouncedSearch = useDebounce(localSearch, 400);

  useEffect(() => {
    onSearchChange(debouncedSearch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  // Sync local state when parent resets searchQuery to empty
  useEffect(() => {
    if (searchQuery === '' && localSearch !== '') setLocalSearch('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  // Get current sort label
  const currentSortLabel = useMemo(() => {
    const option = sortOptions.find(
      (opt) =>
        opt.value === currentSort.sortBy && opt.order === currentSort.sortOrder
    );
    return option?.label || 'Sort';
  }, [sortOptions, currentSort]);

  // Handle sort apply
  const handleSortApply = useCallback(
    (sort: SortSelection) => {
      onSortChange(sort);
    },
    [onSortChange]
  );

  // Handle clear search
  const handleClearSearch = useCallback(() => {
    setLocalSearch('');
    onSearchChange('');
  }, [onSearchChange]);

  // Render header
  const renderHeader = () => (
    <View className="bg-white dark:bg-gray-900">
      {/* Title row */}
      <View className="flex-row items-center justify-between px-4 pt-4 pb-3">
        <View className="flex-1">
          <Text className="text-xl font-bold text-gray-900 dark:text-white">
            {title}
          </Text>
          {subtitle && (
            <Text className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
              {subtitle}
            </Text>
          )}
        </View>
        {headerRight}
      </View>

      {/* Search bar */}
      <View className="flex-row items-center gap-2 px-4 pb-3">
        <View className="flex-1 flex-row items-center gap-2 rounded-xl bg-gray-100 px-3 py-2.5 dark:bg-gray-800">
          <Search size={15} color="#9CA3AF" />
          <TextInput
            className="flex-1 text-sm text-gray-900 dark:text-white"
            placeholder={searchPlaceholder}
            placeholderTextColor="#9CA3AF"
            value={localSearch}
            onChangeText={setLocalSearch}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
          />
          {localSearch.length > 0 && (
            <Pressable onPress={handleClearSearch} hitSlop={8}>
              <X size={14} color="#9CA3AF" />
            </Pressable>
          )}
        </View>
      </View>

      {/* Filter + Sort row */}
      <View className="flex-row items-center gap-2 px-4 pb-3">
        {showFilters && onFilterPress && (
          <Pressable
            onPress={onFilterPress}
            className={`flex-row items-center gap-1.5 rounded-xl border px-3 py-2 ${
              activeFilterCount > 0
                ? 'border-primary-500 bg-primary-50 dark:border-primary-400 dark:bg-primary-900/20'
                : 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800'
            }`}
          >
            <SlidersHorizontal
              size={14}
              color={activeFilterCount > 0 ? '#FF6C00' : '#6B7280'}
            />
            <Text
              className={`text-sm font-semibold ${
                activeFilterCount > 0
                  ? 'text-primary-700 dark:text-primary-300'
                  : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              {activeFilterCount > 0 ? `Lọc (${activeFilterCount})` : 'Lọc'}
            </Text>
          </Pressable>
        )}

        <Pressable
          onPress={() => setShowSortModal(true)}
          className="flex-1 flex-row items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
        >
          <View className="flex-row items-center gap-1.5">
            <ArrowUpDown size={14} color="#6B7280" />
            <Text
              className="text-sm font-semibold text-gray-600 dark:text-gray-400"
              numberOfLines={1}
            >
              {currentSortLabel}
            </Text>
          </View>
          <ChevronDown size={13} color="#9CA3AF" />
        </Pressable>

        {/* Result count pill */}
        {!isLoading && (
          <View className="rounded-xl bg-gray-100 px-3 py-2 dark:bg-gray-800">
            <Text className="text-sm font-semibold text-gray-500 dark:text-gray-400">
              {data.length}
            </Text>
          </View>
        )}
      </View>

      <View className="h-px bg-gray-100 dark:bg-gray-800" />
    </View>
  );

  // Render loading state
  const renderLoading = () => (
    <View className="flex-1 items-center justify-center p-8">
      <ActivityIndicator size="large" color="#FF6C00" />
      <Text className="mt-4 text-sm text-gray-400 dark:text-gray-500">
        Đang tìm kiếm...
      </Text>
    </View>
  );

  // Render error state
  const renderError = () => (
    <View className="flex-1 items-center justify-center p-8">
      <Text className="mb-2 text-center text-lg font-semibold text-gray-900 dark:text-white">
        Có lỗi xảy ra
      </Text>
      <Text className="mb-6 text-center text-sm text-gray-500 dark:text-gray-400">
        {error || 'Vui lòng thử lại'}
      </Text>
      {onRefresh && (
        <Button label="Thử lại" onPress={onRefresh} variant="outline" />
      )}
    </View>
  );

  // Render empty state
  const renderEmpty = () => (
    <View className="flex-1 items-center justify-center p-8">
      <View className="mb-4 size-20 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
        <Search size={40} className="text-gray-400" />
      </View>
      <Text className="mb-2 text-center text-xl font-semibold text-gray-900 dark:text-white">
        {emptyTitle}
      </Text>
      <Text className="mb-6 text-center text-gray-600 dark:text-gray-400">
        {emptyDescription}
      </Text>
      {emptyAction && (
        <Button
          label={emptyAction.label}
          onPress={emptyAction.onPress}
          variant="outline"
        />
      )}
    </View>
  );

  // Render results
  const renderResults = () => (
    <View className="flex-1">
      {data.map((item, index) => (
        <View key={keyExtractor(item, index)}>{renderItem(item, index)}</View>
      ))}
    </View>
  );

  return (
    <View className={`flex-1 bg-gray-50 dark:bg-gray-900 ${className}`}>
      {renderHeader()}

      <ScrollView
        className="flex-1"
        refreshControl={
          onRefresh ? (
            <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
          ) : undefined
        }
        onScroll={({ nativeEvent }) => {
          const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
          const isCloseToBottom =
            layoutMeasurement.height + contentOffset.y >=
            contentSize.height - 20;

          if (isCloseToBottom && onLoadMore && !isLoading) {
            onLoadMore();
          }
        }}
        scrollEventThrottle={400}
      >
        {isLoading && data.length === 0
          ? renderLoading()
          : error
            ? renderError()
            : data.length === 0
              ? renderEmpty()
              : renderResults()}
      </ScrollView>

      {/* Sort Modal */}
      <SortOptionsModal
        visible={showSortModal}
        onClose={() => setShowSortModal(false)}
        onApply={handleSortApply}
        options={sortOptions}
        initialSelection={currentSort}
      />
    </View>
  );
}
