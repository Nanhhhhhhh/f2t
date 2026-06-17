import { useRouter } from 'expo-router';
import React from 'react';
import { Alert } from 'react-native';

import { handleLoginSuccess, needsVerification, useLogin } from '@/api';
import type { LoginFormProps } from '@/components/login-form';
import { LoginForm } from '@/components/login-form';
import { FocusAwareStatusBar } from '@/components/ui';
import axios from 'axios';

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
      if (axios.isAxiosError(error) && error.response?.data?.message) {
        Alert.alert('Login Failed', error.response.data.message);
      } else {
        Alert.alert('Login Failed', 'Please check your credentials and try again.');
      }
    }
  };
  return (
    <>
      <FocusAwareStatusBar />
      <LoginForm onSubmit={onSubmit} onRegister={handleRegister} />
    </>
  );
}
