import type { AxiosError } from 'axios';
import { createInfiniteQuery } from 'react-query-kit';

import { client } from '../common';
import type { Post } from './types';

type Response = {
  items: Post[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
};
type Variables = { limit?: number } | undefined;

export const useForYouPosts = createInfiniteQuery<
  Response,
  Variables,
  AxiosError
>({
  queryKey: ['posts', 'foryou'],
  fetcher: (variables, { pageParam = 1 }) => {
    return client
      .get(`posts/foryou`, { params: { ...variables, page: pageParam } })
      .then((response) => response.data.data);
  },
  initialPageParam: 1,
  getNextPageParam: (lastPage) => {
    if (!lastPage || !lastPage.hasMore) return undefined;
    return lastPage.page + 1;
  },
});
