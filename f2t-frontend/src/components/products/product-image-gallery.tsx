import React, { useState } from 'react';
import { Dimensions, Pressable, ScrollView } from 'react-native';

import { Image, Text, View } from '@/components/ui';

type ProductImageGalleryProps = {
  images: string[];
  productName: string;
};

const { width: screenWidth } = Dimensions.get('window');

export const ProductImageGallery = ({
  images,
  productName,
}: ProductImageGalleryProps) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Handle undefined or empty images array
  if (!images || images.length === 0) {
    return (
      <View className="h-80 items-center justify-center bg-gray-100 dark:bg-gray-700">
        <Text className="text-6xl">📦</Text>
        <Text className="mt-2 text-gray-600 dark:text-gray-400">
          No images available
        </Text>
      </View>
    );
  }

  if (images.length === 1) {
    return (
      <View className="h-80">
        <Image
          source={{ uri: images[0] }}
          className="size-full"
          contentFit="cover"
          alt={`${productName} image`}
        />
      </View>
    );
  }

  return (
    <View className="h-80">
      {/* Main Image */}
      <View className="relative h-64">
        <Image
          source={{ uri: images[selectedIndex] }}
          className="size-full"
          contentFit="cover"
          alt={`${productName} image ${selectedIndex + 1}`}
        />

        {/* Image Counter */}
        <View className="absolute bottom-4 right-4 rounded-full bg-black/50 px-3 py-1">
          <Text className="text-sm text-white">
            {selectedIndex + 1} / {images.length}
          </Text>
        </View>
      </View>

      {/* Thumbnail Strip */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="h-16 bg-gray-100 dark:bg-gray-800"
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 8 }}
      >
        <View className="flex-row space-x-2">
          {images.map((imageUri, index) => (
            <Pressable
              key={index}
              onPress={() => setSelectedIndex(index)}
              className={`size-12 overflow-hidden rounded-lg border-2 ${
                selectedIndex === index
                  ? 'border-blue-500'
                  : 'border-transparent'
              }`}
            >
              <Image
                source={{ uri: imageUri }}
                className="size-full"
                contentFit="cover"
                alt={`${productName} thumbnail ${index + 1}`}
              />
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};
