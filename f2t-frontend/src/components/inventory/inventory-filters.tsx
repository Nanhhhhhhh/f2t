import {
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, TextInput, View as RNView } from 'react-native';

import { getCategoryLabel } from '@/api/products';
import { Text, View } from '@/components/ui';
import { useDebounce } from '@/lib/hooks/use-debounce';
import { PRODUCT_CATEGORY } from '@/types/constants';

type InventoryFilters = {
  search: string;
  category: string;
  stockStatus: 'all' | 'in_stock' | 'low_stock' | 'out_of_stock';
  status: 'all' | 'available' | 'sold_out' | 'unavailable';
  sortBy: 'name' | 'quantity' | 'price' | 'updated';
  sortOrder: 'asc' | 'desc';
};

type InventoryFiltersProps = {
  filters: InventoryFilters;
  onFiltersChange: (filters: Partial<InventoryFilters>) => void;
};

const STOCK_CHIPS: { label: string; value: InventoryFilters['stockStatus']; color: string; bg: string; activeBg: string; activeText: string }[] = [
  { label: 'Tất cả', value: 'all', color: 'text-gray-600', bg: 'bg-gray-100', activeBg: 'bg-gray-700', activeText: 'text-white' },
  { label: '⚠️ Sắp hết', value: 'low_stock', color: 'text-amber-700', bg: 'bg-amber-50', activeBg: 'bg-amber-500', activeText: 'text-white' },
  { label: '❌ Hết hàng', value: 'out_of_stock', color: 'text-red-700', bg: 'bg-red-50', activeBg: 'bg-red-500', activeText: 'text-white' },
  { label: '✅ Còn hàng', value: 'in_stock', color: 'text-green-700', bg: 'bg-green-50', activeBg: 'bg-green-600', activeText: 'text-white' },
];

const STATUS_CHIPS: { label: string; value: InventoryFilters['status'] }[] = [
  { label: 'Tất cả', value: 'all' },
  { label: 'Đang bán', value: 'available' },
  { label: 'Hết hàng', value: 'sold_out' },
  { label: 'Tạm ẩn', value: 'unavailable' },
];

const SORT_OPTIONS: { label: string; value: InventoryFilters['sortBy'] }[] = [
  { label: 'Tên', value: 'name' },
  { label: 'Số lượng', value: 'quantity' },
  { label: 'Giá', value: 'price' },
  { label: 'Cập nhật', value: 'updated' },
];

const CATEGORIES = Object.entries(PRODUCT_CATEGORY);

export const InventoryFilters = ({
  filters,
  onFiltersChange,
}: InventoryFiltersProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [localSearch, setLocalSearch] = useState(filters.search);
  const debouncedSearch = useDebounce(localSearch, 400);

  useEffect(() => {
    if (debouncedSearch !== filters.search) {
      onFiltersChange({ search: debouncedSearch });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  const handleClearFilters = () => {
    setLocalSearch('');
    onFiltersChange({
      search: '',
      category: 'all',
      stockStatus: 'all',
      status: 'all',
      sortBy: 'name',
      sortOrder: 'asc',
    });
  };

  const hasActiveFilters =
    filters.search !== '' ||
    filters.category !== 'all' ||
    filters.stockStatus !== 'all' ||
    filters.status !== 'all' ||
    filters.sortBy !== 'name' ||
    filters.sortOrder !== 'asc';

  const activeCount = [
    filters.category !== 'all',
    filters.stockStatus !== 'all',
    filters.status !== 'all',
    filters.sortBy !== 'name' || filters.sortOrder !== 'asc',
  ].filter(Boolean).length;

  return (
    <View className="bg-white dark:bg-gray-900">
      {/* ─── Search row ─────────────────────────────── */}
      <View className="flex-row items-center gap-2 px-4 py-3">
        {/* Search input */}
        <View className="flex-1 flex-row items-center gap-2 rounded-xl bg-gray-100 px-3 py-2.5 dark:bg-gray-800">
          <Search size={15} color="#9CA3AF" />
          <TextInput
            className="flex-1 text-sm text-gray-900 dark:text-white"
            placeholder="Tìm sản phẩm..."
            placeholderTextColor="#9CA3AF"
            value={localSearch}
            onChangeText={setLocalSearch}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
          />
          {localSearch.length > 0 && (
            <Pressable
              onPress={() => setLocalSearch('')}
              hitSlop={8}
            >
              <X size={14} color="#9CA3AF" />
            </Pressable>
          )}
        </View>

        {/* Filter toggle button */}
        <Pressable
          onPress={() => setIsExpanded(!isExpanded)}
          className={`flex-row items-center gap-1.5 rounded-xl border px-3 py-2.5 ${
            activeCount > 0
              ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/30'
              : 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800'
          }`}
        >
          <SlidersHorizontal
            size={15}
            color={activeCount > 0 ? '#FF6C00' : '#6B7280'}
          />
          <Text
            className={`text-sm font-semibold ${
              activeCount > 0 ? 'text-primary-600' : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            {activeCount > 0 ? `Lọc (${activeCount})` : 'Lọc'}
          </Text>
          {isExpanded ? (
            <ChevronUp size={13} color={activeCount > 0 ? '#FF6C00' : '#9CA3AF'} />
          ) : (
            <ChevronDown size={13} color={activeCount > 0 ? '#FF6C00' : '#9CA3AF'} />
          )}
        </Pressable>

        {/* Clear button */}
        {hasActiveFilters && (
          <Pressable
            onPress={handleClearFilters}
            className="rounded-xl bg-red-50 px-3 py-2.5 dark:bg-red-900/20"
          >
            <Text className="text-sm font-semibold text-red-500">Xóa</Text>
          </Pressable>
        )}
      </View>

      {/* ─── Quick stock chips (always visible) ─────── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 12, gap: 8 }}
      >
        {STOCK_CHIPS.map((chip) => {
          const active = filters.stockStatus === chip.value;
          return (
            <Pressable
              key={chip.value}
              onPress={() => onFiltersChange({ stockStatus: chip.value })}
              className={`rounded-full px-3.5 py-1.5 ${active ? chip.activeBg : chip.bg}`}
            >
              <Text
                className={`text-xs font-semibold ${active ? chip.activeText : chip.color}`}
              >
                {chip.label}
              </Text>
            </Pressable>
          );
        })}
        <View className="mx-1 w-px bg-gray-200 dark:bg-gray-700" />
        {CATEGORIES.slice(0, 5).map(([key]) => {
          const active = filters.category === key;
          return (
            <Pressable
              key={key}
              onPress={() =>
                onFiltersChange({ category: active ? 'all' : key })
              }
              className={`rounded-full px-3.5 py-1.5 ${
                active
                  ? 'bg-primary-600'
                  : 'bg-gray-100 dark:bg-gray-800'
              }`}
            >
              <Text
                className={`text-xs font-semibold ${
                  active ? 'text-white' : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                {getCategoryLabel(key as keyof typeof PRODUCT_CATEGORY)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* ─── Expanded advanced filters ───────────────── */}
      {isExpanded && (
        <View className="border-t border-gray-100 px-4 py-4 dark:border-gray-800">
          {/* Status row */}
          <View className="mb-4">
            <Text className="mb-2 text-[11px] font-bold uppercase tracking-widest text-gray-400">
              Trạng thái niêm yết
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {STATUS_CHIPS.map((chip) => {
                const active = filters.status === chip.value;
                return (
                  <Pressable
                    key={chip.value}
                    onPress={() => onFiltersChange({ status: chip.value })}
                    className={`rounded-xl border px-4 py-2 ${
                      active
                        ? 'border-primary-600 bg-primary-600'
                        : 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800'
                    }`}
                  >
                    <Text
                      className={`text-sm font-semibold ${
                        active ? 'text-white' : 'text-gray-600 dark:text-gray-300'
                      }`}
                    >
                      {chip.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Sort row */}
          <View className="mb-4">
            <Text className="mb-2 text-[11px] font-bold uppercase tracking-widest text-gray-400">
              Sắp xếp theo
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {SORT_OPTIONS.map((opt) => {
                const active = filters.sortBy === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    onPress={() => {
                      if (active) {
                        onFiltersChange({
                          sortOrder: filters.sortOrder === 'asc' ? 'desc' : 'asc',
                        });
                      } else {
                        onFiltersChange({ sortBy: opt.value, sortOrder: 'asc' });
                      }
                    }}
                    className={`flex-row items-center gap-1 rounded-xl border px-4 py-2 ${
                      active
                        ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/30'
                        : 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800'
                    }`}
                  >
                    <Text
                      className={`text-sm font-semibold ${
                        active
                          ? 'text-primary-700 dark:text-primary-400'
                          : 'text-gray-600 dark:text-gray-300'
                      }`}
                    >
                      {opt.label}
                    </Text>
                    {active && (
                      <Text className="text-xs text-primary-500">
                        {filters.sortOrder === 'asc' ? '↑' : '↓'}
                      </Text>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* All categories */}
          <View>
            <Text className="mb-2 text-[11px] font-bold uppercase tracking-widest text-gray-400">
              Danh mục
            </Text>
            <View className="flex-row flex-wrap gap-2">
              <Pressable
                onPress={() => onFiltersChange({ category: 'all' })}
                className={`rounded-xl border px-4 py-2 ${
                  filters.category === 'all'
                    ? 'border-primary-600 bg-primary-600'
                    : 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800'
                }`}
              >
                <Text
                  className={`text-sm font-semibold ${
                    filters.category === 'all' ? 'text-white' : 'text-gray-600 dark:text-gray-300'
                  }`}
                >
                  Tất cả
                </Text>
              </Pressable>
              {CATEGORIES.map(([key]) => {
                const active = filters.category === key;
                return (
                  <Pressable
                    key={key}
                    onPress={() => onFiltersChange({ category: active ? 'all' : key })}
                    className={`rounded-xl border px-4 py-2 ${
                      active
                        ? 'border-primary-600 bg-primary-600'
                        : 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800'
                    }`}
                  >
                    <Text
                      className={`text-sm font-semibold ${
                        active ? 'text-white' : 'text-gray-600 dark:text-gray-300'
                      }`}
                    >
                      {getCategoryLabel(key as keyof typeof PRODUCT_CATEGORY)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
      )}

      {/* Bottom divider */}
      <View className="h-px bg-gray-100 dark:bg-gray-800" />
    </View>
  );
};
