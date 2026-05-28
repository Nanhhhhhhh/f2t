import type { AxiosError } from 'axios';
import { createMutation } from 'react-query-kit';

import { client } from '../common/client';
import type {
  SendEmailVerificationRequest,
  VerificationResponse,
  VerifyEmailRequest,
} from './types';

export const useVerifyEmail = createMutation<
  VerificationResponse,
  VerifyEmailRequest,
  AxiosError
>({
  mutationFn: async (variables) =>
    client({
      url: 'auth/verify-email',
      method: 'POST',
      data: variables,
    }).then((response) => response.data),
});

export const useSendEmailVerification = createMutation<
  VerificationResponse,
  SendEmailVerificationRequest,
  AxiosError
>({
  mutationFn: async (variables) =>
    client({
      url: 'auth/send-email-verification',
      method: 'POST',
      data: variables,
    }).then((response) => response.data),
});
