import { createQuery } from 'react-query-kit';

import { client } from '../common/client';
import type { CrossSellResponse, CrossSellVariables } from './types';

export const useCrossSell = createQuery<CrossSellResponse, CrossSellVariables, Error>({
  queryKey: ['cross-sell'],
  fetcher: async (variables) => {
    if (!variables.productIds.length) {
      return { success: true, data: [] };
    }
    const response = await client.get('/recommendations/cross-sell', {
      params: {
        productIds: variables.productIds.join(','),
        limit: variables.limit ?? 6,
      },
    });
    return response.data as CrossSellResponse;
  },
  staleTime: 2 * 60 * 1000,
  gcTime: 5 * 60 * 1000,
});
