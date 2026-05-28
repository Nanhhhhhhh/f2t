import { createQuery } from 'react-query-kit';

import { client } from '../common/client';
import { simulateNetworkDelay, USE_MOCK_DATA } from '../common/config';
import { getMockProduct } from './mock-products';
import type { GetProductRequest, GetProductResponse } from './types';

type Variables = GetProductRequest;
type Response = GetProductResponse;

export const useGetProduct = createQuery<Response, Variables, Error>({
  queryKey: ['product'],
  fetcher: async (variables) => {
    // Return mock data if enabled
    if (USE_MOCK_DATA) {
      // Simulate network delay
      await simulateNetworkDelay(300);

      return getMockProduct(variables.id) as GetProductResponse;
    }

    // Real API call
    const response = await client.get(`/products/${variables.id}`);
    return response.data;
  },
  staleTime: 5 * 60 * 1000, // 5 minutes
  gcTime: 10 * 60 * 1000, // 10 minutes
});
