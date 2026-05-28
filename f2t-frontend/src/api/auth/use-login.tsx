import type { AxiosError } from 'axios';
import { createMutation } from 'react-query-kit';

import { client } from '../common/client';
import type { AuthResponse, LoginRequest } from './types';

export const useLogin = createMutation<AuthResponse, LoginRequest, AxiosError>({
  mutationFn: async (variables) =>
    client({
      url: 'auth/login',
      method: 'POST',
      data: variables,
    }).then((response) => response.data),
});
