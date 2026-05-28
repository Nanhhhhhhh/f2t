import type { AxiosError } from 'axios';
import { createMutation } from 'react-query-kit';

import { client } from '../common';
import type { Post } from './types';

type Variables = { id: string };
type Response = Post;

export const useUnlikePost = createMutation<Response, Variables, AxiosError>({
  mutationFn: (variables) =>
    client
      .post(`posts/${variables.id}/unlike`)
      .then((response) => response.data.data),
});
