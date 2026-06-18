import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { Clock } from 'lucide-react-native';
import React from 'react';
import { Pressable } from 'react-native';

import { Modal, Text, useModal, View } from '@/components/ui';

export type TimeOption = { label: string; value: string };

type TimeFieldProps = {
  value?: string;
  options: TimeOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  /** Nhãn nhỏ phía trên trigger (vd "Mở cửa" / "Đóng cửa"). */
  caption?: string;
};

const labelFor = (options: TimeOption[], value?: string) =>
  options.find((o) => o.value === value)?.label;

// Bottom-sheet chọn giờ dạng lưới chip — gọn, nhóm Sáng/Chiều, thay cho Select
// liệt kê 33 dòng dài lê thê.
export const TimeField = ({
  value,
  options,
  onChange,
  placeholder = 'Chọn giờ',
  caption,
}: TimeFieldProps) => {
  const modal = useModal();
  const current = labelFor(options, value);
  const am = options.filter((o) => o.value < '12:00');
  const pm = options.filter((o) => o.value >= '12:00');

  const pick = (v: string) => {
    onChange(v);
    modal.dismiss();
  };

  const Grid = ({ list }: { list: TimeOption[] }) => (
    <View className="flex-row flex-wrap" style={{ gap: 8 }}>
      {list.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => pick(o.value)}
            className={`rounded-xl px-3.5 py-2 ${
              selected
                ? 'bg-primary-600'
                : 'border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800'
            }`}
          >
            <Text
              className={`text-sm font-semibold ${
                selected ? 'text-white' : 'text-gray-700 dark:text-gray-200'
              }`}
            >
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );

  return (
    <>
      <Pressable
        onPress={modal.present}
        className="flex-row items-center justify-between rounded-xl border border-gray-200 bg-white px-3 py-2.5 dark:border-gray-700 dark:bg-gray-900"
      >
        <View className="flex-row items-center gap-2">
          <Clock size={16} color="#16A34A" />
          <Text
            className={
              current
                ? 'text-base font-medium text-gray-900 dark:text-white'
                : 'text-base text-gray-400'
            }
          >
            {current ?? placeholder}
          </Text>
        </View>
      </Pressable>

      <Modal ref={modal.ref} snapPoints={['55%', '85%']} title={caption ?? 'Chọn giờ'}>
        <BottomSheetScrollView
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
        >
          <Text className="mb-2.5 text-xs font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500">
            ☀️ Buổi sáng
          </Text>
          <Grid list={am} />

          <Text className="mb-2.5 mt-6 text-xs font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500">
            🌙 Buổi chiều / tối
          </Text>
          <Grid list={pm} />
        </BottomSheetScrollView>
      </Modal>
    </>
  );
};
