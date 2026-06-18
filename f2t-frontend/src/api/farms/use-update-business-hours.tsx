import { createMutation } from 'react-query-kit';

import { queryClient } from '../common/api-provider';
import { client } from '../common/client';
import type {
  UpdateBusinessHoursRequest,
  UpdateBusinessHoursResponse,
} from './types';

type Variables = UpdateBusinessHoursRequest;
type Response = UpdateBusinessHoursResponse;

export const useUpdateBusinessHours = createMutation<
  Response,
  Variables,
  Error
>({
  mutationFn: async (variables) => {
    const { farmId, businessHours } = variables;

    return client({
      url: `/farms/${farmId}/business-hours`,
      method: 'PUT',
      data: businessHours,
    }).then((response) => response.data);
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['farm'] });
    queryClient.invalidateQueries({ queryKey: ['farms'] });
  },
});
