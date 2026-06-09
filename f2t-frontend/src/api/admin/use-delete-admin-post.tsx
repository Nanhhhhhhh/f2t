import type { AxiosError } from 'axios';
import { createMutation } from 'react-query-kit';

import { client } from '../common/client';

export const useDeleteAdminPost = createMutation<void, string, AxiosError>({
  mutationFn: async (id) =>
    client({ url: `/admin/posts/${id}`, method: 'DELETE' }).then(
      () => undefined
    ),
});
