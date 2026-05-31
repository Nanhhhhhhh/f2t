import * as Notifications from 'expo-notifications';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { client } from '@/api/common/client';
import { useAuth } from '@/lib';

async function registerPushToken(): Promise<void> {
  if (Platform.OS === 'web') return;

  // getExpoPushTokenAsync requires a development build — not available in Expo Go
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return;

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    await client.put('/users/push-token', { pushToken: tokenData.data });
  } catch {
    // Non-fatal — push delivery is best-effort
  }
}

export function usePushToken() {
  const user = useAuth.use.user();

  useEffect(() => {
    if (user?.id) {
      void registerPushToken();
    }
  }, [user?.id]);
}
