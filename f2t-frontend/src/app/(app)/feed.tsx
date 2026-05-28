import { Link, useRouter } from 'expo-router';
import React, { useCallback, useMemo } from 'react';
import { FlatList, Pressable, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useForYouPosts, useLikePost, useUnlikePost } from '@/api/posts';
import type { Post } from '@/api/posts/types';
import {
  ActivityIndicator,
  FocusAwareStatusBar,
  Image,
  Text,
  View,
} from '@/components/ui';

export default function Feed() {
  const insets = useSafeAreaInsets();
  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
    isRefetching,
  } = useForYouPosts();

  const posts = useMemo(() => {
    return data?.pages.flatMap((page) => page.items) || [];
  }, [data]);

  const headerStyle = useMemo(() => ({ paddingTop: insets.top + 8 }), [insets.top]);

  const renderItem = useCallback(
    ({ item }: { item: Post }) => <PostCard post={item} />,
    []
  );

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center">
        <FocusAwareStatusBar />
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50 dark:bg-black">
      <FocusAwareStatusBar />
      <View className="flex-row items-center justify-between border-b border-gray-200 bg-white px-4 py-2 dark:border-gray-800 dark:bg-gray-900" style={headerStyle}>
        <Text className="text-xl font-bold dark:text-white">For You</Text>
        <Link href="/feed/add-post" asChild>
          <Pressable className="rounded-full bg-primary-500 px-3 py-1">
            <Text className="font-bold text-white">Post</Text>
          </Pressable>
        </Link>
      </View>
      <FlatList
        data={posts}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
        }
        ListFooterComponent={
          isFetchingNextPage ? (
            <View className="py-4">
              <ActivityIndicator />
            </View>
          ) : null
        }
        contentContainerStyle={{ padding: 12 }}
      />
    </View>
  );
}

const PostCard = ({ post }: { post: Post }) => {
  const { mutate: like } = useLikePost();
  const { mutate: unlike } = useUnlikePost();
  const [isLiked, setIsLiked] = React.useState(false); // Simple local state for demo, should come from API

  return (
    <View className="mb-4 rounded-xl bg-white p-4 shadow-sm dark:bg-gray-900">
      <View className="mb-3 flex-row items-center">
        <Image
          source={{ uri: post.authorId.avatarUrl }}
          className="mr-3 size-10 rounded-full"
        />
        <View className="flex-1">
          <View className="flex-row items-center">
            <Text className="font-bold dark:text-white">
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

      <Text className="mb-1 text-lg font-bold dark:text-white">
        {post.title}
      </Text>
      <Text className="mb-3 leading-5 text-gray-800 dark:text-gray-300">
        {post.body}
      </Text>

      {/* Media slider/grid placeholder */}
      {post.media?.length > 0 && (
        <View className="mb-3 h-60 w-full overflow-hidden rounded-xl">
          <Image
            source={{ uri: post.media[0].url }}
            className="size-full"
            contentFit="cover"
          />
          {post.media.length > 1 && (
            <View className="absolute bottom-2 right-2 rounded-full bg-black/60 px-2 py-1">
              <Text className="text-[10px] text-white">
                + {post.media.length - 1} more
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Tags & Hashtags */}
      {(post.tags?.length > 0 || post.hashtags?.length > 0) && (
        <View className="mb-3 flex-row flex-wrap gap-2">
          {post.tags?.map((tag) => (
            <Link
              key={tag.id}
              href={
                tag.type === 'farm' ? `/farms/${tag.id}` : `/profile/${tag.id}`
              }
              asChild
            >
              <Pressable className="rounded-full bg-blue-50 px-2 py-1 dark:bg-blue-900/30">
                <Text className="text-xs font-medium text-blue-600 dark:text-blue-400">
                  @{tag.name}
                </Text>
              </Pressable>
            </Link>
          ))}
          {post.hashtags?.map((hashtag) => (
            <Text
              key={hashtag}
              className="text-xs font-medium text-primary-500"
            >
              #{hashtag}
            </Text>
          ))}
        </View>
      )}

      {/* Interactions */}
      <View className="flex-row items-center border-t border-gray-100 pt-3 dark:border-gray-800">
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
          <Text className="text-lg">{isLiked ? '❤️' : '🤍'}</Text>
          <Text className="ml-1 font-medium dark:text-white">
            {post.likesCount + (isLiked ? 1 : 0)}
          </Text>
        </Pressable>
        <Link href={`/feed/${post.id}`} asChild>
          <Pressable className="flex-row items-center">
            <Text className="text-lg">💬</Text>
            <Text className="ml-1 font-medium dark:text-white">
              {post.commentsCount}
            </Text>
          </Pressable>
        </Link>
      </View>
    </View>
  );
};
