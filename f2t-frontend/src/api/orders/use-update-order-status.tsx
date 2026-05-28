import type { AxiosError } from 'axios';
import { createMutation } from 'react-query-kit';

import { client } from '../common/client';
import type { UpdateOrderResponse, UpdateOrderStatusRequest } from './types';

// Update order status mutation
export const useUpdateOrderStatus = createMutation<
  UpdateOrderResponse,
  UpdateOrderStatusRequest,
  AxiosError
>({
  mutationFn: async (variables) => {
    const { id, ...statusData } = variables;
    return client({
      url: `orders/${id}/status`,
      method: 'POST',
      data: statusData,
    }).then((response) => response.data);
  },
});
