import { createQuery } from 'react-query-kit';

import { client } from '../common/client';
import { simulateNetworkDelay, USE_MOCK_DATA } from '../common/config';
import { getMockFarm } from './mock-farms';
import type { GetFarmRequest, GetFarmResponse } from './types';

type Variables = GetFarmRequest;
type Response = GetFarmResponse;

export const useGetFarm = createQuery<Response, Variables, Error>({
  queryKey: ['farm'],
  fetcher: async (variables) => {
    // Return mock data if enabled
    if (USE_MOCK_DATA) {
      // Simulate network delay
      await simulateNetworkDelay(300);

      return getMockFarm(variables.id) as GetFarmResponse;
    }

    // Real API call
    return client({
      url: `/farms/${variables.id}`,
      method: 'GET',
    }).then((response) => response.data);
  },
  staleTime: 5 * 60 * 1000, // 5 minutes
  gcTime: 10 * 60 * 1000, // 10 minutes
});
