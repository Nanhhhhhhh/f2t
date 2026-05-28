import type { AxiosError } from 'axios';
import { createMutation } from 'react-query-kit';

import type { ApiResponse, User } from '@/types';

import { client } from '../common/client';
import type { ChangeRoleRequest } from './types';

type Variables = ChangeRoleRequest & { id: string };

export const useChangeRole = createMutation<
  ApiResponse<User>,
  Variables,
  AxiosError
>({
  mutationFn: async ({ id, ...data }) => {
    return client({
      url: `/admin/users/${id}/role`,
      method: 'PATCH',
      data,
    }).then((response) => response.data);
  },
});
