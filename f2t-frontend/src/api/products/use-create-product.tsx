import { createMutation } from 'react-query-kit';

import { queryClient } from '../common/api-provider';
import { client } from '../common/client';
import type { CreateProductRequest, CreateProductResponse } from './types';

type Variables = CreateProductRequest;
type Response = CreateProductResponse;

export const useCreateProduct = createMutation<Response, Variables, Error>({
  mutationFn: async (variables) => {
    const response = await client.post('/products', variables);
    return response.data;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['products'] });
    queryClient.invalidateQueries({ queryKey: ['products-infinite'] });
  },
});
