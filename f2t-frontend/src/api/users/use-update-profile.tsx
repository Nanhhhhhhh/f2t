import { createMutation } from 'react-query-kit';

import { useAuth } from '@/lib';

import { client } from '../common/client';

type Variables = {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  avatarUrl?: string;
  location?: {
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
    coordinates?: number[];
  };
};

export const useUpdateProfile = createMutation<any, Variables, Error>({
  mutationFn: async (variables) => {
    const response = await client.put('/users/profile', variables);
    return response.data;
  },
  onSuccess: (data) => {
    useAuth.getState().updateUser(data.data);
  },
  onError: (error) => {
  },
});
