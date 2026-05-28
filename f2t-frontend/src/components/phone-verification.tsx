import { zodResolver } from '@hookform/resolvers/zod';
import React, { useEffect, useState } from 'react';
import type { SubmitHandler } from 'react-hook-form';
import { useForm } from 'react-hook-form';
import * as z from 'zod';

import {
  updateVerificationStatus,
  useSendPhoneVerification,
  useVerifyPhone,
} from '@/api/auth';
import { Button, ControlledInput, Text, View } from '@/components/ui';

const phoneVerificationSchema = z.object({
  verificationCode: z
    .string({
      required_error: 'Verification code is required',
    })
    .length(6, 'Verification code must be 6 digits')
    .regex(/^\d{6}$/, 'Verification code must contain only numbers'),
});

export type PhoneVerificationFormType = z.infer<typeof phoneVerificationSchema>;

export type PhoneVerificationProps = {
  phoneNumber: string;
  onVerificationComplete?: (verified: boolean) => void;
  onSkip?: () => void;
  allowSkip?: boolean;
};

export const PhoneVerification = ({
  phoneNumber,
  onVerificationComplete = () => {},
  onSkip = () => {},
  allowSkip = false,
}: PhoneVerificationProps) => {
  const [countdown, setCountdown] = useState(0);
  const [canResend, setCanResend] = useState(true);
  const [verificationSent, setVerificationSent] = useState(false);

  const { handleSubmit, control, setError, clearErrors } =
    useForm<PhoneVerificationFormType>({
      resolver: zodResolver(phoneVerificationSchema),
    });

  const verifyPhoneMutation = useVerifyPhone();
  const sendVerificationMutation = useSendPhoneVerification();

  // Countdown timer for resend button
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    } else {
      setCanResend(true);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleSendVerification = async () => {
    try {
      clearErrors();
      await sendVerificationMutation.mutateAsync({ phoneNumber });
      setVerificationSent(true);
      setCountdown(60); // 60 seconds countdown
      setCanResend(false);
    } catch (error) {
      // Handle error - could show toast or error message
    }
  };

  const handleVerifyCode: SubmitHandler<PhoneVerificationFormType> = async (
    data
  ) => {
    try {
      clearErrors();
      const response = await verifyPhoneMutation.mutateAsync({
        phoneNumber,
        verificationCode: data.verificationCode,
      });

      if (response.success && response.verified) {
        // Update user verification status
        await updateVerificationStatus('phone', true);
        onVerificationComplete(true);
      } else {
        setError('verificationCode', {
          type: 'manual',
          message: response.message || 'Invalid verification code',
        });
      }
    } catch (error) {
      setError('verificationCode', {
        type: 'manual',
        message: 'Verification failed. Please try again.',
      });
    }
  };

  const formatPhoneNumber = (phone: string) => {
    // Simple phone number formatting for display
    if (phone.length === 10) {
      return `(${phone.slice(0, 3)}) ${phone.slice(3, 6)}-${phone.slice(6)}`;
    }
    return phone;
  };

  // Auto-send verification on component mount if not already sent
  useEffect(() => {
    if (!verificationSent && phoneNumber) {
      handleSendVerification();
    }
  }, [phoneNumber, verificationSent]);

  return (
    <View className="flex-1 justify-center p-6">
      <View className="mb-8 items-center">
        <Text className="mb-2 text-center text-3xl font-bold">
          Phone Verification
        </Text>
        <Text className="mb-4 text-center text-gray-600 dark:text-gray-400">
          We&apos;ve sent a 6-digit verification code to
        </Text>
        <Text className="mb-6 text-center text-lg font-semibold text-blue-600 dark:text-blue-400">
          {formatPhoneNumber(phoneNumber)}
        </Text>
        <Text className="max-w-sm text-center text-sm text-gray-500">
          Enter the code below to verify your phone number
        </Text>
      </View>

      <View className="mb-6">
        <ControlledInput
          control={control}
          name="verificationCode"
          label="Verification Code"
          placeholder="123456"
          keyboardType="number-pad"
          maxLength={6}
          autoCapitalize="none"
          autoComplete="sms-otp"
          textContentType="oneTimeCode"
          className="text-center text-2xl tracking-widest"
        />
      </View>

      <Button
        label={
          verifyPhoneMutation.isPending ? 'Verifying...' : 'Verify Phone Number'
        }
        onPress={handleSubmit(handleVerifyCode)}
        disabled={verifyPhoneMutation.isPending}
        className="mb-4"
      />

      {/* Resend verification code */}
      <View className="mb-6 items-center">
        <Text className="mb-2 text-sm text-gray-500">
          Didn&apos;t receive the code?
        </Text>
        <Button
          label={
            !canResend
              ? `Resend in ${countdown}s`
              : sendVerificationMutation.isPending
                ? 'Sending...'
                : 'Resend Code'
          }
          onPress={handleSendVerification}
          disabled={!canResend || sendVerificationMutation.isPending}
          variant="outline"
          className="mb-2"
        />
      </View>

      {/* Skip option (if allowed) */}
      {allowSkip && (
        <View className="items-center">
          <Button
            label="Skip for Now"
            onPress={onSkip}
            variant="ghost"
            className="text-gray-500"
          />
          <Text className="mt-2 max-w-xs text-center text-xs text-gray-400">
            You can verify your phone number later in settings
          </Text>
        </View>
      )}

      {/* Loading indicator */}
      {(verifyPhoneMutation.isPending ||
        sendVerificationMutation.isPending) && (
        <View className="mt-4 items-center">
          <Text className="text-sm text-gray-500">
            {verifyPhoneMutation.isPending
              ? 'Verifying code...'
              : 'Sending verification code...'}
          </Text>
        </View>
      )}
    </View>
  );
};
