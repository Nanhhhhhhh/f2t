import type { AxiosError } from 'axios';
import { createMutation } from 'react-query-kit';

import { client } from '../common';
import type { MediaItem, Post, Tag } from './types';

type Variables = {
  title: string;
  body: string;
  media?: MediaItem[];
  tags?: Tag[];
};
type Response = Post;

export const useAddPost = createMutation<Response, Variables, AxiosError>({
  mutationFn: async (variables) =>
    client({
      url: 'posts/add',
      method: 'POST',
      data: variables,
    }).then((response) => response.data.data),
});
