import type { AxiosError } from 'axios';
import { createInfiniteQuery, createQuery } from 'react-query-kit';

import { client } from '../common';
import type { Post } from './types';

type Response = {
  items: Post[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
};

type Variables = {
  page?: number;
  limit?: number;
  search?: string;
  farmId?: string;
  authorId?: string;
  sortBy?: 'createdAt' | 'likesCount';
  sortOrder?: 'asc' | 'desc';
};

export const usePosts = createQuery<Response, Variables | undefined, AxiosError>(
  {
    queryKey: ['posts'],
    fetcher: (variables) => {
      return client
        .get(`posts`, { params: variables })
        .then((response) => response.data);
    },
  }
);

export const usePostsInfinite = createInfiniteQuery<
  Response,
  Omit<Variables, 'page'>,
  AxiosError
>({
  queryKey: ['posts', 'infinite'],
  fetcher: (variables, { pageParam = 1 }) => {
    return client
      .get(`posts`, { params: { ...variables, page: pageParam } })
      .then((response) => response.data);
  },
  initialPageParam: 1,
  getNextPageParam: (lastPage) => {
    if (lastPage?.hasMore) return (lastPage.page ?? 0) + 1;
    return undefined;
  },
  staleTime: 2 * 60 * 1000,
  gcTime: 5 * 60 * 1000,
});
