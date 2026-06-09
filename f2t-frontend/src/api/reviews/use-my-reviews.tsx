import { createQuery } from 'react-query-kit';
import type { AxiosError } from 'axios';

import { client } from '@/api/common/client';
import type { ReviewsPage } from './types';

type MyReviewsQuery = { page?: number; limit?: number };

export const useMyReviews = createQuery<ReviewsPage, MyReviewsQuery, AxiosError>({
  queryKey: ['reviews', 'my'],
  fetcher: (variables) =>
    client({ url: 'reviews/my', method: 'GET', params: variables }).then((r) => r.data.data),
});
