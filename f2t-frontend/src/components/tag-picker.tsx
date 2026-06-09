import * as React from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  TextInput,
} from 'react-native';

import { client } from '@/api/common/client';
import { Text, View } from '@/components/ui';

export type TagItem = {
  id: string;
  type: 'consumer' | 'farm';
  name: string;
};

type Props = {
  tags: TagItem[];
  onChange: (tags: TagItem[]) => void;
  maxTags?: number;
};

type SearchResult = { id: string; name: string };

export function TagPicker({ tags, onChange, maxTags = 5 }: Props) {
  const [visible, setVisible] = React.useState(false);
  const [tab, setTab] = React.useState<'consumer' | 'farm'>('consumer');
  const [searchText, setSearchText] = React.useState('');
  const [results, setResults] = React.useState<SearchResult[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!visible) return;
    if (!searchText.trim()) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        if (tab === 'consumer') {
          const res = await client({
            url: 'users/search',
            method: 'GET',
            params: { q: searchText },
          });
          const data: { id: string; name: string }[] = res.data.data ?? [];
          setResults(data.map((u) => ({ id: u.id, name: u.name })));
        } else {
          const res = await client({
            url: 'farms',
            method: 'GET',
            params: { search: searchText, limit: 10 },
          });
          const items: { id: string; name: string }[] =
            res.data.data?.items ?? res.data.data ?? [];
          setResults(items.map((f) => ({ id: f.id, name: f.name })));
        }
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchText, tab, visible]);

  const handleOpen = () => {
    setSearchText('');
    setResults([]);
    setVisible(true);
  };

  const handleClose = () => setVisible(false);

  const addTag = (item: SearchResult) => {
    if (tags.some((t) => t.id === item.id)) return;
    const next: TagItem[] = [...tags, { id: item.id, type: tab, name: item.name }];
    onChange(next);
    if (next.length >= maxTags) handleClose();
  };

  const removeTag = (id: string) => onChange(tags.filter((t) => t.id !== id));

  const switchTab = (newTab: 'consumer' | 'farm') => {
    setTab(newTab);
    setSearchText('');
    setResults([]);
  };

  return (
    <View>
      {/* Selected tag chips */}
      {tags.length > 0 && (
        <View className="mb-2 flex-row flex-wrap gap-2">
          {tags.map((tag) => (
            <View
              key={tag.id}
              className="flex-row items-center rounded-full bg-blue-100 px-3 py-1 dark:bg-blue-900"
            >
              <Text className="text-blue-800 dark:text-blue-200">
                @{tag.name}
              </Text>
              <Pressable onPress={() => removeTag(tag.id)} className="ml-2">
                <Text className="text-blue-800 dark:text-blue-200">×</Text>
              </Pressable>
            </View>
          ))}
        </View>
      )}

      {/* Add tag button */}
      {tags.length < maxTags && (
        <Pressable
          onPress={handleOpen}
          className="self-start rounded-full border border-gray-300 px-3 py-1 dark:border-gray-700"
        >
          <Text className="text-gray-500">+ Tag người / farm</Text>
        </Pressable>
      )}

      {/* Search modal */}
      <Modal
        visible={visible}
        animationType="slide"
        transparent
        onRequestClose={handleClose}
      >
        <Pressable
          className="flex-1 bg-black/40"
          onPress={handleClose}
        />
        <View className="rounded-t-2xl bg-white p-4 dark:bg-neutral-900">
          {/* Tab buttons */}
          <View className="mb-3 flex-row gap-2">
            {(['consumer', 'farm'] as const).map((t) => (
              <Pressable
                key={t}
                onPress={() => switchTab(t)}
                className={`flex-1 rounded-lg py-2 ${tab === t ? 'bg-blue-500' : 'bg-gray-100 dark:bg-neutral-700'}`}
              >
                <Text
                  className={`text-center font-medium ${tab === t ? 'text-white' : 'text-gray-700 dark:text-gray-200'}`}
                >
                  {t === 'consumer' ? 'Người dùng' : 'Farm'}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Search input */}
          <TextInput
            className="mb-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-gray-900 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
            placeholder={tab === 'consumer' ? 'Tìm người dùng...' : 'Tìm farm...'}
            value={searchText}
            onChangeText={setSearchText}
            autoFocus
            placeholderTextColor="#9ca3af"
          />

          {/* Results */}
          {loading ? (
            <ActivityIndicator className="my-4" />
          ) : (
            <FlatList
              data={results.slice(0, 10)}
              keyExtractor={(item) => item.id}
              style={{ maxHeight: 240 }}
              renderItem={({ item }) => {
                const alreadyAdded = tags.some((t) => t.id === item.id);
                return (
                  <Pressable
                    onPress={() => !alreadyAdded && addTag(item)}
                    className={`flex-row items-center justify-between rounded-lg px-3 py-2 ${alreadyAdded ? 'opacity-40' : ''}`}
                    disabled={alreadyAdded}
                  >
                    <Text className="text-gray-900 dark:text-white">
                      @{item.name}
                    </Text>
                    {alreadyAdded && (
                      <Text className="text-xs text-gray-400">Đã tag</Text>
                    )}
                  </Pressable>
                );
              }}
              ListEmptyComponent={
                searchText.trim() ? (
                  <Text className="py-4 text-center text-gray-400">
                    Không tìm thấy kết quả
                  </Text>
                ) : null
              }
            />
          )}

          <Pressable
            onPress={handleClose}
            className="mt-3 rounded-lg bg-gray-100 py-2 dark:bg-neutral-700"
          >
            <Text className="text-center text-gray-600 dark:text-gray-300">
              Đóng
            </Text>
          </Pressable>
        </View>
      </Modal>
    </View>
  );
}
