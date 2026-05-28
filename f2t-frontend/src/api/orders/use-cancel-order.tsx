import type { AxiosError } from 'axios';
import { createMutation } from 'react-query-kit';

import { client } from '../common/client';
import type { CancelOrderRequest, CancelOrderResponse } from './types';

// Cancel order mutation
export const useCancelOrder = createMutation<
  CancelOrderResponse,
  CancelOrderRequest,
  AxiosError
>({
  mutationFn: async (variables) => {
    const { id, ...cancelData } = variables;
    return client({
      url: `orders/${id}/cancel`,
      method: 'POST',
      data: cancelData,
    }).then((response) => response.data);
  },
});
