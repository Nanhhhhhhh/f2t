import { createQuery } from 'react-query-kit';
import type { AxiosError } from 'axios';

import { client } from '@/api/common/client';
import type { GetReviewsQuery, ReviewsPage } from './types';

export const useGetReviews = createQuery<ReviewsPage, GetReviewsQuery, AxiosError>({
  queryKey: ['reviews'],
  fetcher: (variables) =>
    client({ url: 'reviews', method: 'GET', params: variables }).then((r) => r.data.data),
});
