import type { AxiosError } from 'axios';
import { createInfiniteQuery } from 'react-query-kit';

import { client } from '../common/client';
import type { AdminOrdersQuery, AdminOrdersResponse } from './types';

export const useGetAdminOrders = createInfiniteQuery<
  AdminOrdersResponse,
  AdminOrdersQuery,
  AxiosError
>({
  queryKey: ['admin-orders'],
  fetcher: async ({
    pageParam = 1,
    ...params
  }: AdminOrdersQuery & { pageParam?: number }) => {
    return client({
      url: '/admin/orders',
      method: 'GET',
      params: { ...params, page: pageParam },
    }).then((response) => response.data);
  },
  initialPageParam: 1,
  getNextPageParam: (lastPage) => {
    return lastPage.success && lastPage.data?.hasMore
      ? (lastPage.data.page || 1) + 1
      : undefined;
  },
});
