import type { AxiosError } from 'axios';
import { createQuery } from 'react-query-kit';

import { client } from '../common/client';
import { simulateNetworkDelay, USE_MOCK_DATA } from '../common/config';
import { getMockOrder } from './mock-orders';
import type { GetOrderRequest, OrderResponse } from './types';

// Get single order query
export const useGetOrder = createQuery<
  OrderResponse,
  GetOrderRequest,
  AxiosError
>({
  queryKey: ['order'],
  fetcher: async ({ id }) => {
    // Return mock data if enabled
    if (USE_MOCK_DATA) {
      // Simulate network delay
      await simulateNetworkDelay(300);

      return getMockOrder(id) as OrderResponse;
    }

    // Real API call
    return client({
      url: `orders/${id}`,
      method: 'GET',
    }).then((response) => response.data);
  },
  staleTime: 5 * 60 * 1000, // 5 minutes
  gcTime: 10 * 60 * 1000, // 10 minutes
});
