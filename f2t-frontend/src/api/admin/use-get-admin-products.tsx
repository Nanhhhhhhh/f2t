import type { AxiosError } from 'axios';
import { createInfiniteQuery } from 'react-query-kit';

import { client } from '../common/client';
import type { AdminProductsQuery, AdminProductsResponse } from './types';

export const useGetAdminProducts = createInfiniteQuery<
  AdminProductsResponse,
  AdminProductsQuery,
  AxiosError
>({
  queryKey: ['admin-products'],
  fetcher: async (
    params: AdminProductsQuery,
    { pageParam = 1 }: { pageParam?: number },
  ) => {
    return client({
      url: '/admin/products',
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
