import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, TextInput, TouchableOpacity } from 'react-native';

import { useGetOrders } from '@/api/orders';
import { useAddReview } from '@/api/reviews';
import { Button, Text, View } from '@/components/ui';

const STAR_COUNT = 5;

const StarPicker = ({
  rating,
  onSelect,
}: {
  rating: number;
  onSelect: (v: number) => void;
}) => (
  <View className="flex-row">
    {Array.from({ length: STAR_COUNT }, (_, i) => i + 1).map((star) => (
      <TouchableOpacity key={star} onPress={() => onSelect(star)} className="mr-1">
        <Text className={`text-3xl ${star <= rating ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600'}`}>
          ★
        </Text>
      </TouchableOpacity>
    ))}
  </View>
);

export default function AddReviewScreen() {
  const { productId } = useLocalSearchParams<{ productId: string }>();
  const router = useRouter();

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');

  // Find a delivered order containing this product
  const { data: ordersData, isLoading: ordersLoading } = useGetOrders({
    variables: { status: 'delivered', limit: 50 },
  });

  const rawOrders =
    ordersData?.success
      ? (ordersData.data?.items ?? ordersData.data?.orders ?? [])
      : [];

  const deliveredOrder = rawOrders.find((o) =>
    o.items.some((item) => item.productId === productId)
  );

  const { mutate: addReview, isPending } = useAddReview();

  const handleSubmit = () => {
    if (rating === 0) {
      Alert.alert('Lỗi', 'Vui lòng chọn số sao đánh giá.');
      return;
    }
    if (!comment.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập nhận xét.');
      return;
    }
    if (!deliveredOrder) {
      Alert.alert('Lỗi', 'Không tìm thấy đơn hàng đã nhận để đánh giá.');
      return;
    }

    addReview(
      {
        productId: productId ?? '',
        orderId: deliveredOrder.id,
        rating,
        comment: comment.trim(),
      },
      {
        onSuccess: () => {
          Alert.alert('Thành công', 'Đánh giá thành công!', [
            { text: 'OK', onPress: () => router.back() },
          ]);
        },
        onError: (err) => {
          Alert.alert('Lỗi', err.message ?? 'Không thể gửi đánh giá.');
        },
      }
    );
  };

  const noOrder = !ordersLoading && !deliveredOrder;

  return (
    <View className="flex-1 bg-white dark:bg-gray-900">
      <Stack.Screen options={{ title: 'Viết đánh giá' }} />

      <View className="flex-1 p-4">
        {/* Star rating */}
        <Text className="mb-2 font-semibold text-gray-900 dark:text-white">
          Chọn số sao
        </Text>
        <StarPicker rating={rating} onSelect={setRating} />

        {/* Comment */}
        <Text className="mb-2 mt-4 font-semibold text-gray-900 dark:text-white">
          Nhận xét
        </Text>
        <TextInput
          value={comment}
          onChangeText={(t) => setComment(t.slice(0, 500))}
          multiline
          numberOfLines={5}
          placeholder="Nhập nhận xét của bạn..."
          placeholderTextColor="#9ca3af"
          maxLength={500}
          className="rounded-lg border border-gray-300 p-3 text-gray-900 dark:border-gray-600 dark:text-white"
          style={{ textAlignVertical: 'top', minHeight: 100 }}
        />
        <Text className="mt-1 text-right text-xs text-gray-400">
          {comment.length}/500
        </Text>

        {/* Photo placeholder */}
        <Text className="mb-2 mt-4 font-semibold text-gray-900 dark:text-white">
          Ảnh (tùy chọn)
        </Text>
        <TouchableOpacity
          onPress={() => Alert.alert('Thông báo', 'Tính năng sẽ sớm có')}
          className="rounded-lg border border-dashed border-gray-300 p-4 dark:border-gray-600"
        >
          <Text className="text-center text-gray-500 dark:text-gray-400">
            + Thêm ảnh (tối đa 3)
          </Text>
        </TouchableOpacity>

        {/* No delivered order warning */}
        {noOrder && (
          <View className="mt-4 rounded-lg bg-red-50 p-3 dark:bg-red-900/20">
            <Text className="text-center text-red-600 dark:text-red-400">
              Bạn chưa mua sản phẩm này hoặc đơn hàng chưa được giao.
            </Text>
          </View>
        )}

        {/* Submit */}
        <View className="mt-6">
          <Button
            label={isPending ? 'Đang gửi...' : 'Gửi đánh giá'}
            onPress={handleSubmit}
            variant="default"
            disabled={isPending || noOrder || ordersLoading}
          />
        </View>
      </View>
    </View>
  );
}
