import { ArrowUpDown, X } from 'lucide-react-native';
import React, { useCallback, useState } from 'react';
import { Modal, Pressable, ScrollView } from 'react-native';

import { Button, Text, View } from '@/components/ui';

export type SortOption = {
  label: string;
  value: string;
  order: 'asc' | 'desc';
  description?: string;
};

export type SortSelection = {
  sortBy: string;
  sortOrder: 'asc' | 'desc';
};

type SortOptionsModalProps = {
  visible: boolean;
  onClose: () => void;
  onApply: (selection: SortSelection) => void;
  options: SortOption[];
  initialSelection?: SortSelection;
  title?: string;
};

export function SortOptionsModal({
  visible,
  onClose,
  onApply,
  options,
  initialSelection,
  title = 'Sort By',
}: SortOptionsModalProps) {
  const [selection, setSelection] = useState<SortSelection>(
    initialSelection || {
      sortBy: options[0]?.value || '',
      sortOrder: options[0]?.order || 'asc',
    }
  );

  // Select sort option
  const handleSelect = useCallback((option: SortOption) => {
    setSelection({
      sortBy: option.value,
      sortOrder: option.order,
    });
  }, []);

  // Apply selection
  const handleApply = useCallback(() => {
    onApply(selection);
    onClose();
  }, [selection, onApply, onClose]);

  // Reset to default
  const handleReset = useCallback(() => {
    if (options.length > 0) {
      setSelection({
        sortBy: options[0].value,
        sortOrder: options[0].order,
      });
    }
  }, [options]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/50">
        <Pressable className="flex-1" onPress={onClose} />

        <View className="max-h-[70%] rounded-t-3xl bg-white dark:bg-gray-900">
          {/* Header */}
          <View className="flex-row items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
            <View className="flex-row items-center gap-2">
              <ArrowUpDown size={24} className="text-primary" />
              <Text className="text-xl font-bold text-gray-900 dark:text-white">
                {title}
              </Text>
            </View>

            <Pressable onPress={onClose} className="p-2">
              <X size={24} className="text-gray-600 dark:text-gray-400" />
            </Pressable>
          </View>

          {/* Content */}
          <ScrollView
            className="flex-1 px-6 py-4"
            showsVerticalScrollIndicator={false}
          >
            <Text className="mb-4 text-sm text-gray-600 dark:text-gray-400">
              Choose how you want to sort the results
            </Text>

            <View className="gap-3">
              {options.map((option) => {
                const isSelected =
                  selection.sortBy === option.value &&
                  selection.sortOrder === option.order;

                return (
                  <Pressable
                    key={`${option.value}-${option.order}`}
                    onPress={() => handleSelect(option)}
                    className={`rounded-lg border p-4 ${
                      isSelected
                        ? 'border-primary bg-primary/10'
                        : 'border-gray-300 dark:border-gray-600'
                    }`}
                  >
                    <View className="flex-row items-center justify-between">
                      <View className="flex-1">
                        <Text
                          className={`font-medium ${
                            isSelected
                              ? 'text-primary'
                              : 'text-gray-900 dark:text-white'
                          }`}
                        >
                          {option.label}
                        </Text>
                        {option.description && (
                          <Text className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                            {option.description}
                          </Text>
                        )}
                      </View>
                      {isSelected && (
                        <View className="bg-primary ml-3 size-6 items-center justify-center rounded-full">
                          <Text className="text-xs font-bold text-white">
                            ✓
                          </Text>
                        </View>
                      )}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>

          {/* Footer Actions */}
          <View className="flex-row gap-3 border-t border-gray-200 px-6 py-4 dark:border-gray-700">
            <Button
              label="Reset"
              onPress={handleReset}
              variant="outline"
              className="flex-1"
            />
            <Button label="Apply" onPress={handleApply} className="flex-1" />
          </View>
        </View>
      </View>
    </Modal>
  );
}
