import type { AxiosError } from 'axios';
import { createQuery } from 'react-query-kit';

import { client } from '../common/client';
import type { OrderStatsResponse } from './types';

// Order stats request type
type OrderStatsRequest = {
  farmId?: string;
  customerId?: string;
  startDate?: string;
  endDate?: string;
  period?: 'day' | 'week' | 'month' | 'year';
};

// Get order statistics query
export const useOrderStats = createQuery<
  OrderStatsResponse,
  OrderStatsRequest,
  AxiosError
>({
  queryKey: ['order-stats'],
  fetcher: async (params) =>
    client({
      url: 'orders/stats',
      method: 'GET',
      params,
    }).then((response) => response.data),
  staleTime: 5 * 60 * 1000, // 5 minutes
  gcTime: 10 * 60 * 1000, // 10 minutes
});
