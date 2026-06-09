import { createMutation } from 'react-query-kit';
import type { AxiosError } from 'axios';

import { client } from '@/api/common/client';
import type { CreateReviewRequest, Review } from './types';

export const useAddReview = createMutation<Review, CreateReviewRequest, AxiosError>({
  mutationFn: async (variables) =>
    client({ url: 'reviews', method: 'POST', data: variables }).then((r) => r.data.data),
});
