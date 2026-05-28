import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { Check } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import type { OrderStatus } from '@/api/orders/types';
import { Modal } from '@/components/ui/modal';

import {
  getStatusBgColor,
  getStatusColor,
  getStatusLabel,
} from './order-status-badge';

type OrderStatusUpdateModalProps = {
  onClose?: () => void;
  currentStatus: OrderStatus;
  onUpdateStatus: (newStatus: OrderStatus, notes?: string) => Promise<void>;
  loading?: boolean;
};

// Define valid status transitions for farms
const STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['preparing', 'cancelled'],
  preparing: ['ready_for_pickup', 'shipped', 'cancelled'],
  ready_for_pickup: ['delivered', 'cancelled'],
  shipped: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
};

export const OrderStatusUpdateModal = ({
  currentStatus,
  onUpdateStatus,
  loading = false,
  onClose,
  ref,
}: OrderStatusUpdateModalProps & { ref?: React.Ref<BottomSheetModal> }) => {
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus | null>(
    null
  );
  const [notes, setNotes] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const availableStatuses = STATUS_TRANSITIONS[currentStatus] || [];

  const handleUpdate = async () => {
    if (!selectedStatus) {
      Alert.alert('Error', 'Please select a status');
      return;
    }

    if (selectedStatus === 'cancelled') {
      Alert.alert(
        'Confirm Action',
        'Are you sure you want to cancel this order?',
        [
          { text: 'No', style: 'cancel' },
          {
            text: 'Yes',
            style: 'destructive',
            onPress: async () => {
              await performUpdate();
            },
          },
        ]
      );
    } else {
      await performUpdate();
    }
  };

  const performUpdate = async () => {
    if (!selectedStatus) return;

    try {
      setIsUpdating(true);
      await onUpdateStatus(selectedStatus, notes || undefined);
      handleClose();
    } catch (error: unknown) {
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Failed to update order status'
      );
    } finally {
      setIsUpdating(false);
    }
  };

  const handleClose = () => {
    setSelectedStatus(null);
    setNotes('');
    if (ref && 'current' in ref) {
      ref.current?.dismiss();
    }
    onClose?.();
  };

  return (
    <Modal
      ref={ref}
      snapPoints={['60%']}
      onDismiss={handleClose}
      title="Update Order Status"
    >
      <View className="px-5 pb-10">
        <View className="mb-6 flex-row items-center justify-between border-b border-gray-100 pb-4 dark:border-gray-700">
          <Text className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Current Status
          </Text>
          <View
            className={`rounded-full px-3 py-1 ${getStatusBgColor(currentStatus)}`}
          >
            <Text
              className={`text-xs font-bold ${getStatusColor(currentStatus)}`}
            >
              {getStatusLabel(currentStatus).toUpperCase()}
            </Text>
          </View>
        </View>

        {availableStatuses.length > 0 ? (
          <View className="mb-6">
            <Text className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">
              Select New Status
            </Text>
            <View className="flex-row flex-wrap gap-3">
              {availableStatuses.map((status) => {
                const isSelected = selectedStatus === status;

                return (
                  <TouchableOpacity
                    key={status}
                    onPress={() => setSelectedStatus(status)}
                    className={`min-w-[45%] flex-1 rounded-xl border-2 p-4 ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50 dark:border-blue-500 dark:bg-blue-900/20'
                        : 'border-gray-100 bg-gray-50 dark:border-gray-700 dark:bg-gray-800'
                    }`}
                  >
                    <View className="flex-row items-center justify-between">
                      <Text
                        className={`text-sm font-bold ${isSelected ? 'text-blue-700 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}`}
                      >
                        {getStatusLabel(status)}
                      </Text>
                      {isSelected && (
                        <Check size={18} className="text-blue-600" />
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ) : (
          <View className="mb-6 rounded-xl border border-gray-100 bg-gray-50 p-6 dark:border-gray-700 dark:bg-gray-800">
            <Text className="text-center text-sm text-gray-400">
              No further transitions available for this order.
            </Text>
          </View>
        )}

        <View className="mb-8">
          <Text className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            Notes
          </Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder={
              selectedStatus === 'cancelled'
                ? 'Reason for cancellation (required)...'
                : 'Add notes for this update (optional)...'
            }
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={3}
            className="min-h-[80px] rounded-xl border border-gray-200 bg-white p-4 text-base text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            style={{ textAlignVertical: 'top' }}
          />
        </View>

        <View className="flex-row gap-x-3">
          <TouchableOpacity
            onPress={handleClose}
            disabled={isUpdating}
            className="flex-1 items-center justify-center rounded-xl bg-gray-100 py-4 dark:bg-gray-700"
          >
            <Text className="text-base font-bold text-gray-700 dark:text-gray-300">
              Cancel
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleUpdate}
            disabled={
              !selectedStatus ||
              isUpdating ||
              (selectedStatus === 'cancelled' && !notes)
            }
            className={`flex-1 flex-row items-center justify-center rounded-xl py-4 ${
              !selectedStatus ||
              isUpdating ||
              (selectedStatus === 'cancelled' && !notes)
                ? 'bg-blue-300 dark:bg-blue-900/40'
                : 'bg-blue-600'
            }`}
          >
            {isUpdating ? (
              <ActivityIndicator color="white" className="mr-2" />
            ) : null}
            <Text className="text-base font-bold text-white">Update</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};
