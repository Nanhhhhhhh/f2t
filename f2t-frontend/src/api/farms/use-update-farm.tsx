import { createMutation } from 'react-query-kit';

import { queryClient } from '../common/api-provider';
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
  onSuccess: () => {
    // Làm mới farm detail (edit form fetch lại đúng giá trị vừa lưu) + danh sách.
    queryClient.invalidateQueries({ queryKey: ['farm'] });
    queryClient.invalidateQueries({ queryKey: ['farms'] });
  },
});
