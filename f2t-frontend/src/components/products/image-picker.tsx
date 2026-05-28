import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import { Alert, Pressable } from 'react-native';

import { Button, Image, Text, View } from '@/components/ui';

type ImagePickerProps = {
  images: string[];
  onImagesChange: (images: string[]) => void;
  maxImages?: number;
  error?: string;
};

export const ProductImagePicker = ({
  images,
  onImagesChange,
  maxImages = 5,
  error,
}: ImagePickerProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const requestPermissions = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Sorry, we need camera roll permissions to upload images.',
        [{ text: 'OK' }]
      );
      return false;
    }
    return true;
  };

  const pickImage = async () => {
    if (images.length >= maxImages) {
      Alert.alert(
        'Maximum Images Reached',
        `You can only upload up to ${maxImages} images.`,
        [{ text: 'OK' }]
      );
      return;
    }

    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    setIsLoading(true);

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images', 'videos'],
        allowsEditing: false,
        quality: 0.8,
        allowsMultipleSelection: false,
      });

      if (!result.canceled && result.assets[0]) {
        const newImage = result.assets[0].uri;
        onImagesChange([...images, newImage]);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const takePhoto = async () => {
    if (images.length >= maxImages) {
      Alert.alert(
        'Maximum Images Reached',
        `You can only upload up to ${maxImages} images.`,
        [{ text: 'OK' }]
      );
      return;
    }

    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Sorry, we need camera permissions to take photos.',
        [{ text: 'OK' }]
      );
      return;
    }

    setIsLoading(true);

    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const newImage = result.assets[0].uri;
        onImagesChange([...images, newImage]);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const removeImage = (index: number) => {
    Alert.alert('Remove Image', 'Are you sure you want to remove this image?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          const newImages = images.filter((_, i) => i !== index);
          onImagesChange(newImages);
        },
      },
    ]);
  };

  const showImageOptions = () => {
    Alert.alert('Add Image', 'Choose how you want to add an image', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Take Photo', onPress: takePhoto },
      { text: 'Choose from Library', onPress: pickImage },
    ]);
  };

  return (
    <View>
      {/* Image Grid */}
      <View className="mb-4 flex-row flex-wrap gap-3">
        {images.map((imageUri, index) => (
          <View key={index} className="relative">
            <Image
              source={{ uri: imageUri }}
              className="size-24 rounded-lg"
              contentFit="cover"
            />

            {/* Remove Button */}
            <Pressable
              onPress={() => removeImage(index)}
              className="absolute -right-2 -top-2 size-6 items-center justify-center rounded-full bg-red-500"
            >
              <Text className="text-xs font-bold text-white">×</Text>
            </Pressable>
          </View>
        ))}

        {/* Add Image Button */}
        {images.length < maxImages && (
          <Pressable
            onPress={showImageOptions}
            className="size-24 items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 dark:border-gray-600 dark:bg-gray-800"
            disabled={isLoading}
          >
            <Text className="text-2xl text-gray-400 dark:text-gray-500">
              {isLoading ? '⏳' : '+'}
            </Text>
            <Text className="text-xs text-gray-500 dark:text-gray-400">
              Add Media
            </Text>
          </Pressable>
        )}
      </View>

      {/* Action Buttons */}
      <View className="mb-4 flex-row space-x-3">
        <Button
          label="📷 Take Photo"
          onPress={takePhoto}
          variant="outline"
          className="flex-1"
          disabled={isLoading || images.length >= maxImages}
        />
        <Button
          label="📁 Choose Media"
          onPress={pickImage}
          variant="outline"
          className="flex-1"
          disabled={isLoading || images.length >= maxImages}
        />
      </View>

      {/* Helper Text */}
      <View className="mb-2">
        <Text className="text-sm text-gray-600 dark:text-gray-400">
          {images.length} of {maxImages} media added
        </Text>
        {images.length === 0 && (
          <Text className="text-sm text-gray-500 dark:text-gray-500">
            Add high-quality photos to showcase your product. The first image
            will be the main photo.
          </Text>
        )}
      </View>

      {/* Error Message */}
      {error && (
        <Text className="text-sm text-red-600 dark:text-red-400">{error}</Text>
      )}
    </View>
  );
};
