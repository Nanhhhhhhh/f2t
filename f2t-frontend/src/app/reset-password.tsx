import { zodResolver } from '@hookform/resolvers/zod';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { useForm } from 'react-hook-form';
import { Alert } from 'react-native';
import * as z from 'zod';

import { useResetPassword } from '@/api/auth';
import { Button, ControlledInput, Text, View } from '@/components/ui';

const schema = z
  .object({
    newPassword: z.string().min(6, 'Mật khẩu tối thiểu 6 ký tự'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Mật khẩu xác nhận không khớp',
    path: ['confirmPassword'],
  });
type FormType = z.infer<typeof schema>;

export default function ResetPassword() {
  const router = useRouter();
  const { token } = useLocalSearchParams<{ token: string }>();
  const { mutate, isPending } = useResetPassword();
  const { handleSubmit, control } = useForm<FormType>({
    resolver: zodResolver(schema),
  });

  const onSubmit = (data: FormType) => {
    mutate(
      { token: token ?? '', newPassword: data.newPassword },
      {
        onSuccess: () => {
          Alert.alert('Thành công', 'Mật khẩu đã được đặt lại.', [
            { text: 'Đăng nhập', onPress: () => router.replace('/login') },
          ]);
        },
        onError: () => {
          Alert.alert('Lỗi', 'Không thể đặt lại mật khẩu. Vui lòng thử lại.');
        },
      },
    );
  };

  return (
    <View className="flex-1 justify-center p-6">
      <Text className="mb-6 text-3xl font-bold">Đặt mật khẩu mới</Text>
      <ControlledInput
        control={control}
        name="newPassword"
        label="Mật khẩu mới"
        placeholder="Tối thiểu 6 ký tự"
        secureTextEntry
      />
      <ControlledInput
        control={control}
        name="confirmPassword"
        label="Xác nhận mật khẩu"
        placeholder="Nhập lại mật khẩu mới"
        secureTextEntry
        className="mt-4"
      />
      <Button
        label={isPending ? 'Đang lưu...' : 'Đặt lại mật khẩu'}
        onPress={handleSubmit(onSubmit)}
        disabled={isPending}
        className="mt-4"
      />
    </View>
  );
}
