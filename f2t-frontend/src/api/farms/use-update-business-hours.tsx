import { createMutation } from 'react-query-kit';

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
      data: { businessHours },
    }).then((response) => response.data);
  },
  onSuccess: (data, variables) => {
    // You could add additional side effects here like:
    // - Invalidating farm query to refresh data
    // - Showing success notification
    // - Updating local cache
  },
  onError: (error, _variables) => {
    // Handle error logging or notifications
  },
});
