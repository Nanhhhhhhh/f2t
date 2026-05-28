import { useRouter } from 'expo-router';
import React from 'react';

import { handleLoginSuccess, needsVerification, useLogin } from '@/api';
import type { LoginFormProps } from '@/components/login-form';
import { LoginForm } from '@/components/login-form';
import { FocusAwareStatusBar } from '@/components/ui';

export default function Login() {
  const router = useRouter();
  const loginMutation = useLogin();

  const handleRegister = () => {
    router.push('/register');
  };

  const onSubmit: LoginFormProps['onSubmit'] = async (data) => {
    try {
      const response = await loginMutation.mutateAsync({
        email: data.email,
        password: data.password,
      });

      const user = await handleLoginSuccess(response, {
        email: data.email,
        password: data.password,
      });

      // Check if user needs verification
      const verification = needsVerification(user);
      if (verification.needsAny) {
        router.replace('/verification');
      } else if (user?.role === 'admin') {
        router.replace('/admin');
      } else if (user?.role === 'farm') {
        router.replace('/dashboard');
      } else {
        router.replace('/');
      }
    } catch (error) {
      // Handle error - you might want to show a toast or error message
    }
  };
  return (
    <>
      <FocusAwareStatusBar />
      <LoginForm onSubmit={onSubmit} onRegister={handleRegister} />
    </>
  );
}
