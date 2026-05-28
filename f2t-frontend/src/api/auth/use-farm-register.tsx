import type { AxiosError } from 'axios';
import { createMutation } from 'react-query-kit';

import { client } from '../common/client';
import type { AuthResponse, FarmRegisterRequest } from './types';

export const useFarmRegister = createMutation<
  AuthResponse,
  FarmRegisterRequest,
  AxiosError
>({
  mutationFn: async (variables) =>
    client({
      url: 'auth/register/farm',
      method: 'POST',
      data: variables,
    }).then((response) => response.data),
});
