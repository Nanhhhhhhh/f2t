import { useLocalSearchParams, useRouter } from 'expo-router';
import { Search, SlidersHorizontal, X } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { GetProductsRequest, ProductSearchFilters } from '@/api/products';
import { getCategoryLabel, useGetProductsInfinite } from '@/api/products';
import { ProductList } from '@/components/products';
import {
  ProductFilterModal,
  type ProductFilterOptions,
} from '@/components/products/product-filter-modal';
import { Text, View } from '@/components/ui';
import { useDebounce } from '@/lib/hooks/use-debounce';
import { useAuth } from '@/lib/auth';
import { useAddToCart } from '@/lib/cart';
import { PRODUCT_CATEGORY } from '@/types/constants';
import type { Product } from '@/types';

const CATEGORY_TABS = [
  { label: 'Tất cả', value: 'all', emoji: '' },
  { label: 'Rau lá', value: PRODUCT_CATEGORY.LEAFY, emoji: '🥬' },
  { label: 'Rau củ', value: PRODUCT_CATEGORY.ROOT, emoji: '🥕' },
  { label: 'Trái cây', value: PRODUCT_CATEGORY.FRUIT, emoji: '🍓' },
  { label: 'Rau thơm', value: PRODUCT_CATEGORY.HERBS, emoji: '🌿' },
  { label: 'Nấm', value: PRODUCT_CATEGORY.MUSHROOMS, emoji: '🍄' },
  { label: 'Ngũ cốc', value: PRODUCT_CATEGORY.GRAINS, emoji: '🌾' },
  { label: 'Sữa', value: PRODUCT_CATEGORY.DAIRY, emoji: '🥛' },
  { label: 'Trứng', value: PRODUCT_CATEGORY.EGGS, emoji: '🥚' },
  { label: 'Khác', value: PRODUCT_CATEGORY.OTHER, emoji: '📦' },
];

const SORT_OPTIONS: { label: string; sortBy: GetProductsRequest['sortBy']; sortOrder: 'asc' | 'desc' }[] = [
  { label: 'Tên A→Z', sortBy: 'name', sortOrder: 'asc' },
  { label: 'Giá thấp', sortBy: 'price', sortOrder: 'asc' },
  { label: 'Giá cao', sortBy: 'price', sortOrder: 'desc' },
  { label: 'Mới nhất', sortBy: 'createdAt', sortOrder: 'desc' },
];

export default function ProductsTabScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams();
  const isFarm = useAuth.use.isFarm();
  const addToCart = useAddToCart();
  const headerStyle = useMemo(() => ({ paddingTop: insets.top }), [insets.top]);

  const [searchInput, setSearchInput] = useState((params.search as string) || '');
  const debouncedSearch = useDebounce(searchInput, 400);
  const [activeCategory, setActiveCategory] = useState((params.category as string) || 'all');

  // Sync URL params into state when navigated from outside (e.g. home category banner)
  useEffect(() => {
    if (params.category) setActiveCategory(params.category as string);
  }, [params.category]);

  useEffect(() => {
    if (params.search) setSearchInput(params.search as string);
  }, [params.search]);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [sortIndex, setSortIndex] = useState(0);

  const [modalFilters, setModalFilters] = useState<ProductFilterOptions>({
    categories: [],
    priceRange: { min: 0, max: 500000 },
    organicOnly: false,
    inSeason: false,
    inStock: true,
    sortBy: 'name',
    sortOrder: 'asc',
  });

  const activeModalFilterCount =
    modalFilters.categories.length +
    (modalFilters.organicOnly ? 1 : 0) +
    (modalFilters.inSeason ? 1 : 0) +
    (!modalFilters.inStock ? 1 : 0) +
    (modalFilters.priceRange.min !== 0 || modalFilters.priceRange.max !== 500000 ? 1 : 0);

  const currentSort = SORT_OPTIONS[sortIndex];

  const {
    data: productsResponse,
    isLoading,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useGetProductsInfinite({
    variables: {
      search: debouncedSearch || undefined,
      category: activeCategory !== 'all' ? activeCategory : undefined,
      minPrice: modalFilters.priceRange.min,
      maxPrice: modalFilters.priceRange.max,
      organicOnly: modalFilters.organicOnly,
      inStock: modalFilters.inStock,
      sortBy: currentSort.sortBy,
      sortOrder: currentSort.sortOrder,
      limit: 10,
    },
  });

  const products = useMemo(() => {
    const all =
      productsResponse?.pages?.flatMap((page) =>
        page.success ? page.data?.items || page.data?.products || [] : []
      ) || [];
    // Khử trùng theo id: các trang infinite query đôi khi chồng lặp sản phẩm
    // (sort theo tên có thể không ổn định ở ranh giới trang) → tránh duplicate key.
    const seen = new Set<string>();
    return all.filter((p) => {
      if (!p?.id || seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });
  }, [productsResponse]);

  const totalCount = productsResponse?.pages?.[0]?.success
    ? productsResponse.pages[0].data?.total || 0
    : 0;

  const handleProductPress = useCallback(
    (product: Product) => router.push(`/products/${product.id}`),
    [router]
  );

  const handleAddToCart = useCallback(
    (product: Product) => addToCart(product, 1),
    [addToCart]
  );

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleFilterApply = useCallback((filters: ProductFilterOptions) => {
    setModalFilters(filters);
  }, []);

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      {/* ── Header with safe area ── */}
      <View
        className="bg-white dark:bg-gray-900"
        style={headerStyle}
      >
        {/* Title row */}
        <View className="flex-row items-center justify-between px-4 pt-3 pb-2">
          <Text className="text-xl font-bold text-gray-900 dark:text-white">
            Sản phẩm
          </Text>
          {totalCount > 0 && (
            <View className="rounded-full bg-gray-100 px-2.5 py-1 dark:bg-gray-800">
              <Text className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                {totalCount}
              </Text>
            </View>
          )}
        </View>

        {/* Search bar */}
        <View className="flex-row items-center gap-2 px-4 pb-3">
          <View className="flex-1 flex-row items-center gap-2 rounded-xl bg-gray-100 px-3 py-2.5 dark:bg-gray-800">
            <Search size={15} color="#9CA3AF" />
            <TextInput
              className="flex-1 text-sm text-gray-900 dark:text-white"
              placeholder="Tìm sản phẩm..."
              placeholderTextColor="#9CA3AF"
              value={searchInput}
              onChangeText={setSearchInput}
              returnKeyType="search"
              autoCorrect={false}
              autoCapitalize="none"
            />
            {searchInput.length > 0 && (
              <Pressable hitSlop={8} onPress={() => setSearchInput('')}>
                <X size={14} color="#9CA3AF" />
              </Pressable>
            )}
          </View>

          {/* Filter button */}
          <Pressable
            onPress={() => setShowFilterModal(true)}
            className={`flex-row items-center gap-1.5 rounded-xl border px-3 py-2.5 ${
              activeModalFilterCount > 0
                ? 'border-primary-500 bg-primary-50 dark:border-primary-400 dark:bg-primary-900/20'
                : 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800'
            }`}
          >
            <SlidersHorizontal
              size={15}
              color={activeModalFilterCount > 0 ? '#FF6C00' : '#6B7280'}
            />
            <Text
              className={`text-sm font-semibold ${
                activeModalFilterCount > 0
                  ? 'text-primary-700 dark:text-primary-300'
                  : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              {activeModalFilterCount > 0 ? `Lọc (${activeModalFilterCount})` : 'Lọc'}
            </Text>
          </Pressable>
        </View>

        {/* Category chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 12, gap: 8 }}
        >
          {CATEGORY_TABS.map((tab) => {
            const active = activeCategory === tab.value;
            return (
              <Pressable
                key={tab.value}
                onPress={() => setActiveCategory(tab.value)}
                className={`flex-row items-center rounded-full px-3.5 py-1.5 ${
                  active
                    ? 'bg-primary-600'
                    : 'bg-gray-100 dark:bg-gray-800'
                }`}
              >
                {tab.emoji ? (
                  <Text className="mr-1 text-sm">{tab.emoji}</Text>
                ) : null}
                <Text
                  className={`text-xs font-semibold ${
                    active ? 'text-white' : 'text-gray-600 dark:text-gray-400'
                  }`}
                >
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Sort row */}
        <View className="flex-row items-center gap-2 border-t border-gray-100 px-4 py-2 dark:border-gray-800">
          <Text className="text-xs text-gray-400 dark:text-gray-500">Sắp xếp:</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 6 }}
          >
            {SORT_OPTIONS.map((opt, idx) => {
              const active = sortIndex === idx;
              return (
                <Pressable
                  key={idx}
                  onPress={() => setSortIndex(idx)}
                  className={`rounded-full px-3 py-1 ${
                    active
                      ? 'bg-gray-800 dark:bg-white'
                      : 'bg-gray-100 dark:bg-gray-800'
                  }`}
                >
                  <Text
                    className={`text-xs font-semibold ${
                      active ? 'text-white dark:text-gray-900' : 'text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        <View className="h-px bg-gray-100 dark:bg-gray-800" />
      </View>

      {/* ── Product list ── */}
      <ProductList
        products={products}
        onProductPress={handleProductPress}
        onAddToCart={handleAddToCart}
        layout="grid"
        showFarmInfo={true}
        showAddToCart={!isFarm()}
        loading={isLoading}
        error={error?.message || null}
        emptyMessage={
          debouncedSearch || activeCategory !== 'all' || activeModalFilterCount > 0
            ? 'Không có sản phẩm phù hợp. Thử thay đổi bộ lọc.'
            : 'Chưa có sản phẩm nào. Quay lại sau nhé!'
        }
        onRefresh={() => refetch()}
        refreshing={false}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        isFetchingNextPage={isFetchingNextPage}
        hasNextPage={hasNextPage}
      />

      {/* ── Filter modal ── */}
      <ProductFilterModal
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        onApply={handleFilterApply}
        initialFilters={modalFilters}
        showLocationFilter={false}
        showSortOptions={false}
      />
    </View>
  );
}
