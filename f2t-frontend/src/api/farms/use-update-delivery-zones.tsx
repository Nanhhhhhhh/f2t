import { createMutation } from 'react-query-kit';

import { queryClient } from '../common/api-provider';
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
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['farm'] });
    queryClient.invalidateQueries({ queryKey: ['farms'] });
  },
});
