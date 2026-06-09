import { zodResolver } from '@hookform/resolvers/zod';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { useForm } from 'react-hook-form';
import { Alert } from 'react-native';
import * as z from 'zod';

import { useVerifyOtp } from '@/api/auth';
import { Button, ControlledInput, Text, View } from '@/components/ui';

const schema = z.object({
  otp: z.string().length(6, 'Mã OTP phải có 6 chữ số'),
});
type FormType = z.infer<typeof schema>;

export default function VerifyOtp() {
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email: string }>();
  const { mutate, isPending } = useVerifyOtp();
  const { handleSubmit, control } = useForm<FormType>({
    resolver: zodResolver(schema),
  });

  const onSubmit = (data: FormType) => {
    mutate(
      { email: email ?? '', otp: data.otp },
      {
        onSuccess: (res) => {
          router.push({
            pathname: '/reset-password',
            params: { token: res.data.token },
          });
        },
        onError: () => {
          Alert.alert('Lỗi', 'Mã OTP không đúng hoặc đã hết hạn.');
        },
      },
    );
  };

  return (
    <View className="flex-1 justify-center p-6">
      <Text className="mb-2 text-3xl font-bold">Nhập mã OTP</Text>
      <Text className="mb-6 text-gray-500">
        Mã OTP đã được gửi đến {email}
      </Text>
      <ControlledInput
        control={control}
        name="otp"
        label="Mã OTP (6 chữ số)"
        placeholder="123456"
        keyboardType="number-pad"
        maxLength={6}
      />
      <Button
        label={isPending ? 'Đang xác minh...' : 'Xác minh'}
        onPress={handleSubmit(onSubmit)}
        disabled={isPending}
        className="mt-4"
      />
    </View>
  );
}
