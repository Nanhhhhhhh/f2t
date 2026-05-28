import { createMutation } from 'react-query-kit';

import { client } from '../common/client';
import type { DeleteProductRequest, DeleteProductResponse } from './types';

type Variables = DeleteProductRequest;
type Response = DeleteProductResponse;

export const useDeleteProduct = createMutation<Response, Variables, Error>({
  mutationFn: async (variables) => {
    const response = await client.delete(`/products/${variables.id}`);
    return response.data;
  },
  onSuccess: (_data, _variables) => {
    // TODO: Invalidate product queries
  },
  onError: (error, _variables) => {
  },
});
