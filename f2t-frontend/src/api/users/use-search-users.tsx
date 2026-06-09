import type { AxiosError } from 'axios';
import { createQuery } from 'react-query-kit';

import { client } from '@/api/common/client';

export type UserSearchResult = {
  id: string;
  name: string;
  avatarUrl?: string;
};

export const useSearchUsers = createQuery<
  UserSearchResult[],
  { q: string },
  AxiosError
>({
  queryKey: ['users', 'search'],
  fetcher: ({ q }) =>
    client({ url: 'users/search', method: 'GET', params: { q } }).then(
      (r) => r.data.data
    ),
});
