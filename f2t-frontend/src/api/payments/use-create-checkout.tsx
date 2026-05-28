import type { AxiosError } from 'axios';
import { createMutation } from 'react-query-kit';

import { client } from '../common/client';

type CreateCheckoutRequest = {
  orderId: string;
};

type CreateCheckoutResponse = {
  success: boolean;
  data: {
    sessionId: string;
    url: string;
  };
};

export const useCreateCheckout = createMutation<
  CreateCheckoutResponse,
  CreateCheckoutRequest,
  AxiosError
>({
  mutationFn: async (variables) =>
    client({
      url: 'payments/checkout',
      method: 'POST',
      data: variables,
    }).then((response) => response.data),
});
