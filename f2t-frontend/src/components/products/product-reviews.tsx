import React, { useState } from 'react';

import { Button, Text, View } from '@/components/ui';

type ProductReviewsProps = {
  productId: string;
};

// Mock review data - in a real app, this would come from an API
const mockReviews = [
  {
    id: '1',
    userName: 'Sarah M.',
    rating: 5,
    comment:
      'Amazing quality! The tomatoes were so fresh and flavorful. Will definitely order again.',
    date: '2024-07-10',
    verified: true,
  },
  {
    id: '2',
    userName: 'Mike R.',
    rating: 4,
    comment:
      'Great product, fast delivery. The packaging was excellent and kept everything fresh.',
    date: '2024-07-08',
    verified: true,
  },
  {
    id: '3',
    userName: 'Lisa K.',
    rating: 5,
    comment:
      "Best tomatoes I've had in years! You can really taste the difference with farm-fresh produce.",
    date: '2024-07-05',
    verified: false,
  },
];

// Star rating component
const StarRating = ({
  rating,
  size = 'sm',
}: {
  rating: number;
  size?: 'sm' | 'lg';
}) => {
  const stars = Array.from({ length: 5 }, (_, index) => {
    const filled = index < rating;
    return (
      <Text
        key={index}
        className={`${size === 'lg' ? 'text-lg' : 'text-sm'} ${
          filled ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600'
        }`}
      >
        ★
      </Text>
    );
  });

  return <View className="flex-row">{stars}</View>;
};

// Individual review component
const ReviewItem = ({ review }: { review: (typeof mockReviews)[0] }) => (
  <View className="border-b border-gray-200 pb-4 dark:border-gray-700">
    <View className="mb-2 flex-row items-center justify-between">
      <View className="flex-row items-center">
        <Text className="font-medium text-gray-900 dark:text-white">
          {review.userName}
        </Text>
        {review.verified && (
          <View className="ml-2 rounded-full bg-green-100 px-2 py-0.5 dark:bg-green-900/20">
            <Text className="text-xs font-medium text-green-800 dark:text-green-300">
              Verified
            </Text>
          </View>
        )}
      </View>
      <Text className="text-sm text-gray-500 dark:text-gray-500">
        {new Date(review.date).toLocaleDateString()}
      </Text>
    </View>

    <View className="mb-2">
      <StarRating rating={review.rating} />
    </View>

    <Text className="text-gray-700 dark:text-gray-300">{review.comment}</Text>
  </View>
);

// Reviews summary component
const ReviewsSummary = ({ reviews }: { reviews: typeof mockReviews }) => {
  // Safely check reviews array
  if (!reviews || reviews.length === 0) {
    return null;
  }

  const averageRating =
    reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;
  const ratingCounts = [5, 4, 3, 2, 1].map(
    (rating) => reviews.filter((review) => review.rating === rating).length
  );

  return (
    <View className="mb-6 rounded-lg bg-gray-50 p-4 dark:bg-gray-800/50">
      <View className="mb-4 flex-row items-center">
        <View className="mr-4">
          <Text className="text-3xl font-bold text-gray-900 dark:text-white">
            {averageRating.toFixed(1)}
          </Text>
          <StarRating rating={Math.round(averageRating)} size="lg" />
        </View>
        <View className="flex-1">
          <Text className="text-sm text-gray-600 dark:text-gray-400">
            Based on {reviews.length} reviews
          </Text>
          <Text className="text-sm text-gray-600 dark:text-gray-400">
            {reviews.filter((r) => r.verified).length} verified purchases
          </Text>
        </View>
      </View>

      {/* Rating breakdown */}
      <View className="space-y-1">
        {[5, 4, 3, 2, 1].map((rating, index) => (
          <View key={rating} className="flex-row items-center">
            <Text className="w-8 text-sm text-gray-600 dark:text-gray-400">
              {rating}★
            </Text>
            <View className="mx-2 h-2 flex-1 rounded-full bg-gray-200 dark:bg-gray-700">
              <View
                className="h-full rounded-full bg-yellow-400"
                style={{
                  width: `${reviews.length > 0 ? (ratingCounts[index] / reviews.length) * 100 : 0}%`,
                }}
              />
            </View>
            <Text className="w-8 text-sm text-gray-600 dark:text-gray-400">
              {ratingCounts[index]}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};

export const ProductReviews = ({ productId }: ProductReviewsProps) => {
  const [showAllReviews, setShowAllReviews] = useState(false);

  // In a real app, you would fetch reviews based on productId
  const reviews = mockReviews;

  const handleWriteReview = () => {
    // TODO: Implement write review functionality
  };

  // Safely check reviews array
  if (!reviews || reviews.length === 0) {
    return (
      <View>
        <Text className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          Customer Reviews
        </Text>
        <View className="rounded-lg bg-gray-50 p-6 text-center dark:bg-gray-800/50">
          <Text className="mb-2 text-gray-600 dark:text-gray-400">
            No reviews yet
          </Text>
          <Text className="mb-4 text-sm text-gray-500 dark:text-gray-500">
            Be the first to review this product!
          </Text>
          <Button
            label="Write a Review"
            onPress={handleWriteReview}
            variant="outline"
          />
        </View>
      </View>
    );
  }

  // Calculate displayed reviews after safety check
  const displayedReviews = showAllReviews ? reviews : reviews.slice(0, 2);

  return (
    <View>
      <View className="mb-4 flex-row items-center justify-between">
        <Text className="text-lg font-semibold text-gray-900 dark:text-white">
          Customer Reviews
        </Text>
        <Button
          label="Write Review"
          onPress={handleWriteReview}
          variant="ghost"
          className="px-3 py-1"
        />
      </View>

      <ReviewsSummary reviews={reviews} />

      <View className="space-y-4">
        {displayedReviews.map((review) => (
          <ReviewItem key={review.id} review={review} />
        ))}
      </View>

      {reviews.length > 2 && (
        <View className="mt-4">
          <Button
            label={
              showAllReviews
                ? 'Show Less'
                : `Show All ${reviews.length} Reviews`
            }
            onPress={() => setShowAllReviews(!showAllReviews)}
            variant="ghost"
            className="w-full"
          />
        </View>
      )}
    </View>
  );
};
