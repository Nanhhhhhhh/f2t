import { createQuery } from 'react-query-kit';

import { client } from '../common/client';
import type { FarmAnalyticsRequest, FarmAnalyticsResponse } from './types';

type Variables = FarmAnalyticsRequest;
type Response = FarmAnalyticsResponse;

export const useFarmAnalytics = createQuery<Response, Variables, Error>({
  queryKey: ['farm', 'analytics'],
  fetcher: async (variables) => {
    const params = new URLSearchParams({
      ...(variables.startDate && { startDate: variables.startDate }),
      ...(variables.endDate && { endDate: variables.endDate }),
      ...(variables.period && { period: variables.period }),
    });

    const queryString = params.toString();
    const url = `/farms/${variables.farmId}/analytics${queryString ? `?${queryString}` : ''}`;

    return client({
      url,
      method: 'GET',
    }).then((response) => response.data);
  },
  staleTime: 5 * 60 * 1000, // 5 minutes
  gcTime: 10 * 60 * 1000, // 10 minutes
});
