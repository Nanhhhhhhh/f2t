import type { AxiosError } from 'axios';
import { createQuery } from 'react-query-kit';

import { client } from '../common/client';
import type { AdminAnalyticsResponse } from './types';

export const useGetAdminAnalytics = createQuery<
  AdminAnalyticsResponse,
  void,
  AxiosError
>({
  queryKey: ['admin-analytics'],
  fetcher: async () => {
    return client({
      url: '/admin/analytics',
      method: 'GET',
    }).then((response) => response.data);
  },
});
