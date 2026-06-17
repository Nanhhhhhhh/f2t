import type { AxiosError } from 'axios';
import { createInfiniteQuery } from 'react-query-kit';

import { client } from '../common/client';
import type { AdminPostsQuery, AdminPostsResponse } from './types';

export const useGetAdminPosts = createInfiniteQuery<
  AdminPostsResponse,
  AdminPostsQuery,
  AxiosError
>({
  queryKey: ['admin-posts'],
  fetcher: async (
    params: AdminPostsQuery,
    { pageParam = 1 }: { pageParam?: number },
  ) => {
    return client({
      url: '/admin/posts',
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
