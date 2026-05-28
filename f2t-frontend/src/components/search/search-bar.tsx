import { Search, X } from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { useDebounce } from '@/lib/hooks/use-debounce';

// Legacy types kept for backward compat (used by farm-search-bar, product-search-bar)
export type SearchFilter = {
  query: string;
  category?: string;
  priceRange?: { min: number; max: number };
  location?: { latitude: number; longitude: number; radius: number };
  sortBy?: 'relevance' | 'price' | 'distance' | 'name' | 'rating';
  sortOrder?: 'asc' | 'desc';
  inStock?: boolean;
  organic?: boolean;
  farmId?: string;
};

export type SearchResult<T> = {
  items: T[];
  totalCount: number;
  hasMore: boolean;
  filters: SearchFilter;
};

export type SearchBarProps = {
  value?: string;
  onChangeDebounced?: (value: string) => void;
  /** @deprecated use onChangeDebounced */
  onSearch?: (filter: SearchFilter) => void;
  placeholder?: string;
  debounceMs?: number;
  className?: string;
  // Legacy props (ignored — kept for backward compat with existing usages)
  data?: unknown[];
  searchFields?: string[];
  loading?: boolean;
  error?: string | null;
  showFilters?: boolean;
  showSort?: boolean;
  onFilterPress?: () => void;
  onSortPress?: () => void;
  onClear?: () => void;
  minQueryLength?: number;
  renderResult?: (item: unknown, index: number) => React.ReactNode;
  renderEmpty?: () => React.ReactNode;
  renderError?: (error: string) => React.ReactNode;
  inputClassName?: string;
  buttonClassName?: string;
};

export const SearchBar = ({
  value: externalValue = '',
  onChangeDebounced,
  placeholder = 'Search...',
  debounceMs = 400,
  className,
}: // eslint-disable-next-line @typescript-eslint/no-unused-vars
SearchBarProps) => {
  const [localValue, setLocalValue] = useState(externalValue);
  const debounced = useDebounce(localValue, debounceMs);

  useEffect(() => {
    onChangeDebounced?.(debounced);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  useEffect(() => {
    if (externalValue !== localValue) setLocalValue(externalValue);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalValue]);

  const handleClear = useCallback(() => {
    setLocalValue('');
    onChangeDebounced?.('');
  }, [onChangeDebounced]);

  return (
    <View
      className={
        'flex-row items-center rounded-xl border border-gray-200 bg-white px-3 py-2 dark:border-gray-600 dark:bg-gray-800 ' +
        (className ?? '')
      }
    >
      <Search size={16} color="#9CA3AF" style={{ marginRight: 8 }} />
      <TextInput
        className="flex-1 text-sm text-gray-900 dark:text-white"
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
        value={localValue}
        onChangeText={setLocalValue}
        returnKeyType="search"
        autoCorrect={false}
        autoCapitalize="none"
      />
      {localValue.length > 0 && (
        <Pressable onPress={handleClear} hitSlop={8}>
          <X size={14} color="#9CA3AF" />
        </Pressable>
      )}
    </View>
  );
};
