import { createMutation } from 'react-query-kit';

import { client } from '../common/client';
import type {
  CreateFarmProfileRequest,
  CreateFarmProfileResponse,
} from './types';

type Variables = CreateFarmProfileRequest;
type Response = CreateFarmProfileResponse;

export const useCreateFarm = createMutation<Response, Variables, Error>({
  mutationFn: async (variables) =>
    client({
      url: '/farms',
      method: 'POST',
      data: variables,
    }).then((response) => response.data),
  onSuccess: (data, _variables) => {
    // You could add additional side effects here like:
    // - Invalidating farm lists
    // - Showing success notification
    // - Navigating to farm profile
  },
  onError: (error, _variables) => {
    // Handle error logging or notifications
  },
});
