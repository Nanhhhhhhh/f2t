import type { AxiosError } from 'axios';
import { createMutation } from 'react-query-kit';

import { client } from '../common/client';
import type { ResetPasswordRequest } from './types';

type Response = {
  success: boolean;
  message: string;
};

export const useResetPassword = createMutation<
  Response,
  ResetPasswordRequest,
  AxiosError
>({
  mutationFn: async (variables) =>
    client({
      url: 'auth/reset-password',
      method: 'POST',
      data: variables,
    }).then((response) => response.data),
});
