import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import React from 'react';
import { useForm } from 'react-hook-form';
import { Alert } from 'react-native';
import * as z from 'zod';

import { useForgotPassword } from '@/api/auth';
import { Button, ControlledInput, Text, View } from '@/components/ui';

const schema = z.object({
  email: z.string().email('Email không hợp lệ'),
});
type FormType = z.infer<typeof schema>;

export default function ForgotPassword() {
  const router = useRouter();
  const { mutate, isPending } = useForgotPassword();
  const { handleSubmit, control } = useForm<FormType>({
    resolver: zodResolver(schema),
  });

  const onSubmit = (data: FormType) => {
    mutate(data, {
      onSuccess: () => {
        router.push({ pathname: '/verify-otp', params: { email: data.email } });
      },
      onError: () => {
        Alert.alert('Lỗi', 'Không thể gửi OTP. Vui lòng thử lại.');
      },
    });
  };

  return (
    <View className="flex-1 justify-center p-6">
      <Text className="mb-2 text-3xl font-bold">Quên mật khẩu</Text>
      <Text className="mb-6 text-gray-500">
        Nhập email của bạn để nhận mã OTP.
      </Text>
      <ControlledInput
        control={control}
        name="email"
        label="Email"
        placeholder="email@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <Button
        label={isPending ? 'Đang gửi...' : 'Gửi mã OTP'}
        onPress={handleSubmit(onSubmit)}
        disabled={isPending}
        className="mt-4"
      />
      <Button
        label="Quay lại đăng nhập"
        variant="ghost"
        onPress={() => router.back()}
        className="mt-2"
      />
    </View>
  );
}
