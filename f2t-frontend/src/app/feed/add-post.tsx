import { zodResolver } from '@hookform/resolvers/zod';
import * as ImagePicker from 'expo-image-picker';
import { Stack, useRouter } from 'expo-router';
import * as React from 'react';
import { useForm } from 'react-hook-form';
import { Alert, Pressable, ScrollView } from 'react-native';
import { showMessage } from 'react-native-flash-message';
import { z } from 'zod';

import { useAddPost, useUploadMedia } from '@/api';
import { TagPicker } from '@/components/tag-picker';
import type { TagItem } from '@/components/tag-picker';
import {
  Button,
  ControlledInput,
  Image,
  showErrorMessage,
  Text,
  View,
} from '@/components/ui';

const schema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(2000),
  media: z
    .array(
      z.object({
        url: z.string().url(),
        type: z.enum(['image', 'video']),
        thumbnailUrl: z.string().url().optional(),
      })
    )
    .max(10)
    .default([]),
  tags: z
    .array(
      z.object({
        id: z.string(),
        type: z.enum(['consumer', 'farm']),
        name: z.string(),
      })
    )
    .default([]),
  hashtags: z.array(z.string()).default([]),
});

type FormType = z.infer<typeof schema>;

export default function AddPost() {
  const router = useRouter();
  const { control, handleSubmit, setValue, watch } = useForm<FormType>({
    resolver: zodResolver(schema),
    defaultValues: {
      media: [],
      tags: [],
      hashtags: [],
    },
  });

  const media = watch('media');
  const body = watch('body');

  const [tags, setTags] = React.useState<TagItem[]>([]);

  // Automatically extract hashtags from body
  React.useEffect(() => {
    const extracted = body?.match(/#\w+/g)?.map((h) => h.slice(1)) || [];
    const uniqueExtracted = Array.from(new Set(extracted));
    setValue('hashtags', uniqueExtracted);
  }, [body, setValue]);

  const { mutate: addPost, isPending } = useAddPost();
  const { mutateAsync: uploadMedia, isPending: isUploading } = useUploadMedia();

  const pickMedia = async () => {
    if (media.length >= 10) {
      Alert.alert('Limit Reached', 'You can only add up to 10 media items.');
      return;
    }

    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert('Permission needed', 'We need access to your photos.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images', 'videos'],
        allowsEditing: true,
        quality: 0.8,
      });


      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        const type = asset.type === 'video' ? 'video' : 'image';

        try {
          const uploadResult = await uploadMedia({
            file: {
              uri: asset.uri,
              name: asset.fileName ?? undefined,
              type: asset.mimeType ?? undefined,
            },
            type,
          });

          setValue('media', [
            ...media,
            {
              url: uploadResult.url,
              type: uploadResult.type,
            },
          ]);
        } catch (uploadError) {
          showErrorMessage('Failed to upload media');
        }
      }
    } catch (pickerError) {
      Alert.alert('Error', 'An unexpected error occurred while picking media.');
    }
  };

  const removeMedia = (index: number) => {
    setValue(
      'media',
      media.filter((_, i) => i !== index)
    );
  };

  const onSubmit = (data: FormType) => {
    addPost({ ...data, tags }, {
      onSuccess: () => {
        showMessage({
          message: 'Post added successfully',
          type: 'success',
        });
        router.back();
      },
      onError: () => {
        showErrorMessage('Error adding post');
      },
    });
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Add Post',
          headerBackTitle: 'Feed',
        }}
      />
      <ScrollView className="flex-1 bg-white p-4 dark:bg-black">
        <ControlledInput
          name="title"
          label="Title"
          control={control}
          testID="title"
        />
        <ControlledInput
          name="body"
          label="Content"
          control={control}
          multiline
          numberOfLines={6}
          placeholder="What's on your mind? Use #hashtags to categorize."
          testID="body-input"
        />

        <Text className="mb-2 mt-4 text-sm font-bold">Tags</Text>
        <TagPicker tags={tags} onChange={setTags} />

        <Text className="mb-2 mt-4 text-sm font-bold">
          Media ({media.length}/10)
        </Text>
        <View className="flex-row flex-wrap gap-2">
          {media.map((item, index) => (
            <View key={index} className="relative size-24">
              <Image
                source={{ uri: item.url }}
                className="size-full rounded-lg"
              />
              {item.type === 'video' && (
                <View className="absolute inset-0 items-center justify-center bg-black/20">
                  <Text className="text-2xl">▶️</Text>
                </View>
              )}
              <Pressable
                onPress={() => removeMedia(index)}
                className="absolute -right-2 -top-2 size-6 items-center justify-center rounded-full bg-red-500"
              >
                <Text className="text-white">×</Text>
              </Pressable>
            </View>
          ))}
          {media.length < 10 && (
            <Pressable
              onPress={pickMedia}
              disabled={isUploading}
              className="size-24 items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 dark:border-gray-800 dark:bg-gray-900"
            >
              <Text className="text-gray-500">{isUploading ? '...' : '+'}</Text>
            </Pressable>
          )}
        </View>

        <Button
          label="Add Post"
          loading={isPending}
          disabled={isUploading}
          onPress={handleSubmit(onSubmit)}
          className="mt-8"
          testID="add-post-button"
        />
      </ScrollView>
    </>
  );
}
