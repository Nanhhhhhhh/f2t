import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Camera, X } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  TouchableOpacity,
} from 'react-native';

import { client } from '@/api/common/client';
import { useGetProduct, useUpdateProduct } from '@/api/products';
import {
  Button,
  Checkbox,
  FocusAwareStatusBar,
  Input,
  Select,
  Text,
  View,
} from '@/components/ui';

const CATEGORIES = [
  { label: 'Rau củ', value: 'vegetables' },
  { label: 'Trái cây', value: 'fruits' },
  { label: 'Rau thơm & Thảo mộc', value: 'herbs' },
  { label: 'Nấm', value: 'mushrooms' },
  { label: 'Ngũ cốc & Hạt', value: 'grains' },
  { label: 'Sữa & Sản phẩm từ sữa', value: 'dairy' },
  { label: 'Trứng sạch', value: 'eggs' },
  { label: 'Mật ong & Sản phẩm ong', value: 'honey' },
  { label: 'Khác', value: 'other' },
];

const UNITS = [
  { label: 'Kilogram (kg)', value: 'kg' },
  { label: 'Gram (g)', value: 'g' },
  { label: 'Piece', value: 'piece' },
  { label: 'Bunch', value: 'bunch' },
  { label: 'Box', value: 'box' },
  { label: 'Bag', value: 'bag' },
  { label: 'Liter', value: 'liter' },
];

export default function EditProductScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: productData, isLoading } = useGetProduct({
    variables: { id: id as string },
  });
  const updateProductMutation = useUpdateProduct();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [pricePerUnit, setPricePerUnit] = useState('');
  const [unit, setUnit] = useState('');
  const [availableQuantity, setAvailableQuantity] = useState('');
  const [isOrganic, setIsOrganic] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (productData?.data) {
      const p = productData.data;
      setName(p.name || '');
      setDescription(p.description || '');
      setCategory(p.category || '');
      setPricePerUnit(p.pricePerUnit?.toString() || '');
      setUnit(p.unit || '');
      setAvailableQuantity(p.availableQuantity?.toString() || '');
      setIsOrganic(p.isOrganic || false);
      setImages(p.images || []);
    }
  }, [productData]);

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsEditing: false,
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
      const isVideo = asset.mimeType?.startsWith('video/') ?? false;
      formData.append('file', {
        uri: asset.uri,
        name: asset.fileName || (isVideo ? 'video.mp4' : 'image.jpg'),
        type: asset.mimeType || 'image/jpeg',
      } as unknown as Blob);

      const response = await client.post(isVideo ? '/uploads/media' : '/uploads/image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (response.data?.success && response.data?.data?.url) {
        setImages((prev) => [...prev, response.data.data.url]);
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to upload image. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const removeImage = (indexToRemove: number) => {
    setImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSave = () => {
    updateProductMutation.mutate(
      {
        id: id as string,
        name,
        description,
        category,
        price: parseFloat(pricePerUnit),
        unit,
        stockQuantity: parseInt(availableQuantity, 10),
        organicCertified: isOrganic,
        images,
      },
      {
        onSuccess: () => {
          Alert.alert('Success', 'Product updated successfully', [
            { text: 'OK', onPress: () => router.back() },
          ]);
        },
      }
    );
  };

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 dark:bg-gray-900">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white dark:bg-gray-900">
      <FocusAwareStatusBar />
      <ScrollView className="flex-1 px-4 pt-4">
        {/* Images */}
        <Text className="mb-2 text-lg font-bold text-gray-900 dark:text-white">
          Product Images
        </Text>
        <ScrollView horizontal className="mb-6 flex-row space-x-4">
          {images.map((imgUrl, idx) => (
            <View
              key={idx}
              className="relative mr-4 size-24 rounded-lg bg-gray-200"
            >
              <Image
                source={{ uri: imgUrl }}
                className="size-full rounded-lg"
              />
              <TouchableOpacity
                onPress={() => removeImage(idx)}
                className="absolute -right-2 -top-2 rounded-full bg-red-500 p-1"
              >
                <X size={12} color="white" />
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity onPress={handlePickImage} disabled={isUploading}>
            <View className="size-24 items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 dark:border-gray-600 dark:bg-gray-800">
              <Camera size={24} className="text-gray-400" />
              <Text className="mt-1 text-xs text-gray-500">Add Image</Text>
            </View>
          </TouchableOpacity>
        </ScrollView>
        {isUploading && (
          <Text className="mb-4 text-sm text-gray-500">Uploading...</Text>
        )}

        <View className="mb-6 space-y-4">
          <Input label="Name" value={name} onChangeText={setName} />
          <Input
            label="Description"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
          />
          <Select
            label="Category"
            options={CATEGORIES}
            value={category}
            onSelect={(val) => setCategory(String(val))}
          />
          <Input
            label="Price Per Unit"
            value={pricePerUnit}
            onChangeText={setPricePerUnit}
            keyboardType="decimal-pad"
          />
          <Select
            label="Unit"
            options={UNITS}
            value={unit}
            onSelect={(val) => setUnit(String(val))}
          />
          <Input
            label="Available Quantity"
            value={availableQuantity}
            onChangeText={setAvailableQuantity}
            keyboardType="number-pad"
          />
          <View className="pt-2">
            <Checkbox
              label="Organic Certified"
              checked={isOrganic}
              onChange={setIsOrganic}
              accessibilityLabel="Organic product checkbox"
            />
          </View>
        </View>

        <Button
          label={updateProductMutation.isPending ? 'Saving...' : 'Save Product'}
          onPress={handleSave}
          disabled={updateProductMutation.isPending || isUploading}
          className="mb-8"
        />
      </ScrollView>
    </View>
  );
}
