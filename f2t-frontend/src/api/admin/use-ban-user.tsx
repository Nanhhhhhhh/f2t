import type { AxiosError } from 'axios';
import { createMutation } from 'react-query-kit';

import type { ApiResponse, User } from '@/types';

import { client } from '../common/client';
import type { BanUserRequest } from './types';

type Variables = BanUserRequest & { id: string };

export const useBanUser = createMutation<
  ApiResponse<User>,
  Variables,
  AxiosError
>({
  mutationFn: async ({ id, ...data }) => {
    return client({
      url: `/admin/users/${id}/ban`,
      method: 'PATCH',
      data,
    }).then((response) => response.data);
  },
});
