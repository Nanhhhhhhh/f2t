import type { AxiosError } from 'axios';
import { createMutation } from 'react-query-kit';

import { client } from '../common/client';
import type { ChangePasswordRequest } from './types';

type Response = {
  success: boolean;
  message: string;
};

export const useChangePassword = createMutation<
  Response,
  ChangePasswordRequest,
  AxiosError
>({
  mutationFn: async (variables) =>
    client({
      url: 'auth/change-password',
      method: 'POST',
      data: variables,
    }).then((response) => response.data),
});
