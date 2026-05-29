import { useRouter } from 'expo-router';
import { Search } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  TextInput,
  TouchableOpacity,
} from 'react-native';

import { useGetFarms } from '@/api/farms';
import { formatPrice, useGetProducts } from '@/api/products';
import { FarmDashboard } from '@/components/dashboard';
import { FarmCard } from '@/components/farms/farm-card';
import { Image, Text, View } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { useLocation } from '@/lib/hooks/use-location';
import { PRODUCT_CATEGORY } from '@/types/constants';

const ASPECT_RATIO_STYLE = { aspectRatio: 4 / 3 } as const;
const MIN_HEIGHT_STYLE = { minHeight: 34 } as const;

const ConsumerHome = () => {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Get user location
  const { coordinates: location, isLoading: isLocationLoading } = useLocation();

  // Memoize farm query variables to prevent query key churn on every render
  const farmVariables = useMemo(
    () => ({
      limit: 4,
      location: location
        ? {
            latitude: location.latitude,
            longitude: location.longitude,
            radius: 100,
          }
        : undefined,
    }),
    [location?.latitude, location?.longitude]
  );

  const productsVariables = useMemo(() => ({ page: 1, limit: 6 }), []);

  // Fetch featured products (limit 6)
  const {
    data: productsData,
    isLoading: isProductsLoading,
    refetch: refetchProducts,
  } = useGetProducts({
    variables: productsVariables,
  });

  // Fetch nearby farms (limit 4)
  const {
    data: farmsData,
    isLoading: isFarmsLoading,
    refetch: refetchFarms,
  } = useGetFarms({
    variables: farmVariables,
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchProducts(), refetchFarms()]);
    setRefreshing(false);
  };

  const handleSearch = () => {
    if (searchQuery.trim()) {
      router.push(`/products?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  const categories = [
    {
      id: 'vegetables',
      label: 'Vegetables',
      icon: '🥬',
      value: PRODUCT_CATEGORY.VEGETABLES,
    },
    {
      id: 'fruits',
      label: 'Fruits',
      icon: '🍎',
      value: PRODUCT_CATEGORY.FRUITS,
    },
    { id: 'dairy', label: 'Sữa', icon: '🥛', value: PRODUCT_CATEGORY.DAIRY },
    { id: 'mushrooms', label: 'Nấm', icon: '🍄', value: PRODUCT_CATEGORY.MUSHROOMS },
  ];

  return (
    <ScrollView
      className="flex-1 bg-white dark:bg-gray-900"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      {/* Hero Section with Search */}
      <View className="bg-green-600 p-6 dark:bg-green-700">
        <Text className="mb-2 text-3xl font-bold text-white">
          Welcome to Farm Marketplace
        </Text>
        <Text className="mb-4 text-lg text-green-100">
          Fresh produce directly from local farms
        </Text>

        {/* Search Bar */}
        <View className="flex-row items-center rounded-lg bg-white p-3 dark:bg-gray-800">
          <Search size={20} color="#9CA3AF" />
          <TextInput
            className="ml-2 flex-1 text-gray-900 dark:text-white"
            placeholder="Search products..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
        </View>
      </View>

      {/* Category Quick Filters */}
      <View className="p-4">
        <Text className="mb-3 text-lg font-bold text-gray-900 dark:text-white">
          Shop by Category
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="space-x-3"
        >
          {categories.map((category) => (
            <TouchableOpacity
              key={category.id}
              onPress={() =>
                router.push(`/products?category=${category.value}`)
              }
              className="mr-3 items-center rounded-lg bg-gray-50 px-4 py-3 dark:bg-gray-800"
            >
              <Text className="mb-1 text-3xl">{category.icon}</Text>
              <Text className="text-sm font-medium text-gray-900 dark:text-white">
                {category.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Featured Products */}
      <View className="pt-4">
        <View className="mb-3 flex-row items-center justify-between px-4">
          <Text className="text-base font-bold text-gray-900 dark:text-white">
            Sản phẩm nổi bật
          </Text>
          <TouchableOpacity onPress={() => router.push('/products')}>
            <Text className="text-sm font-semibold text-primary-600 dark:text-primary-400">
              Xem tất cả
            </Text>
          </TouchableOpacity>
        </View>

        {isProductsLoading ? (
          <View className="items-center py-8">
            <ActivityIndicator size="large" color="#FF6C00" />
          </View>
        ) : ((productsData?.data?.items || productsData?.data?.products) ?? []).length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 12, paddingBottom: 4 }}
          >
            {(productsData!.data!.items || productsData!.data!.products)!.map((product) => (
              <Pressable
                key={product.id}
                onPress={() => router.push(`/products/${product.id}`)}
                className="w-36 overflow-hidden rounded-2xl border border-gray-100 bg-white dark:border-gray-800 dark:bg-gray-900"
              >
                {/* Image — fixed 4:3, always 108px tall at w-36 (144px) */}
                <View className="w-full overflow-hidden" style={ASPECT_RATIO_STYLE}>
                  {product.images?.[0] ? (
                    <Image
                      source={{ uri: product.images[0] }}
                      className="size-full"
                      contentFit="cover"
                    />
                  ) : (
                    <View className="size-full items-center justify-center bg-gray-100 dark:bg-gray-800">
                      <Text className="text-3xl">🥕</Text>
                    </View>
                  )}
                  {product.isOrganic && (
                    <View className="absolute left-1.5 top-1.5 rounded-full bg-green-500 px-1.5 py-0.5">
                      <Text className="text-[9px] font-bold text-white">HỮU CƠ</Text>
                    </View>
                  )}
                </View>

                {/* Content — fixed structure, no variable-height elements */}
                <View className="p-2.5">
                  {/* Name: always reserves 2-line height via minHeight */}
                  <Text
                    className="mb-1.5 text-xs font-semibold leading-[17px] text-gray-900 dark:text-white"
                    numberOfLines={2}
                    style={MIN_HEIGHT_STYLE}
                  >
                    {product.name}
                  </Text>
                  {/* Price: always 1 line */}
                  <Text className="text-sm font-bold text-primary-600 dark:text-primary-400">
                    {formatPrice(product.pricePerUnit)}
                  </Text>
                  <Text className="text-[10px] text-gray-400 dark:text-gray-500">
                    /{product.unit}
                  </Text>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        ) : (
          <View className="mx-4 items-center rounded-2xl bg-gray-50 py-8 dark:bg-gray-800">
            <Text className="text-sm text-gray-400 dark:text-gray-500">
              Chưa có sản phẩm
            </Text>
          </View>
        )}
      </View>

      {/* Nearby Farms */}
      <View className="p-4">
        <View className="mb-3 flex-row items-center justify-between">
          <Text className="text-lg font-bold text-gray-900 dark:text-white">
            Farms Near You
          </Text>
          <TouchableOpacity onPress={() => router.push('/farms')}>
            <Text className="text-sm font-medium text-green-600 dark:text-green-400">
              See All
            </Text>
          </TouchableOpacity>
        </View>

        {isFarmsLoading || isLocationLoading ? (
          <View className="items-center py-8">
            <ActivityIndicator size="large" />
            <Text className="mt-2 text-gray-500 dark:text-gray-400">
              {isLocationLoading
                ? 'Getting your location...'
                : 'Loading farms...'}
            </Text>
          </View>
        ) : farmsData?.pages?.[0]?.data &&
          (farmsData.pages[0].data.items || farmsData.pages[0].data.farms) &&
          (farmsData.pages[0].data.items || farmsData.pages[0].data.farms)!
            .length > 0 ? (
          <View className="space-y-3">
            {(farmsData.pages[0].data.items ||
              farmsData.pages[0].data.farms)!.map((farm) => (
              <FarmCard
                key={farm.id}
                farm={farm}
                variant="compact"
                onPress={() => router.push(`/farms/${farm.id}`)}
                showDistance={!!location}
                userLocation={location || undefined}
              />
            ))}
          </View>
        ) : (
          <View className="items-center rounded-lg bg-gray-50 py-8 dark:bg-gray-800">
            <Text className="text-gray-500 dark:text-gray-400">
              {location
                ? 'No farms found nearby'
                : 'Enable location to see nearby farms'}
            </Text>
          </View>
        )}
      </View>

      {/* Features Section */}
      <View className="mb-4 p-4">
        <Text className="mb-4 text-lg font-bold text-gray-900 dark:text-white">
          Why Choose Us?
        </Text>
        <View className="space-y-4">
          <View className="flex-row items-start">
            <Text className="mr-3 text-2xl">🌱</Text>
            <View className="flex-1">
              <Text className="mb-1 font-semibold text-gray-900 dark:text-white">
                Fresh & Local
              </Text>
              <Text className="text-sm text-gray-600 dark:text-gray-400">
                Get the freshest produce directly from local farms
              </Text>
            </View>
          </View>

          <View className="flex-row items-start">
            <Text className="mr-3 text-2xl">🚚</Text>
            <View className="flex-1">
              <Text className="mb-1 font-semibold text-gray-900 dark:text-white">
                Fast Delivery
              </Text>
              <Text className="text-sm text-gray-600 dark:text-gray-400">
                Quick delivery from farms within 100km radius
              </Text>
            </View>
          </View>

          <View className="flex-row items-start">
            <Text className="mr-3 text-2xl">💚</Text>
            <View className="flex-1">
              <Text className="mb-1 font-semibold text-gray-900 dark:text-white">
                Support Local
              </Text>
              <Text className="text-sm text-gray-600 dark:text-gray-400">
                Help local farmers and strengthen your community
              </Text>
            </View>
          </View>

          <View className="flex-row items-start">
            <Text className="mr-3 text-2xl">✅</Text>
            <View className="flex-1">
              <Text className="mb-1 font-semibold text-gray-900 dark:text-white">
                Quality Guaranteed
              </Text>
              <Text className="text-sm text-gray-600 dark:text-gray-400">
                All products are quality-checked and certified
              </Text>
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

export default function IndexScreen() {
  const user = useAuth.use.user();
  const isUserFarm = user?.role === 'farm';

  // If farm user, show dashboard directly
  if (isUserFarm) {
    return <FarmDashboard />;
  }

  return <ConsumerHome />;
}
