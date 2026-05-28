import { createQuery } from 'react-query-kit';

import { client } from '../common/client';
import type { PriceSuggestionsResponse } from './types';

export const useGetPriceSuggestions = createQuery<PriceSuggestionsResponse, void, Error>({
  queryKey: ['price-suggestions'],
  fetcher: async () => {
    const response = await client.get('/dynamic-pricing/suggestions');
    return response.data as PriceSuggestionsResponse;
  },
  staleTime: 2 * 60 * 1000,
  gcTime: 10 * 60 * 1000,
});
