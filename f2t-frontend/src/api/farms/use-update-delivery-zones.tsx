import { createMutation } from 'react-query-kit';

import { client } from '../common/client';
import type {
  UpdateDeliveryZonesRequest,
  UpdateDeliveryZonesResponse,
} from './types';

type Variables = UpdateDeliveryZonesRequest;
type Response = UpdateDeliveryZonesResponse;

export const useUpdateDeliveryZones = createMutation<
  Response,
  Variables,
  Error
>({
  mutationFn: async (variables) => {
    const { farmId, zones } = variables;

    return client({
      url: `/farms/${farmId}/delivery-zones`,
      method: 'PUT',
      data: { zones },
    }).then((response) => response.data);
  },
  onSuccess: (data, variables) => {
    // You could add additional side effects here like:
    // - Invalidating farm query to refresh data
    // - Showing success notification
    // - Updating local cache
    // - Invalidating nearby farms queries
  },
  onError: (error, _variables) => {
    // Handle error logging or notifications
  },
});
