import { createMutation } from 'react-query-kit';

import { queryClient } from '../common/api-provider';
import { client } from '../common/client';
import type { UpdateProductRequest, UpdateProductResponse } from './types';

type Variables = UpdateProductRequest;
type Response = UpdateProductResponse;

export const useUpdateProduct = createMutation<Response, Variables, Error>({
  mutationFn: async (variables) => {
    const { id, ...updateData } = variables;
    const response = await client.put(`/products/${id}`, updateData);
    return response.data;
  },
  onSuccess: () => {
    // Làm mới data: chi tiết sản phẩm (edit form đọc lại đúng giá trị vừa lưu)
    // và danh sách (cả paginated lẫn infinite). Trước đây thiếu bước này nên mở
    // lại form edit thấy data CŨ trong cache dù DB đã cập nhật.
    queryClient.invalidateQueries({ queryKey: ['product'] });
    queryClient.invalidateQueries({ queryKey: ['products'] });
    queryClient.invalidateQueries({ queryKey: ['products-infinite'] });
  },
});
