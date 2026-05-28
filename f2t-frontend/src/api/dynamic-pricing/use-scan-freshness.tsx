import { createMutation } from 'react-query-kit';

import { queryClient } from '../common/api-provider';
import { client } from '../common/client';
import type { ScanFreshnessResponse, ScanFreshnessVariables } from './types';

export const useScanFreshness = createMutation<
  ScanFreshnessResponse,
  ScanFreshnessVariables,
  Error
>({
  mutationFn: async ({ productId, image_b64, category }) => {
    const response = await client.post(
      `/dynamic-pricing/freshness/${productId}/scan`,
      { image_b64, category },
    );
    return response.data as ScanFreshnessResponse;
  },
  // Refresh the suggestions list so the new AI-generated card appears immediately.
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['price-suggestions'] });
  },
});
