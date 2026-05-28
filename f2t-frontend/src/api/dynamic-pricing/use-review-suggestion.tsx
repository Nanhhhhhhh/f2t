import { createMutation } from 'react-query-kit';

import { client } from '../common/client';
import type { ReviewSuggestionVariables, ReviewSuggestionResponse } from './types';

export const useReviewSuggestion = createMutation<
  ReviewSuggestionResponse,
  ReviewSuggestionVariables,
  Error
>({
  mutationFn: async ({ id, decision }) => {
    const response = await client.patch(`/dynamic-pricing/suggestions/${id}/${decision}`);
    return response.data as ReviewSuggestionResponse;
  },
});
