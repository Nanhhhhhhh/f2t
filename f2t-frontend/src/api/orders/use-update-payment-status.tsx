import type { AxiosError } from 'axios';
import { createMutation } from 'react-query-kit';

import { client } from '../common/client';
import type { UpdateOrderResponse, UpdatePaymentStatusRequest } from './types';

// Update order payment status mutation
export const useUpdatePaymentStatus = createMutation<
  UpdateOrderResponse,
  UpdatePaymentStatusRequest,
  AxiosError
>({
  mutationFn: async (variables) => {
    const { id, ...paymentData } = variables;
    return client({
      url: `orders/${id}/payment-status`,
      method: 'POST',
      data: paymentData,
    }).then((response) => response.data);
  },
});
