import type { AxiosError } from 'axios';
import { createMutation } from 'react-query-kit';

import { client } from '../common/client';
import type { CreateOrderRequest, CreateOrderResponse } from './types';

// Create order mutation
export const useCreateOrder = createMutation<
  CreateOrderResponse,
  CreateOrderRequest,
  AxiosError
>({
  mutationFn: async (variables) =>
    client({
      url: 'orders',
      method: 'POST',
      data: variables,
    }).then((response) => response.data),
});
