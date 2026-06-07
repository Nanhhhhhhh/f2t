import { createQuery } from 'react-query-kit';

import { client } from '../common/client';
import type { FarmForecastsRequest, FarmForecastsResponse } from './types';

type Variables = FarmForecastsRequest;
type Response = FarmForecastsResponse;

export const useFarmForecasts = createQuery<Response, Variables, Error>({
  queryKey: ['farm', 'forecasts'],
  fetcher: async (variables) => {
    return client({
      url: `/demand-forecasting/farm/${variables.farmId}/forecasts`,
      method: 'GET',
    }).then((response) => response.data?.data ?? []);
  },
  staleTime: 3 * 60 * 1000,
  gcTime: 10 * 60 * 1000,
});
