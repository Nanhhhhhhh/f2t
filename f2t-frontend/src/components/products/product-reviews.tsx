import { useRouter } from 'expo-router';
import React from 'react';
import { Image, ScrollView } from 'react-native';

import { useGetReviews } from '@/api/reviews';
import { Button, Text, View } from '@/components/ui';
import { useAuth } from '@/lib/auth';

type ProductReviewsProps = {
  productId: string;
  averageRating?: number;
  reviewCount?: number;
};

const Stars = ({ rating }: { rating: number }) => (
  <Text className="text-yellow-400">
    {'⭐'.repeat(Math.max(0, Math.min(5, rating)))}
  </Text>
);

export const ProductReviews = ({
  productId,
  averageRating,
  reviewCount,
}: ProductReviewsProps) => {
  const router = useRouter();
  const token = useAuth.use.token();
  const isAuthenticated = token !== null;

  const { data, isLoading } = useGetReviews({
    variables: { productId, page: 1, limit: 5 },
  });

  const reviews = data?.items ?? [];

  const handleWriteReview = () => {
    router.push(`/products/add-review?productId=${productId}`);
  };

  return (
    <View>
      {/* Header row */}
      <View className="mb-4 flex-row items-center justify-between">
        <View>
          <Text className="text-lg font-semibold text-gray-900 dark:text-white">
            Đánh giá
          </Text>
          {typeof averageRating === 'number' && (
            <Text className="text-sm text-gray-500 dark:text-gray-400">
              ⭐ {averageRating.toFixed(1)} ({reviewCount ?? 0} đánh giá)
            </Text>
          )}
        </View>
        {isAuthenticated && (
          <Button
            label="Viết đánh giá"
            onPress={handleWriteReview}
            variant="outline"
            className="px-3 py-1"
          />
        )}
      </View>

      {/* Loading */}
      {isLoading && (
        <Text className="text-gray-500 dark:text-gray-400">Đang tải...</Text>
      )}

      {/* Empty state */}
      {!isLoading && reviews.length === 0 && (
        <View className="rounded-lg bg-gray-50 p-6 dark:bg-gray-800/50">
          <Text className="text-center text-gray-500 dark:text-gray-400">
            Chưa có đánh giá nào. Hãy là người đầu tiên!
          </Text>
        </View>
      )}

      {/* Review list */}
      {reviews.map((review) => (
        <View
          key={review._id}
          className="mb-4 border-b border-gray-200 pb-4 dark:border-gray-700"
        >
          <View className="mb-1 flex-row items-center justify-between">
            <Text className="font-medium text-gray-900 dark:text-white">
              {review.customerName}
            </Text>
            <Text className="text-xs text-gray-500 dark:text-gray-400">
              {review.createdAt.substring(0, 10)}
            </Text>
          </View>
          <Stars rating={review.rating} />
          <Text className="mt-1 text-gray-700 dark:text-gray-300">
            {review.comment}
          </Text>
          {review.photos && review.photos.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="mt-2 flex-row"
            >
              {review.photos.map((uri, i) => (
                <Image
                  key={i}
                  source={{ uri }}
                  style={{ width: 50, height: 50, marginRight: 6, borderRadius: 4 }}
                />
              ))}
            </ScrollView>
          )}
        </View>
      ))}
    </View>
  );
};
