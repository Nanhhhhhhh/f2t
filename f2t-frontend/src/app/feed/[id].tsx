import { Link, Stack, useLocalSearchParams } from 'expo-router';
import * as React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
} from 'react-native';

import {
  useAddComment,
  useLikePost,
  usePost,
  useUnlikePost,
} from '@/api/posts';
import {
  ActivityIndicator,
  Button,
  FocusAwareStatusBar,
  Image,
  Text,
  View,
} from '@/components/ui';

export default function Post() {
  const local = useLocalSearchParams<{ id: string }>();
  const [commentText, setCommentText] = React.useState('');
  const [isLiked, setIsLiked] = React.useState(false);

  const {
    data: post,
    isPending,
    isError,
    refetch,
  } = usePost({
    //@ts-ignore
    variables: { id: local.id },
  });

  const { mutate: addComment, isPending: isAddingComment } = useAddComment();
  const { mutate: like } = useLikePost();
  const { mutate: unlike } = useUnlikePost();

  const handleAddComment = () => {
    if (!commentText.trim()) return;
    addComment(
      { id: local.id, content: commentText },
      {
        onSuccess: () => {
          setCommentText('');
          refetch();
        },
      }
    );
  };

  if (isPending) {
    return (
      <View className="flex-1 justify-center p-3">
        <Stack.Screen options={{ title: 'Post', headerBackTitle: 'Feed' }} />
        <FocusAwareStatusBar />
        <ActivityIndicator />
      </View>
    );
  }
  if (isError || !post) {
    return (
      <View className="flex-1 justify-center p-3">
        <Stack.Screen options={{ title: 'Post', headerBackTitle: 'Feed' }} />
        <FocusAwareStatusBar />
        <Text className="text-center">Error loading post</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1"
      keyboardVerticalOffset={100}
    >
      <ScrollView className="flex-1 bg-white dark:bg-black">
        <Stack.Screen
          options={{ title: 'Post Details', headerBackTitle: 'Feed' }}
        />
        <FocusAwareStatusBar />

        <View className="p-4">
          <View className="mb-4 flex-row items-center">
            <Image
              source={{ uri: post.authorId.avatarUrl }}
              className="mr-3 size-12 rounded-full"
            />
            <View className="flex-1">
              <View className="flex-row items-center">
                <Text className="text-base font-bold dark:text-white">
                  {post.authorId.firstName} {post.authorId.lastName}
                </Text>
                {post.authorRole === 'farm' && (
                  <View className="ml-2 rounded-full bg-green-100 px-2 py-0.5 dark:bg-green-900">
                    <Text className="text-[10px] text-green-800 dark:text-green-200">
                      FARM
                    </Text>
                  </View>
                )}
              </View>
              <Text className="text-xs text-gray-500">
                {new Date(post.createdAt).toLocaleDateString()}
              </Text>
            </View>
          </View>

          <Text className="mb-2 text-2xl font-bold dark:text-white">
            {post.title}
          </Text>
          <Text className="mb-4 text-base leading-6 text-gray-800 dark:text-gray-300">
            {post.body}
          </Text>

          {/* Media Grid */}
          {post.media?.length > 0 && (
            <View className="mb-4 gap-2">
              {post.media.map((item, index) => (
                <Image
                  key={index}
                  source={{ uri: item.url }}
                  className="h-64 w-full rounded-xl"
                  contentFit="cover"
                />
              ))}
            </View>
          )}

          {/* Tags & Hashtags */}
          {(post.tags?.length > 0 || post.hashtags?.length > 0) && (
            <View className="mb-4 flex-row flex-wrap gap-2">
              {post.tags?.map((tag) => (
                <Link
                  key={tag.id}
                  href={
                    tag.type === 'farm'
                      ? `/farms/${tag.id}`
                      : `/profile/${tag.id}`
                  }
                  asChild
                >
                  <Pressable className="rounded-full bg-blue-50 px-3 py-1 dark:bg-blue-900/30">
                    <Text className="text-sm font-medium text-blue-600 dark:text-blue-400">
                      @{tag.name}
                    </Text>
                  </Pressable>
                </Link>
              ))}
              {post.hashtags?.map((hashtag) => (
                <Text
                  key={hashtag}
                  className="text-sm font-medium text-primary-500"
                >
                  #{hashtag}
                </Text>
              ))}
            </View>
          )}

          {/* Interaction Row */}
          <View className="flex-row items-center border-y border-gray-100 py-3 dark:border-gray-800">
            <Pressable
              onPress={() => {
                if (isLiked) {
                  unlike({ id: post.id });
                  setIsLiked(false);
                } else {
                  like({ id: post.id });
                  setIsLiked(true);
                }
              }}
              className="mr-6 flex-row items-center"
            >
              <Text className="text-xl">{isLiked ? '❤️' : '🤍'}</Text>
              <Text className="ml-1 font-bold dark:text-white">
                {post.likesCount + (isLiked ? 1 : 0)}
              </Text>
            </Pressable>
            <View className="flex-row items-center">
              <Text className="text-xl">💬</Text>
              <Text className="ml-1 font-bold dark:text-white">
                {post.commentsCount}
              </Text>
            </View>
          </View>
        </View>

        {/* Comments Section */}
        <View className="p-4">
          <Text className="mb-4 text-lg font-bold dark:text-white">
            Comments
          </Text>

          {/* Comment Input */}
          <View className="mb-6 flex-row items-start">
            <TextInput
              className="mr-2 flex-1 rounded-xl border border-gray-200 p-3 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
              placeholder="Add a comment..."
              placeholderTextColor="#9CA3AF"
              value={commentText}
              onChangeText={setCommentText}
              multiline
              maxLength={500}
            />
            <Button
              label="Post"
              onPress={handleAddComment}
              loading={isAddingComment}
              disabled={!commentText.trim()}
              className="h-12"
            />
          </View>

          {/* Comment List */}
          {post.comments?.map((comment) => (
            <View key={comment.id} className="mb-5">
              <View className="mb-1 flex-row items-center">
                <Image
                  source={{ uri: comment.authorAvatarUrl }}
                  className="mr-2 size-7 rounded-full"
                />
                <Text className="text-sm font-bold dark:text-white">
                  {comment.authorName}
                </Text>
                <Text className="ml-2 text-[10px] text-gray-500">
                  {new Date(comment.createdAt).toLocaleDateString()}
                </Text>
              </View>
              <Text className="ml-9 text-sm leading-5 text-gray-700 dark:text-gray-300">
                {comment.content}
              </Text>
            </View>
          ))}

          {post.comments?.length === 0 && (
            <Text className="py-8 text-center text-gray-400">
              No comments yet. Be the first to comment!
            </Text>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
