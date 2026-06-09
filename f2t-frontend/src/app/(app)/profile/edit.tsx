import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { Camera, User } from 'lucide-react-native';
import React, { useState } from 'react';
import { Alert, Image, ScrollView, TouchableOpacity } from 'react-native';

import { client } from '@/api/common/client';
import { useUpdateProfile } from '@/api/users/use-update-profile';
import {
  Button,
  FocusAwareStatusBar,
  Input,
  Text,
  View,
} from '@/components/ui';
import { useAuth } from '@/lib';

export default function EditProfileScreen() {
  const router = useRouter();
  const user = useAuth.use.user();

  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');
  const [addressLine1, setAddressLine1] = useState(user?.location?.address?.street || '');
  const [city, setCity] = useState(user?.location?.address?.city || '');
  const [postalCode, setPostalCode] = useState(user?.location?.address?.zipCode || '');
  const [country, setCountry] = useState(user?.location?.address?.country || 'VNM');
  const [isUploading, setIsUploading] = useState(false);

  const updateProfileMutation = useUpdateProfile();

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      uploadImage(result.assets[0]);
    }
  };

  const uploadImage = async (asset: ImagePicker.ImagePickerAsset) => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', {
        uri: asset.uri,
        name: asset.fileName || 'image.jpg',
        type: asset.mimeType || 'image/jpeg',
      } as unknown as Blob);

      const response = await client.post('/uploads/image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data?.success && response.data?.data?.url) {
        setAvatarUrl(response.data.data.url);
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to upload image. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = () => {
    updateProfileMutation.mutate(
      { 
        firstName, 
        lastName, 
        phoneNumber, 
        avatarUrl,
        location: {
          addressLine1,
          city,
          postalCode,
          country
        }
      },
      {
        onSuccess: () => {
          Alert.alert('Success', 'Profile updated successfully', [
            { text: 'OK', onPress: () => router.back() },
          ]);
        },
      }
    );
  };

  return (
    <View className="flex-1 bg-white dark:bg-gray-900">
      <FocusAwareStatusBar />
      <ScrollView className="flex-1 px-4 pt-4">
        <View className="mb-8 items-center">
          <TouchableOpacity onPress={handlePickImage} disabled={isUploading}>
            <View className="relative size-24 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700">
              {avatarUrl ? (
                <Image
                  source={{ uri: avatarUrl }}
                  className="size-24 rounded-full"
                />
              ) : (
                <User size={48} className="text-gray-500 dark:text-gray-400" />
              )}
              <View className="bg-primary absolute bottom-0 right-0 rounded-full p-2">
                <Camera size={16} color="white" />
              </View>
            </View>
          </TouchableOpacity>
          {isUploading && (
            <Text className="mt-2 text-sm text-gray-500">Uploading...</Text>
          )}
        </View>

        <View className="mb-6 space-y-4">
          <Input
            label="First Name"
            value={firstName}
            onChangeText={setFirstName}
          />
          <Input
            label="Last Name"
            value={lastName}
            onChangeText={setLastName}
          />
          <Input
            label="Phone Number"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            keyboardType="phone-pad"
          />
        </View>

        <View className="mb-6">
          <Text className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
            Address
          </Text>
          <View className="space-y-4">
            <Input
              label="Address Line 1"
              value={addressLine1}
              onChangeText={setAddressLine1}
              placeholder="123 Street Name"
            />
            <View className="flex-row space-x-3">
              <View className="flex-1">
                <Input
                  label="City"
                  value={city}
                  onChangeText={setCity}
                  placeholder="Hồ Chí Minh"
                />
              </View>
            </View>
            <View className="flex-row space-x-3">
              <View className="flex-1">
                <Input
                  label="Postal Code"
                  value={postalCode}
                  onChangeText={setPostalCode}
                  placeholder="70000"
                />
              </View>
              <View className="flex-1">
                <Input
                  label="Country"
                  value={country}
                  onChangeText={setCountry}
                  placeholder="VNM"
                />
              </View>
            </View>
          </View>
        </View>

        <Button
          label={updateProfileMutation.isPending ? 'Saving...' : 'Save Profile'}
          onPress={handleSave}
          disabled={updateProfileMutation.isPending || isUploading}
        />
        <TouchableOpacity
          onPress={() => router.push('/(app)/profile/change-password')}
          className="mt-4 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
        >
          <Text className="font-medium text-gray-900 dark:text-white">Đổi mật khẩu</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
