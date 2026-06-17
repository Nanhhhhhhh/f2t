import { createInfiniteQuery, createQuery } from 'react-query-kit';

import { client } from '../common/client';
import { simulateNetworkDelay, USE_MOCK_DATA } from '../common/config';
import { getMockProducts } from './mock-products';
import type { GetProductsRequest, GetProductsResponse } from './types';

type Variables = GetProductsRequest;
type Response = GetProductsResponse;

// Regular paginated query
export const useGetProducts = createQuery<Response, Variables, Error>({
  queryKey: ['products'],
  fetcher: async (variables) => {
    // Return mock data if enabled
    if (USE_MOCK_DATA) {
      // Simulate network delay
      await simulateNetworkDelay(400);

      return getMockProducts({
        page: variables.page,
        limit: variables.limit,
        search: variables.search,
        category: variables.category,
        farmId: variables.farmId,
        minPrice: variables.minPrice,
        maxPrice: variables.maxPrice,
        organicOnly: variables.organicOnly,
        inSeason: variables.inSeason,
        inStock: variables.inStock,
        sortBy: variables.sortBy,
        sortOrder: variables.sortOrder,
      }) as GetProductsResponse;
    }

    // Real API call
    const { location, ...rest } = variables;
    const response = await client.get('/products', {
      params: {
        ...rest,
        ...(location && {
          latitude: location.latitude,
          longitude: location.longitude,
          radius: location.radius,
        }),
      },
    });
    return response.data;
  },
  staleTime: 2 * 60 * 1000, // 2 minutes
  gcTime: 5 * 60 * 1000, // 5 minutes
});

// Infinite scroll query
export const useGetProductsInfinite = createInfiniteQuery<
  Response,
  Omit<Variables, 'page'>,
  Error
>({
  queryKey: ['products-infinite'],
  fetcher: async (
    variables: Omit<Variables, 'page'>,
    { pageParam = 1 }: { pageParam?: number },
  ) => {
    // Return mock data if enabled
    if (USE_MOCK_DATA) {
      // Simulate network delay
      await simulateNetworkDelay(400);

      return getMockProducts({
        page: pageParam,
        limit: variables.limit,
        search: variables.search,
        category: variables.category,
        farmId: variables.farmId,
        minPrice: variables.minPrice,
        maxPrice: variables.maxPrice,
        organicOnly: variables.organicOnly,
        inSeason: variables.inSeason,
        inStock: variables.inStock,
        sortBy: variables.sortBy,
        sortOrder: variables.sortOrder,
      }) as GetProductsResponse;
    }

    // Real API call
    const { location, ...rest } = variables;
    const response = await client.get('/products', {
      params: {
        ...rest,
        page: pageParam,
        ...(location && {
          latitude: location.latitude,
          longitude: location.longitude,
          radius: location.radius,
        }),
      },
    });
    return response.data;
  },
  getNextPageParam: (lastPage) => {
    if (lastPage.success && lastPage.data?.hasMore) {
      return (lastPage.data.page || 0) + 1;
    }
    return undefined;
  },
  initialPageParam: 1,
  staleTime: 2 * 60 * 1000, // 2 minutes
  gcTime: 5 * 60 * 1000, // 5 minutes
});
