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
  fetcher: async (
    params: AdminUsersQuery,
    { pageParam = 1 }: { pageParam?: number },
  ) => {
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
