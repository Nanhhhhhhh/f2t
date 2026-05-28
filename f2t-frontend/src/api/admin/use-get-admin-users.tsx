import type { AxiosError } from 'axios';
import { createInfiniteQuery } from 'react-query-kit';

import { client } from '../common/client';
import type { AdminUsersQuery, AdminUsersResponse } from './types';

export const useGetAdminUsers = createInfiniteQuery<
  AdminUsersResponse,
  AdminUsersQuery,
  AxiosError
>({
  queryKey: ['admin-users'],
  fetcher: async ({
    pageParam = 1,
    ...params
  }: AdminUsersQuery & { pageParam?: number }) => {
    return client({
      url: '/admin/users',
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
