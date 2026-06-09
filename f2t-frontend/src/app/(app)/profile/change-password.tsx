import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import React from 'react';
import { useForm } from 'react-hook-form';
import { Alert } from 'react-native';
import * as z from 'zod';

import { useChangePassword } from '@/api/auth';
import { Button, ControlledInput, FocusAwareStatusBar, Text, View } from '@/components/ui';

const schema = z
  .object({
    currentPassword: z.string().min(1, 'Vui lòng nhập mật khẩu hiện tại'),
    newPassword: z.string().min(6, 'Mật khẩu tối thiểu 6 ký tự'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Mật khẩu xác nhận không khớp',
    path: ['confirmPassword'],
  });
type FormType = z.infer<typeof schema>;

export default function ChangePassword() {
  const router = useRouter();
  const { mutate, isPending } = useChangePassword();
  const { handleSubmit, control, reset } = useForm<FormType>({
    resolver: zodResolver(schema),
  });

  const onSubmit = (data: FormType) => {
    mutate(
      { currentPassword: data.currentPassword, newPassword: data.newPassword },
      {
        onSuccess: () => {
          reset();
          Alert.alert('Thành công', 'Mật khẩu đã được thay đổi.', [
            { text: 'OK', onPress: () => router.back() },
          ]);
        },
        onError: () => {
          Alert.alert('Lỗi', 'Mật khẩu hiện tại không đúng hoặc có lỗi xảy ra.');
        },
      },
    );
  };

  return (
    <View className="flex-1 bg-white dark:bg-gray-900">
      <FocusAwareStatusBar />
      <View className="flex-1 px-4 py-6">
        <Text className="mb-6 text-2xl font-bold text-gray-900 dark:text-white">
          Đổi mật khẩu
        </Text>
        <View className="space-y-4">
          <ControlledInput
            control={control}
            name="currentPassword"
            label="Mật khẩu hiện tại"
            secureTextEntry
          />
          <ControlledInput
            control={control}
            name="newPassword"
            label="Mật khẩu mới"
            secureTextEntry
          />
          <ControlledInput
            control={control}
            name="confirmPassword"
            label="Xác nhận mật khẩu mới"
            secureTextEntry
          />
        </View>
        <Button
          label={isPending ? 'Đang lưu...' : 'Lưu thay đổi'}
          onPress={handleSubmit(onSubmit)}
          disabled={isPending}
          className="mt-6"
        />
      </View>
    </View>
  );
}
