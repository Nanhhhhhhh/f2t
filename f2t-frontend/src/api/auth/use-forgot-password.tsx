import type { AxiosError } from 'axios';
import { createMutation } from 'react-query-kit';

import { client } from '../common/client';
import type { ForgotPasswordRequest } from './types';

type Response = {
  success: boolean;
  message: string;
};

export const useForgotPassword = createMutation<
  Response,
  ForgotPasswordRequest,
  AxiosError
>({
  mutationFn: async (variables) =>
    client({
      url: 'auth/forgot-password',
      method: 'POST',
      data: variables,
    }).then((response) => response.data),
});
