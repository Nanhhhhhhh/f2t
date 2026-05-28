import type { AxiosError } from 'axios';
import { createMutation } from 'react-query-kit';

import type { ApiResponse, Farm } from '@/types';

import { client } from '../common/client';
import type { VerifyFarmRequest } from './types';

type Variables = VerifyFarmRequest & { id: string };

export const useVerifyFarm = createMutation<
  ApiResponse<Farm>,
  Variables,
  AxiosError
>({
  mutationFn: async ({ id, ...data }) => {
    return client({
      url: `/admin/farms/${id}/verify`,
      method: 'PATCH',
      data,
    }).then((response) => response.data);
  },
});
