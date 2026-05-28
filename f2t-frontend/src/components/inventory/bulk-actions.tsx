import React, { useState } from 'react';
import { Alert } from 'react-native';

import { Button, Text, View } from '@/components/ui';
import { Select } from '@/components/ui/select';
import type { Product } from '@/types';

type BulkActionsProps = {
  selectedCount: number;
  selectedProductIds: string[];
  onUpdateStatus: (productIds: string[], status: Product['status']) => void;
  onDelete: (productIds: string[]) => void;
};

const statusOptions = [
  { label: 'Set as Available', value: 'available' },
  { label: 'Set as Sold Out', value: 'sold_out' },
  { label: 'Set as Unavailable', value: 'unavailable' },
];

export const BulkActions = ({
  selectedCount,
  selectedProductIds,
  onUpdateStatus,
  onDelete,
}: BulkActionsProps) => {
  const [selectedAction, setSelectedAction] = useState<string>('');

  const handleStatusUpdate = () => {
    if (!selectedAction) {
      Alert.alert('No Action Selected', 'Please select a status to apply');
      return;
    }

    const statusLabel = statusOptions.find(
      (option) => option.value === selectedAction
    )?.label;

    Alert.alert(
      'Confirm Bulk Update',
      `Are you sure you want to ${statusLabel?.toLowerCase()} for ${selectedCount} product${selectedCount !== 1 ? 's' : ''}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Update',
          onPress: () => {
            onUpdateStatus(
              selectedProductIds,
              selectedAction as Product['status']
            );
            setSelectedAction('');
          },
        },
      ]
    );
  };

  const handleBulkDelete = () => {
    Alert.alert(
      'Confirm Deletion',
      `Are you sure you want to delete ${selectedCount} product${selectedCount !== 1 ? 's' : ''}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => onDelete(selectedProductIds),
        },
      ]
    );
  };

  return (
    <View className="border-t border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <Text className="mb-3 font-medium text-gray-900 dark:text-white">
        Bulk Actions ({selectedCount} selected)
      </Text>

      <View className="flex-row space-x-3">
        {/* Status update */}
        <View className="flex-1">
          <Select
            options={statusOptions}
            value={selectedAction}
            onSelect={(value) => setSelectedAction(value as string)}
            placeholder="Select action..."
          />
        </View>

        <Button
          label="Apply"
          onPress={handleStatusUpdate}
          variant="default"
          disabled={!selectedAction}
        />

        <Button
          label="Delete"
          onPress={handleBulkDelete}
          variant="outline"
          className="border-red-300 text-red-600 dark:border-red-700 dark:text-red-400"
        />
      </View>

      {/* Quick actions */}
      <View className="mt-3 flex-row flex-wrap gap-2">
        <Button
          label="Mark Available"
          onPress={() => {
            setSelectedAction('available');
            setTimeout(handleStatusUpdate, 100);
          }}
          variant="ghost"
          className="rounded-full bg-green-50 px-3 py-1 text-green-700 dark:bg-green-900/20 dark:text-green-300"
        />

        <Button
          label="Mark Unavailable"
          onPress={() => {
            setSelectedAction('unavailable');
            setTimeout(handleStatusUpdate, 100);
          }}
          variant="ghost"
          className="rounded-full bg-gray-50 px-3 py-1 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
        />
      </View>
    </View>
  );
};
