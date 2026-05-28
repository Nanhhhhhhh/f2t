import { createMutation } from 'react-query-kit';

import { client } from '../common/client';
import type { UpdateProductRequest, UpdateProductResponse } from './types';

type Variables = UpdateProductRequest;
type Response = UpdateProductResponse;

export const useUpdateProduct = createMutation<Response, Variables, Error>({
  mutationFn: async (variables) => {
    const { id, ...updateData } = variables;
    const response = await client.put(`/products/${id}`, updateData);
    return response.data;
  },
  onSuccess: (_data, _variables) => {
    // TODO: Invalidate product queries
  },
  onError: (error, _variables) => {
  },
});
