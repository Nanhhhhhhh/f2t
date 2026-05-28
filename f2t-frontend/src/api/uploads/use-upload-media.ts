import type { AxiosError } from 'axios';
import { createMutation } from 'react-query-kit';

import { client } from '../common';
import type { UploadResponse } from './types';

type Variables = {
  file: {
    uri: string;
    name?: string;
    type?: string;
  };
  type: 'image' | 'video' | 'media';
};

export const useUploadMedia = createMutation<
  UploadResponse,
  Variables,
  AxiosError
>({
  mutationFn: async ({ file, type }) => {
    const formData = new FormData();
    // @ts-ignore
    formData.append('file', {
      uri: file.uri,
      name: file.name || `upload.${file.uri.split('.').pop()}`,
      type: file.type || (type === 'video' ? 'video/mp4' : 'image/jpeg'),
    });
    formData.append('folder', 'f2t/posts');

    return client({
      url: `uploads/${type}`,
      method: 'POST',
      data: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }).then((response) => response.data.data);
  },
});
