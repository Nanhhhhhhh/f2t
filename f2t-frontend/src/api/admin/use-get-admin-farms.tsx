import type { AxiosError } from 'axios';
import { createInfiniteQuery } from 'react-query-kit';

import { client } from '../common/client';
import type { AdminFarmsQuery, AdminFarmsResponse } from './types';

export const useGetAdminFarms = createInfiniteQuery<
  AdminFarmsResponse,
  AdminFarmsQuery,
  AxiosError
>({
  queryKey: ['admin-farms'],
  fetcher: async ({
    pageParam = 1,
    ...params
  }: AdminFarmsQuery & { pageParam?: number }) => {
    return client({
      url: '/admin/farms',
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
