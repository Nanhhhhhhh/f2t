import { type Href, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';

import { needsVerification } from '@/api/auth';
import { Button, Text, View } from '@/components/ui';
import { useAuth } from '@/lib';

import { EmailVerification } from './email-verification';
import { PhoneVerification } from './phone-verification';

export type VerificationFlowProps = {
  onComplete?: () => void;
  allowSkip?: boolean;
  skipRoute?: string;
};

type VerificationStep = 'phone' | 'email' | 'complete';

export const VerificationFlow = ({
  onComplete,
  allowSkip = true,
  skipRoute = '/',
}: VerificationFlowProps) => {
  const router = useRouter();
  const user = useAuth.use.user();
  const [currentStep, setCurrentStep] = useState<VerificationStep>(() => {
    if (!user) return 'phone';

    const verification = needsVerification(user);
    if (verification.needsPhone) return 'phone';
    if (verification.needsEmail) return 'email';
    return 'complete';
  });

  const handlePhoneVerificationComplete = useCallback((verified: boolean) => {
    if (verified) {
      const updatedUser = useAuth.getState().user;
      if (updatedUser && !updatedUser.emailVerified) {
        setCurrentStep('email');
      } else {
        setCurrentStep('complete');
      }
    }
  }, []);

  const handleEmailVerificationComplete = useCallback((verified: boolean) => {
    if (verified) {
      setCurrentStep('complete');
    }
  }, []);

  const handleSkipVerification = useCallback(() => {
    if (onComplete) {
      onComplete();
    } else {
      router.replace(skipRoute as Href);
    }
  }, [onComplete, router, skipRoute]);

  const handleContinue = useCallback(() => {
    if (onComplete) {
      onComplete();
    } else {
      router.push('/');
    }
  }, [onComplete, router]);

  if (!user) {
    return (
      <View className="flex-1 items-center justify-center p-6">
        <Text className="text-lg text-gray-500">Please log in to continue</Text>
      </View>
    );
  }

  if (currentStep === 'complete') {
    return (
      <View className="flex-1 items-center justify-center p-6">
        <View className="mb-8 items-center">
          <Text className="mb-4 text-4xl">🎉</Text>
          <Text className="mb-4 text-center text-3xl font-bold">
            Verification Complete!
          </Text>
          <Text className="mb-6 max-w-sm text-center text-gray-600 dark:text-gray-400">
            Your account has been successfully verified. You&apos;re all set to
            start using the marketplace!
          </Text>
        </View>

        <Button
          label="Continue to App"
          onPress={handleContinue}
          className="w-full"
        />
      </View>
    );
  }

  if (currentStep === 'phone') {
    return (
      <PhoneVerification
        phoneNumber={user.phoneNumber}
        onVerificationComplete={handlePhoneVerificationComplete}
        onSkip={() => {
          const updatedUser = useAuth.getState().user;
          if (updatedUser && !updatedUser.emailVerified) {
            setCurrentStep('email');
          } else {
            handleSkipVerification();
          }
        }}
        allowSkip={allowSkip}
      />
    );
  }

  if (currentStep === 'email') {
    return (
      <EmailVerification
        email={user.email}
        onVerificationComplete={handleEmailVerificationComplete}
        onSkip={handleSkipVerification}
        allowSkip={allowSkip}
      />
    );
  }

  return null;
};
