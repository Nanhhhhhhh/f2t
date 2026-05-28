import type { AxiosError } from 'axios';
import { createMutation } from 'react-query-kit';

import { client } from '../common/client';
import type { RefundOrderRequest, RefundOrderResponse } from './types';

// Refund order mutation
export const useRefundOrder = createMutation<
  RefundOrderResponse,
  RefundOrderRequest,
  AxiosError
>({
  mutationFn: async (variables) => {
    const { id, ...refundData } = variables;
    return client({
      url: `orders/${id}/refund`,
      method: 'POST',
      data: refundData,
    }).then((response) => response.data);
  },
});
