import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
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

import type { PaymentStatus } from '@/api/orders/types';
import { Modal } from '@/components/ui/modal';

type PaymentStatusUpdateModalProps = {
  onClose?: () => void;
  currentStatus: PaymentStatus;
  onUpdateStatus: (
    newStatus: PaymentStatus,
    transactionId?: string
  ) => Promise<void>;
  loading?: boolean;
};

const PAYMENT_STATUS_OPTIONS: {
  value: PaymentStatus;
  label: string;
  description: string;
}[] = [
  {
    value: 'pending',
    label: 'Pending',
    description: 'Payment is waiting to be processed',
  },
  {
    value: 'paid',
    label: 'Paid',
    description: 'Payment has been received and confirmed',
  },
  {
    value: 'failed',
    label: 'Failed',
    description: 'Payment attempt was unsuccessful',
  },
  {
    value: 'refunded',
    label: 'Refunded',
    description: 'Payment has been returned to customer',
  },
];

const getStatusColor = (status: PaymentStatus) => {
  switch (status) {
    case 'paid':
      return 'text-green-700 dark:text-green-300';
    case 'pending':
      return 'text-yellow-700 dark:text-yellow-300';
    case 'failed':
      return 'text-red-700 dark:text-red-300';
    case 'refunded':
      return 'text-gray-700 dark:text-gray-300';
    default:
      return 'text-gray-700 dark:text-gray-300';
  }
};

const getStatusBgColor = (status: PaymentStatus) => {
  switch (status) {
    case 'paid':
      return 'bg-green-100 dark:bg-green-900/20';
    case 'pending':
      return 'bg-yellow-100 dark:bg-yellow-900/20';
    case 'failed':
      return 'bg-red-100 dark:bg-red-900/20';
    case 'refunded':
      return 'bg-gray-100 dark:bg-gray-700';
    default:
      return 'bg-gray-100 dark:bg-gray-700';
  }
};

export const PaymentStatusUpdateModal = ({
  currentStatus,
  onUpdateStatus,
  loading = false,
  onClose,
  ref,
}: PaymentStatusUpdateModalProps & { ref?: React.Ref<BottomSheetModal> }) => {
  const [selectedStatus, setSelectedStatus] = useState<PaymentStatus | null>(
    null
  );
  const [transactionId, setTransactionId] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const handleUpdate = async () => {
    if (!selectedStatus) {
      Alert.alert('Error', 'Please select a status');
      return;
    }

    try {
      setIsUpdating(true);
      await onUpdateStatus(selectedStatus, transactionId || undefined);
      handleClose();
      Alert.alert('Success', 'Payment status updated successfully');
    } catch (error: unknown) {
      Alert.alert(
        'Error',
        error instanceof Error
          ? error.message
          : 'Failed to update payment status'
      );
    } finally {
      setIsUpdating(false);
    }
  };

  const handleClose = () => {
    setSelectedStatus(null);
    setTransactionId('');
    if (ref && 'current' in ref) {
      ref.current?.dismiss();
    }
    onClose?.();
  };

  return (
    <Modal
      ref={ref}
      snapPoints={['85%']}
      onDismiss={handleClose}
      title="Update Payment Status"
    >
      <BottomSheetScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
      >
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
              {currentStatus.toUpperCase()}
            </Text>
          </View>
        </View>

        <View className="mb-6">
          <Text className="mb-4 text-sm font-medium text-gray-700 dark:text-gray-300">
            Select New Payment Status
          </Text>

          {PAYMENT_STATUS_OPTIONS.map((option) => {
            const isSelected = selectedStatus === option.value;
            const bgColor = getStatusBgColor(option.value);
            const textColor = getStatusColor(option.value);

            return (
              <TouchableOpacity
                key={option.value}
                onPress={() => setSelectedStatus(option.value)}
                className={`mb-3 rounded-xl border-2 p-4 ${
                  isSelected
                    ? 'border-blue-600 bg-blue-50 dark:border-blue-500 dark:bg-blue-900/20'
                    : 'border-gray-100 bg-gray-50 dark:border-gray-700 dark:bg-gray-800'
                }`}
              >
                <View className="mb-1 flex-row items-center justify-between">
                  <View className="flex-row items-center">
                    <View className={`mr-3 rounded-full px-3 py-1 ${bgColor}`}>
                      <Text className={`text-xs font-bold ${textColor}`}>
                        {option.label.toUpperCase()}
                      </Text>
                    </View>
                    {isSelected && (
                      <Check size={18} className="text-blue-600" />
                    )}
                  </View>
                </View>
                <Text className="text-xs text-gray-500 dark:text-gray-400">
                  {option.description}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {selectedStatus === 'paid' && (
          <View className="mb-8">
            <Text className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              Transaction ID
            </Text>
            <TextInput
              value={transactionId}
              onChangeText={setTransactionId}
              placeholder="Enter reference or transaction ID..."
              placeholderTextColor="#9CA3AF"
              className="rounded-xl border border-gray-200 bg-white p-4 text-base text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </View>
        )}

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
            disabled={!selectedStatus || isUpdating || loading}
            className={`flex-1 flex-row items-center justify-center rounded-xl py-4 ${
              !selectedStatus || isUpdating || loading
                ? 'bg-blue-300 dark:bg-blue-900/40'
                : 'bg-blue-600'
            }`}
          >
            {isUpdating || loading ? (
              <ActivityIndicator color="white" className="mr-2" />
            ) : null}
            <Text className="text-base font-bold text-white">Save Changes</Text>
          </TouchableOpacity>
        </View>
      </BottomSheetScrollView>
    </Modal>
  );
};
