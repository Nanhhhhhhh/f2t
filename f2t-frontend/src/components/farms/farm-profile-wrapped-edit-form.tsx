import * as ImagePicker from 'expo-image-picker';
import { Camera } from 'lucide-react-native';
import React, { useState } from 'react';
import { Alert, Image, ScrollView, TouchableOpacity } from 'react-native';

import { client } from '@/api/common/client';
import { FarmProfileEditForm } from '@/components/farms/farm-profile-edit-form';
import { Text, View } from '@/components/ui';
import type { Farm } from '@/types';

export type FarmProfileWrappedEditFormProps = {
  farm: Farm;
  onSuccess?: (updatedFarm: Farm) => void;
  onCancel?: () => void;
};

export const FarmProfileWrappedEditForm = ({
  farm,
  onSuccess,
  onCancel,
}: FarmProfileWrappedEditFormProps) => {
  const [logoUrl, setLogoUrl] = useState(farm?.profileImageUrl || '');
  const [coverImageUrl, setCoverImageUrl] = useState(
    farm?.bannerImageUrl || ''
  );
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);

  const uploadImage = async (
    asset: ImagePicker.ImagePickerAsset,
    type: 'logo' | 'cover'
  ) => {
    if (type === 'logo') setIsUploadingLogo(true);
    else setIsUploadingCover(true);

    try {
      const formData = new FormData();
      formData.append('file', {
        uri: asset.uri,
        name: asset.fileName || 'image.jpg',
        type: asset.mimeType || 'image/jpeg',
      } as unknown as Blob);

      const response = await client.post('/uploads/image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (response.data?.success && response.data?.data?.url) {
        if (type === 'logo') setLogoUrl(response.data.data.url);
        else setCoverImageUrl(response.data.data.url);
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to upload image. Please try again.');
    } finally {
      if (type === 'logo') setIsUploadingLogo(false);
      else setIsUploadingCover(false);
    }
  };

  const handlePickImage = async (type: 'logo' | 'cover') => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: type === 'logo' ? [1, 1] : [16, 9],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      uploadImage(result.assets[0], type);
    }
  };

  const farmWithImages = {
    ...farm,
    profileImageUrl: logoUrl,
    bannerImageUrl: coverImageUrl,
  } as Farm;

  return (
    <ScrollView className="flex-1 bg-white dark:bg-gray-900">
      {/* Cover Image */}
      <TouchableOpacity
        onPress={() => handlePickImage('cover')}
        disabled={isUploadingCover}
      >
        <View className="relative h-40 w-full items-center justify-center bg-gray-300 dark:bg-gray-700">
          {coverImageUrl ? (
            <Image source={{ uri: coverImageUrl }} className="size-full" />
          ) : (
            <Text className="text-gray-500">Tap to add cover image</Text>
          )}
          <View className="absolute bottom-2 right-2 rounded-full bg-black/50 p-2">
            <Camera size={20} color="white" />
          </View>
          {isUploadingCover && (
            <Text className="absolute rounded bg-black/50 p-1 text-white">
              Uploading...
            </Text>
          )}
        </View>
      </TouchableOpacity>

      {/* Logo Image */}
      <View className="z-10 -mt-12 ml-4 items-start">
        <TouchableOpacity
          onPress={() => handlePickImage('logo')}
          disabled={isUploadingLogo}
        >
          <View className="relative size-24 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-gray-200 dark:border-gray-900 dark:bg-gray-700">
            {logoUrl ? (
              <Image source={{ uri: logoUrl }} className="size-full" />
            ) : (
              <Text className="text-xs text-gray-500">Logo</Text>
            )}
            <View className="absolute bottom-0 w-full items-center bg-black/40 py-1">
              <Camera size={12} color="white" />
            </View>
          </View>
        </TouchableOpacity>
      </View>

      <FarmProfileEditForm
        farm={farmWithImages}
        onSuccess={onSuccess}
        onCancel={onCancel}
      />
    </ScrollView>
  );
};
