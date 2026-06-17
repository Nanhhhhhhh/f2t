import type { AxiosError } from 'axios';
import { createInfiniteQuery, createQuery } from 'react-query-kit';

import { client } from '../common/client';
import { simulateNetworkDelay, USE_MOCK_DATA } from '../common/config';
import { getMockOrders } from './mock-orders';
import type { GetOrdersRequest, OrdersResponse } from './types';

// Get orders query
export const useGetOrders = createQuery<
  OrdersResponse,
  GetOrdersRequest,
  AxiosError
>({
  queryKey: ['orders'],
  fetcher: async (params) => {
    // Return mock data if enabled
    if (USE_MOCK_DATA) {
      // Simulate network delay
      await simulateNetworkDelay();

      return getMockOrders({
        page: params.page,
        limit: params.limit,
        status: params.status,
        paymentStatus: params.paymentStatus,
        farmId: params.farmId,
        customerId: params.customerId,
        startDate: params.startDate,
        endDate: params.endDate,
        sortBy: params.sortBy,
        sortOrder: params.sortOrder,
      });
    }

    // Real API call
    const response = await client.get('/orders', { params });
    return response.data;
  },
  staleTime: 2 * 60 * 1000, // 2 minutes
  gcTime: 5 * 60 * 1000, // 5 minutes
});

// Get orders infinite query for pagination
export const useGetOrdersInfinite = createInfiniteQuery<
  OrdersResponse,
  GetOrdersRequest,
  AxiosError
>({
  queryKey: ['orders-infinite'],
  fetcher: async (
    params: GetOrdersRequest,
    { pageParam = 1 }: { pageParam?: number },
  ) => {
    // Return mock data if enabled
    if (USE_MOCK_DATA) {
      // Simulate network delay
      await simulateNetworkDelay();

      return getMockOrders({
        page: pageParam,
        limit: params.limit,
        status: params.status,
        paymentStatus: params.paymentStatus,
        farmId: params.farmId,
        customerId: params.customerId,
        startDate: params.startDate,
        endDate: params.endDate,
        sortBy: params.sortBy,
        sortOrder: params.sortOrder,
      });
    }

    // Real API call
    const response = await client.get('/orders', {
      params: { ...params, page: pageParam },
    });
    return response.data;
  },
  initialPageParam: 1,
  getNextPageParam: (lastPage) => {
    return lastPage.success && lastPage.data?.hasMore
      ? (lastPage.data.page || 1) + 1
      : undefined;
  },
  staleTime: 2 * 60 * 1000, // 2 minutes
  gcTime: 5 * 60 * 1000, // 5 minutes
});
