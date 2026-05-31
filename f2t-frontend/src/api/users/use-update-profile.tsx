import { createMutation } from 'react-query-kit';

import { useAuth } from '@/lib';

import { client } from '../common/client';

type Variables = {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  avatarUrl?: string;
  location?: {
    street?: string;
    addressLine1?: string;
    city?: string;
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
