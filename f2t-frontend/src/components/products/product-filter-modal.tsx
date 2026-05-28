import { Check, Leaf, MapPin, Package, SlidersHorizontal, Sun, X } from 'lucide-react-native';
import React, { useCallback, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View as RNView } from 'react-native';

import { Button, Text, View } from '@/components/ui';
import { useLocation } from '@/lib/hooks/use-location';
import type { ProductCategory } from '@/types';
import { PRODUCT_CATEGORY } from '@/types/constants';

export type ProductFilterOptions = {
  categories: ProductCategory[];
  priceRange: { min: number; max: number };
  organicOnly: boolean;
  inSeason: boolean;
  inStock: boolean;
  maxDistance?: number;
  sortBy: 'name' | 'price' | 'distance' | 'harvestDate' | 'popularity';
  sortOrder: 'asc' | 'desc';
};

type ProductFilterModalProps = {
  visible: boolean;
  onClose: () => void;
  onApply: (filters: ProductFilterOptions) => void;
  initialFilters?: Partial<ProductFilterOptions>;
  showLocationFilter?: boolean;
  showSortOptions?: boolean;
};

const DEFAULT_FILTERS: ProductFilterOptions = {
  categories: [],
  priceRange: { min: 0, max: 500000 },
  organicOnly: false,
  inSeason: false,
  inStock: true,
  sortBy: 'name',
  sortOrder: 'asc',
};

const PRICE_RANGES = [
  { label: 'Dưới 50k', min: 0, max: 50000 },
  { label: '50–100k', min: 50000, max: 100000 },
  { label: '100–200k', min: 100000, max: 200000 },
  { label: '200–500k', min: 200000, max: 500000 },
  { label: 'Trên 500k', min: 500000, max: 9999999 },
];

const DISTANCE_OPTIONS = [
  { label: '5 km', value: 5 },
  { label: '10 km', value: 10 },
  { label: '25 km', value: 25 },
  { label: '50 km', value: 50 },
  { label: '100 km', value: 100 },
  { label: 'Tất cả', value: undefined },
];

const SORT_OPTIONS: {
  label: string;
  value: ProductFilterOptions['sortBy'];
  order: 'asc' | 'desc';
}[] = [
  { label: 'Tên A → Z', value: 'name', order: 'asc' },
  { label: 'Giá thấp nhất', value: 'price', order: 'asc' },
  { label: 'Tên Z → A', value: 'name', order: 'desc' },
  { label: 'Giá cao nhất', value: 'price', order: 'desc' },
  { label: 'Mới thu hoạch', value: 'harvestDate', order: 'desc' },
  { label: 'Gần nhất', value: 'distance', order: 'asc' },
];

const CATEGORY_EMOJI: Record<string, string> = {
  vegetables: '🥦',
  fruits: '🍓',
  herbs: '🌿',
  mushrooms: '🍄',
  grains: '🌾',
  dairy: '🥛',
  eggs: '🥚',
  honey: '🍯',
  other: '📦',
};

const CATEGORY_SHORT_LABELS: Record<string, string> = {
  vegetables: 'Rau củ',
  fruits: 'Trái cây',
  herbs: 'Rau thơm',
  mushrooms: 'Nấm',
  grains: 'Ngũ cốc',
  dairy: 'Sữa',
  eggs: 'Trứng',
  honey: 'Mật ong',
  other: 'Khác',
};

// ─── Sub-components ───────────────────────────────────────────────

function SectionLabel({ children }: { children: string }) {
  return (
    <Text className="mb-3 text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
      {children}
    </Text>
  );
}

function Toggle({ value }: { value: boolean }) {
  return (
    <RNView
      style={[
        styles.toggleTrack,
        { backgroundColor: value ? '#FF6C00' : '#E5E7EB' },
      ]}
    >
      <RNView style={[styles.toggleThumb, { transform: [{ translateX: value ? 18 : 2 }] }]} />
    </RNView>
  );
}

// ─── Main modal ───────────────────────────────────────────────────

export function ProductFilterModal({
  visible,
  onClose,
  onApply,
  initialFilters,
  showLocationFilter = true,
  showSortOptions = true,
}: ProductFilterModalProps) {
  const [filters, setFilters] = useState<ProductFilterOptions>({
    ...DEFAULT_FILTERS,
    ...initialFilters,
  });
  const { coordinates: location } = useLocation();

  const toggleCategory = useCallback((category: ProductCategory) => {
    setFilters((prev) => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter((c) => c !== category)
        : [...prev.categories, category],
    }));
  }, []);

  const setPriceRange = useCallback((min: number, max: number) => {
    setFilters((prev) => ({ ...prev, priceRange: { min, max } }));
  }, []);

  const setMaxDistance = useCallback((distance: number | undefined) => {
    setFilters((prev) => ({ ...prev, maxDistance: distance }));
  }, []);

  const setSort = useCallback(
    (sortBy: ProductFilterOptions['sortBy'], sortOrder: 'asc' | 'desc') => {
      setFilters((prev) => ({ ...prev, sortBy, sortOrder }));
    },
    []
  );

  const toggle = useCallback((key: 'organicOnly' | 'inSeason' | 'inStock') => {
    setFilters((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const handleReset = useCallback(() => setFilters(DEFAULT_FILTERS), []);

  const handleApply = useCallback(() => {
    onApply(filters);
    onClose();
  }, [filters, onApply, onClose]);

  const activeCount =
    filters.categories.length +
    (filters.organicOnly ? 1 : 0) +
    (filters.inSeason ? 1 : 0) +
    (!filters.inStock ? 1 : 0) +
    (filters.maxDistance !== undefined ? 1 : 0) +
    (filters.priceRange.min !== 0 || filters.priceRange.max !== 500000 ? 1 : 0);

  const categories = Object.entries(PRODUCT_CATEGORY);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/50">
        <Pressable className="flex-1" onPress={onClose} />

        <View className="rounded-t-3xl bg-white dark:bg-gray-900">
          {/* Drag handle */}
          <View className="items-center pb-1 pt-2.5">
            <View className="h-1 w-10 rounded-full bg-gray-200 dark:bg-gray-700" />
          </View>

          {/* Header */}
          <View className="flex-row items-center justify-between px-5 py-3">
            <View className="flex-row items-center gap-2.5">
              <View className="size-8 items-center justify-center rounded-xl bg-primary-50 dark:bg-primary-900/30">
                <SlidersHorizontal size={16} color="#FF6C00" />
              </View>
              <Text className="text-base font-bold text-gray-900 dark:text-white">
                Bộ lọc
              </Text>
              {activeCount > 0 && (
                <View className="min-w-[20px] items-center rounded-full bg-primary-600 px-1.5 py-0.5">
                  <Text className="text-[11px] font-bold text-white">{activeCount}</Text>
                </View>
              )}
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={8}
              className="size-8 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800"
            >
              <X size={16} color="#6B7280" />
            </Pressable>
          </View>

          <View className="h-px bg-gray-100 dark:bg-gray-800" />

          {/* Scrollable content */}
          <ScrollView
            className="max-h-[74vh]"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 8 }}
          >
            {/* ── Categories ── */}
            <View className="px-5 pt-5 pb-4">
              <SectionLabel>Danh mục</SectionLabel>
              <View className="flex-row flex-wrap gap-2">
                {categories.map(([, value]) => {
                  const active = filters.categories.includes(value as ProductCategory);
                  return (
                    <Pressable
                      key={value}
                      onPress={() => toggleCategory(value as ProductCategory)}
                      className={`flex-row items-center gap-1.5 rounded-2xl border px-3 py-2 ${
                        active
                          ? 'border-primary-500 bg-primary-50 dark:border-primary-400 dark:bg-primary-900/25'
                          : 'border-gray-150 bg-gray-50 dark:border-gray-700 dark:bg-gray-800'
                      }`}
                    >
                      <Text className="text-base leading-none">
                        {CATEGORY_EMOJI[value] ?? '📦'}
                      </Text>
                      <Text
                        className={`text-xs font-semibold ${
                          active
                            ? 'text-primary-700 dark:text-primary-300'
                            : 'text-gray-600 dark:text-gray-300'
                        }`}
                      >
                        {CATEGORY_SHORT_LABELS[value] ?? value}
                      </Text>
                      {active && (
                        <View className="size-3.5 items-center justify-center rounded-full bg-primary-600">
                          <Check size={8} color="#fff" strokeWidth={3} />
                        </View>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View className="h-px bg-gray-100 dark:bg-gray-800" />

            {/* ── Price range ── */}
            <View className="px-5 pt-4 pb-4">
              <SectionLabel>Khoảng giá</SectionLabel>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8 }}
              >
                {PRICE_RANGES.map((r) => {
                  const active =
                    filters.priceRange.min === r.min && filters.priceRange.max === r.max;
                  return (
                    <Pressable
                      key={r.label}
                      onPress={() => setPriceRange(r.min, r.max)}
                      className={`rounded-full border px-4 py-2 ${
                        active
                          ? 'border-primary-600 bg-primary-600'
                          : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800'
                      }`}
                    >
                      <Text
                        className={`text-sm font-semibold ${
                          active ? 'text-white' : 'text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {r.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            <View className="h-px bg-gray-100 dark:bg-gray-800" />

            {/* ── Attribute toggles ── */}
            <View className="px-5 pt-4 pb-4">
              <SectionLabel>Thuộc tính</SectionLabel>
              <View className="overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700">
                {(
                  [
                    {
                      key: 'organicOnly' as const,
                      label: 'Hữu cơ',
                      sub: 'Chỉ sản phẩm hữu cơ',
                      icon: <Leaf size={15} color="#16a34a" />,
                      iconBg: 'bg-green-50 dark:bg-green-900/30',
                    },
                    {
                      key: 'inSeason' as const,
                      label: 'Đúng mùa',
                      sub: 'Đang trong mùa thu hoạch',
                      icon: <Sun size={15} color="#d97706" />,
                      iconBg: 'bg-amber-50 dark:bg-amber-900/30',
                    },
                    {
                      key: 'inStock' as const,
                      label: 'Còn hàng',
                      sub: 'Ẩn sản phẩm hết hàng',
                      icon: <Package size={15} color="#2563eb" />,
                      iconBg: 'bg-blue-50 dark:bg-blue-900/30',
                    },
                  ] as const
                ).map((item, i, arr) => (
                  <Pressable
                    key={item.key}
                    onPress={() => toggle(item.key)}
                    className={`flex-row items-center justify-between px-4 py-3.5 bg-white dark:bg-gray-800/50 ${
                      i < arr.length - 1 ? 'border-b border-gray-100 dark:border-gray-800' : ''
                    }`}
                  >
                    <View className="flex-row items-center gap-3">
                      <View className={`size-8 items-center justify-center rounded-xl ${item.iconBg}`}>
                        {item.icon}
                      </View>
                      <View>
                        <Text className="text-sm font-semibold text-gray-900 dark:text-white">
                          {item.label}
                        </Text>
                        <Text className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
                          {item.sub}
                        </Text>
                      </View>
                    </View>
                    <Toggle value={filters[item.key]} />
                  </Pressable>
                ))}
              </View>
            </View>

            {/* ── Distance ── */}
            {showLocationFilter && (
              <>
                <View className="h-px bg-gray-100 dark:bg-gray-800" />
                <View className="px-5 pt-4 pb-4">
                  <View className="mb-3 flex-row items-center gap-1.5">
                    <Text className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
                      Khoảng cách
                    </Text>
                    {!location && (
                      <View className="flex-row items-center gap-1">
                        <MapPin size={10} color="#d97706" />
                        <Text className="text-[10px] font-medium text-amber-600 dark:text-amber-400">
                          Cần bật GPS
                        </Text>
                      </View>
                    )}
                  </View>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 8 }}
                  >
                    {DISTANCE_OPTIONS.map((r) => {
                      const active = filters.maxDistance === r.value;
                      const disabled = !location && r.value !== undefined;
                      return (
                        <Pressable
                          key={r.label}
                          onPress={() => !disabled && setMaxDistance(r.value)}
                          className={`rounded-full border px-4 py-2 ${
                            active
                              ? 'border-primary-600 bg-primary-600'
                              : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800'
                          } ${disabled ? 'opacity-30' : ''}`}
                        >
                          <Text
                            className={`text-sm font-semibold ${
                              active ? 'text-white' : 'text-gray-700 dark:text-gray-300'
                            }`}
                          >
                            {r.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </View>
              </>
            )}

            {/* ── Sort ── */}
            {showSortOptions && (
              <>
                <View className="h-px bg-gray-100 dark:bg-gray-800" />
                <View className="px-5 pt-4 pb-5">
                  <SectionLabel>Sắp xếp</SectionLabel>
                  <View className="flex-row flex-wrap gap-2">
                    {SORT_OPTIONS.map((opt) => {
                      const active =
                        filters.sortBy === opt.value && filters.sortOrder === opt.order;
                      const disabled = opt.value === 'distance' && !location;
                      return (
                        <Pressable
                          key={`${opt.value}-${opt.order}`}
                          onPress={() => !disabled && setSort(opt.value, opt.order)}
                          className={`flex-row items-center gap-2 rounded-2xl border px-3.5 py-2.5 ${
                            active
                              ? 'border-primary-500 bg-primary-50 dark:border-primary-400 dark:bg-primary-900/25'
                              : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800'
                          } ${disabled ? 'opacity-30' : ''}`}
                        >
                          <RNView
                            style={[
                              styles.radioOuter,
                              active && styles.radioOuterActive,
                            ]}
                          >
                            {active && <RNView style={styles.radioDot} />}
                          </RNView>
                          <Text
                            className={`text-sm font-semibold ${
                              active
                                ? 'text-primary-700 dark:text-primary-300'
                                : 'text-gray-700 dark:text-gray-300'
                            }`}
                          >
                            {opt.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              </>
            )}
          </ScrollView>

          {/* Footer */}
          <View className="flex-row gap-3 border-t border-gray-100 px-5 py-4 dark:border-gray-800">
            <Button
              label="Đặt lại"
              onPress={handleReset}
              variant="outline"
              className="flex-1"
            />
            <Button
              label={activeCount > 0 ? `Áp dụng (${activeCount})` : 'Áp dụng'}
              onPress={handleApply}
              className="flex-1"
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  toggleTrack: {
    width: 44,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
  },
  toggleThumb: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  radioOuter: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterActive: {
    borderColor: '#FF6C00',
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF6C00',
  },
});
