import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import { Alert, Image, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';

import { useGetOrders } from '@/api/orders';
import { useAddReview } from '@/api/reviews';
import { useUploadMedia } from '@/api/uploads';
import { Button, Text, View } from '@/components/ui';

const STAR_COUNT = 5;

const styles = StyleSheet.create({
  textInput: { textAlignVertical: 'top', minHeight: 100 },
  photo: { width: 80, height: 80, borderRadius: 8 },
});

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
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const { mutateAsync: uploadMedia } = useUploadMedia();

  const handleAddPhoto = async () => {
    if (photos.length >= 3) {
      Alert.alert('Thông báo', 'Tối đa 3 ảnh.');
      return;
    }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Lỗi', 'Cần quyền truy cập thư viện ảnh.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsMultipleSelection: false,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setUploading(true);
    try {
      const res = await uploadMedia({
        file: { uri: asset.uri, name: asset.fileName ?? 'photo.jpg', type: 'image/jpeg' },
        type: 'image',
      });
      setPhotos((prev) => [...prev, res.url]);
    } catch {
      Alert.alert('Lỗi', 'Không thể tải ảnh lên. Thử lại.');
    } finally {
      setUploading(false);
    }
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

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

  const queryClient = useQueryClient();
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
        photos,
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['product'] });
          queryClient.invalidateQueries({ queryKey: ['reviews'] });
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
          style={styles.textInput}
        />
        <Text className="mt-1 text-right text-xs text-gray-400">
          {comment.length}/500
        </Text>

        {/* Photo picker */}
        <Text className="mb-2 mt-4 font-semibold text-gray-900 dark:text-white">
          Ảnh (tùy chọn)
        </Text>
        <View className="flex-row flex-wrap gap-2">
          {photos.map((uri, i) => (
            <View key={i} className="relative">
              <Image
                source={{ uri }}
                style={styles.photo}
              />
              <TouchableOpacity
                onPress={() => handleRemovePhoto(i)}
                className="absolute -right-2 -top-2 h-5 w-5 items-center justify-center rounded-full bg-red-500"
              >
                <Text className="text-xs font-bold text-white">×</Text>
              </TouchableOpacity>
            </View>
          ))}
          {photos.length < 3 && (
            <TouchableOpacity
              onPress={handleAddPhoto}
              disabled={uploading}
              className="h-20 w-20 items-center justify-center rounded-lg border border-dashed border-gray-300 dark:border-gray-600"
            >
              <Text className="text-2xl text-gray-400">+</Text>
              {uploading && (
                <Text className="text-xs text-gray-400">Đang tải</Text>
              )}
            </TouchableOpacity>
          )}
        </View>

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
            disabled={isPending || uploading || noOrder || ordersLoading}
          />
        </View>
      </View>
    </View>
  );
}
