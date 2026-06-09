import { createMutation } from 'react-query-kit';
import type { AxiosError } from 'axios';

import { client } from '@/api/common/client';

export const useDeleteReview = createMutation<void, string, AxiosError>({
  mutationFn: async (id) =>
    client({ url: `reviews/${id}`, method: 'DELETE' }).then(() => undefined),
});
