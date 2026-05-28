import type { AxiosError } from 'axios';
import { createMutation } from 'react-query-kit';

import { client } from '../common/client';
import type { AuthResponse, RegisterRequest } from './types';

export const useRegister = createMutation<
  AuthResponse,
  RegisterRequest,
  AxiosError
>({
  mutationFn: async (variables) =>
    client({
      url: 'auth/register',
      method: 'POST',
      data: variables,
    }).then((response) => response.data),
});
