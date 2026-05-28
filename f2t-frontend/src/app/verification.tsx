import { useRouter } from 'expo-router';
import React from 'react';

import { FocusAwareStatusBar } from '@/components/ui';
import { VerificationFlow } from '@/components/verification-flow';

export default function VerificationScreen() {
  const router = useRouter();

  const handleVerificationComplete = () => {
    // Navigate to the main app after verification
    router.replace('/');
  };

  return (
    <>
      <FocusAwareStatusBar />
      <VerificationFlow
        onComplete={handleVerificationComplete}
        allowSkip={true}
      />
    </>
  );
}
