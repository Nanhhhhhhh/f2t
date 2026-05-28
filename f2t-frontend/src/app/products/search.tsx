import { useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';

import { useGetProductsInfinite } from '@/api/products';
import { ProductCard } from '@/components/products';
import {
  ProductFilterModal,
  type ProductFilterOptions,
} from '@/components/products/product-filter-modal';
import {
  SearchResultsScreen,
  type SortOption,
  type SortSelection,
} from '@/components/search';
import { useDebounce } from '@/lib/hooks/use-debounce';
import { useLocation } from '@/lib/hooks/use-location';
import type { Product } from '@/types';

// Product sort options
const PRODUCT_SORT_OPTIONS: SortOption[] = [
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
    label: 'Price (Low to High)',
    value: 'price',
    order: 'asc',
    description: 'Cheapest first',
  },
  {
    label: 'Price (High to Low)',
    value: 'price',
    order: 'desc',
    description: 'Most expensive first',
  },
  {
    label: 'Recently Harvested',
    value: 'harvestDate',
    order: 'desc',
    description: 'Freshest products',
  },
  {
    label: 'Most Popular',
    value: 'popularity',
    order: 'desc',
    description: 'Best sellers',
  },
  {
    label: 'Nearest First',
    value: 'distance',
    order: 'asc',
    description: 'Closest to you',
  },
];

export default function ProductSearchScreen() {
  const router = useRouter();
  const { coordinates: userLocation } = useLocation();

  // Search state
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput, 400);
  const [showFilters, setShowFilters] = useState(false);

  // Filter state
  const [filters, setFilters] = useState<ProductFilterOptions>({
    categories: [],
    priceRange: { min: 0, max: 1000 },
    organicOnly: false,
    inSeason: false,
    inStock: true,
    sortBy: 'name',
    sortOrder: 'asc',
  });

  // Sort state
  const [currentSort, setCurrentSort] = useState<SortSelection>({
    sortBy: 'name',
    sortOrder: 'asc',
  });

  // Fetch products (infinite scroll)
  const {
    data: productsResponse,
    isLoading,
    error,
    refetch,
    isFetching,
    fetchNextPage,
    hasNextPage,
  } = useGetProductsInfinite({
    variables: {
      search: debouncedSearch || undefined,
      category:
        filters.categories.length > 0 ? filters.categories[0] : undefined,
      minPrice: filters.priceRange.min,
      maxPrice: filters.priceRange.max,
      organicOnly: filters.organicOnly,
      inStock: filters.inStock,
      sortBy: currentSort.sortBy as any,
      sortOrder: currentSort.sortOrder,
      limit: 20,
    },
  });

  const products = useMemo(() => {
    return (
      productsResponse?.pages?.flatMap((page) =>
        page.success ? page.data?.products || page.data?.items || [] : []
      ) || []
    );
  }, [productsResponse]);

  // Handle search change (updates raw input; debounce handled above)
  const handleSearchChange = useCallback((query: string) => {
    setSearchInput(query);
  }, []);

  // Handle filter apply
  const handleFilterApply = useCallback((newFilters: ProductFilterOptions) => {
    setFilters(newFilters);
    setCurrentSort({
      sortBy: newFilters.sortBy,
      sortOrder: newFilters.sortOrder,
    });
  }, []);

  // Handle sort change
  const handleSortChange = useCallback((sort: SortSelection) => {
    setCurrentSort(sort);
    setFilters((prev) => ({
      ...prev,
      sortBy: sort.sortBy as ProductFilterOptions['sortBy'],
      sortOrder: sort.sortOrder,
    }));
  }, []);

  // Handle product press
  const handleProductPress = useCallback(
    (product: Product) => {
      router.push(`/products/${product.id}`);
    },
    [router]
  );

  // Calculate active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.categories.length > 0) count++;
    if (filters.organicOnly) count++;
    if (filters.inSeason) count++;
    if (!filters.inStock) count++;
    if (filters.maxDistance !== undefined) count++;
    if (filters.priceRange.min !== 0 || filters.priceRange.max !== 1000)
      count++;
    return count;
  }, [filters]);

  // Filter sort options based on location availability
  const availableSortOptions = useMemo(() => {
    if (!userLocation) {
      return PRODUCT_SORT_OPTIONS.filter((opt) => opt.value !== 'distance');
    }
    return PRODUCT_SORT_OPTIONS;
  }, [userLocation]);

  return (
    <>
      <SearchResultsScreen
        data={products}
        isLoading={isLoading}
        isRefreshing={isFetching}
        error={error ? 'Failed to load products' : null}
        searchQuery={searchInput}
        onSearchChange={handleSearchChange}
        searchPlaceholder="Tìm tên sản phẩm..."
        showFilters={true}
        onFilterPress={() => setShowFilters(true)}
        activeFilterCount={activeFilterCount}
        sortOptions={availableSortOptions}
        currentSort={currentSort}
        onSortChange={handleSortChange}
        renderItem={(product: Product) => (
          <ProductCard
            product={product}
            onPress={() => handleProductPress(product)}
            variant="default"
          />
        )}
        keyExtractor={(product: Product) => product.id}
        emptyTitle="Không tìm thấy sản phẩm"
        emptyDescription={
          debouncedSearch
            ? `Không có kết quả cho "${debouncedSearch}". Thử từ khóa khác hoặc thay đổi bộ lọc.`
            : 'Tìm kiếm để khám phá thực phẩm sạch từ các trang trại gần bạn.'
        }
        onLoadMore={hasNextPage ? fetchNextPage : undefined}
        emptyAction={{
          label: 'Xóa bộ lọc',
          onPress: () => {
            setSearchInput('');
            setFilters({
              categories: [],
              priceRange: { min: 0, max: 1000 },
              organicOnly: false,
              inSeason: false,
              inStock: true,
              sortBy: 'name',
              sortOrder: 'asc',
            });
          },
        }}
        onRefresh={refetch}
        title="Tìm sản phẩm"
        subtitle="Thực phẩm sạch từ trang trại gần bạn"
      />

      {/* Filter Modal */}
      <ProductFilterModal
        visible={showFilters}
        onClose={() => setShowFilters(false)}
        onApply={handleFilterApply}
        initialFilters={filters}
        showLocationFilter={!!userLocation}
        showSortOptions={false}
      />
    </>
  );
}
