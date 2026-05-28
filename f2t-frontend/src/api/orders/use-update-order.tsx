import type { AxiosError } from 'axios';
import { createMutation } from 'react-query-kit';

import { client } from '../common/client';
import type { UpdateOrderRequest, UpdateOrderResponse } from './types';

// Update order mutation
export const useUpdateOrder = createMutation<
  UpdateOrderResponse,
  UpdateOrderRequest,
  AxiosError
>({
  mutationFn: async (variables) => {
    const { id, ...updateData } = variables;
    return client({
      url: `orders/${id}`,
      method: 'PUT',
      data: updateData,
    }).then((response) => response.data);
  },
});
