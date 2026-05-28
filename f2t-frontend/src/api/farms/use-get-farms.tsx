import { createInfiniteQuery } from 'react-query-kit';

import { client } from '../common/client';
import { simulateNetworkDelay, USE_MOCK_DATA } from '../common/config';
import { getMockFarms } from './mock-farms';
import type { GetFarmsRequest, GetFarmsResponse } from './types';

type Variables = Omit<GetFarmsRequest, 'page'>;
type Response = GetFarmsResponse;

export const useGetFarms = createInfiniteQuery<Response, Variables, Error>({
  queryKey: ['farms'],
  fetcher: async (variables, { pageParam = 1 }) => {
    // Return mock data if enabled
    if (USE_MOCK_DATA) {
      // Simulate network delay
      await simulateNetworkDelay();

      return getMockFarms({
        page: pageParam,
        limit: variables.limit,
        search: variables.search,
        deliveryMethod: variables.deliveryMethod,
        location: variables.location,
        sortBy: variables.sortBy,
        sortOrder: variables.sortOrder,
        isActive: variables.isActive,
      });
    }

    // Real API call
    const { location, ...rest } = variables;
    const response = await client.get('/farms', {
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
  initialPageParam: 1,
  getNextPageParam: (lastPage) => {
    if (!lastPage.success || !lastPage.data?.hasMore) {
      return undefined;
    }
    return lastPage.data.page + 1;
  },
  staleTime: 2 * 60 * 1000, // 2 minutes
  gcTime: 5 * 60 * 1000, // 5 minutes
});

// Helper hook for getting farms with basic pagination
export const useGetFarmsList = createInfiniteQuery<Response, Variables, Error>({
  queryKey: ['farms', 'list'],
  fetcher: async (variables, { pageParam = 1 }) => {
    // Return mock data if enabled
    if (USE_MOCK_DATA) {
      // Simulate network delay
      await simulateNetworkDelay();

      return getMockFarms({
        page: pageParam,
        limit: variables.limit,
        search: variables.search,
        deliveryMethod: variables.deliveryMethod,
        sortBy: variables.sortBy || 'name',
        sortOrder: variables.sortOrder || 'asc',
        isActive: variables.isActive,
      });
    }

    const response = await client.get('/farms', {
      params: {
        ...variables,
        page: pageParam,
        limit: variables.limit || 20,
        sortBy: variables.sortBy || 'name',
        sortOrder: variables.sortOrder || 'asc',
      },
    });
    return response.data;
  },
  initialPageParam: 1,
  getNextPageParam: (lastPage) => {
    if (!lastPage.success || !lastPage.data?.hasMore) {
      return undefined;
    }
    return lastPage.data.page + 1;
  },
  staleTime: 2 * 60 * 1000, // 2 minutes
  gcTime: 5 * 60 * 1000, // 5 minutes
});
