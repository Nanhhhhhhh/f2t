import { createMutation } from 'react-query-kit';

import { queryClient } from '../common/api-provider';
import { client } from '../common/client';
import type { SubmitFreshnessVariables, SubmitFreshnessResponse } from './types';

export const useSubmitFreshness = createMutation<
  SubmitFreshnessResponse,
  SubmitFreshnessVariables,
  Error
>({
  mutationFn: async ({ productId, score, category }) => {
    const response = await client.post(`/dynamic-pricing/freshness/${productId}`, {
      score,
      category,
    });
    return response.data as SubmitFreshnessResponse;
  },
  // A freshness scan now (re)computes an AI price suggestion server-side; refresh the
  // suggestions list so the new card appears immediately.
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['price-suggestions'] });
  },
});
