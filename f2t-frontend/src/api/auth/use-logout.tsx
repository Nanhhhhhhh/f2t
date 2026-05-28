import type { AxiosError } from 'axios';
import { createMutation } from 'react-query-kit';

import { client } from '../common/client';
import type { LogoutResponse } from './types';

type Variables = void;

export const useLogout = createMutation<LogoutResponse, Variables, AxiosError>({
  mutationFn: async () =>
    client({
      url: 'auth/logout',
      method: 'POST',
    }).then((response) => response.data),
});
