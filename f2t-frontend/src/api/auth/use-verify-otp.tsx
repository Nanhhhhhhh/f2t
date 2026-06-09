import type { AxiosError } from 'axios';
import { createMutation } from 'react-query-kit';

import { client } from '../common/client';
import type { VerifyOtpRequest } from './types';

type Response = {
  success: boolean;
  data: { token: string };
};

export const useVerifyOtp = createMutation<
  Response,
  VerifyOtpRequest,
  AxiosError
>({
  mutationFn: async (variables) =>
    client({
      url: 'auth/verify-otp',
      method: 'POST',
      data: variables,
    }).then((response) => response.data),
});
