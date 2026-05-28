import { createMutation } from 'react-query-kit';

import { client } from '../common/client';
import type { UpdateFarmRequest, UpdateFarmResponse } from './types';

type Variables = UpdateFarmRequest;
type Response = UpdateFarmResponse;

export const useUpdateFarm = createMutation<Response, Variables, Error>({
  mutationFn: async (variables) => {
    const { id, ...updateData } = variables;

    return client({
      url: `/farms/${id}`,
      method: 'PUT',
      data: updateData,
    }).then((response) => response.data);
  },
  onSuccess: (data, _variables) => {
    // You could add additional side effects here like:
    // - Invalidating related queries
    // - Showing success notification
    // - Updating cache
  },
  onError: (error, _variables) => {
    // Handle error logging or notifications
  },
});
