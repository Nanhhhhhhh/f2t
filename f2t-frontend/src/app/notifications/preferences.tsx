import { useRouter } from 'expo-router';
import React from 'react';

import { NotificationPreferencesComponent } from '@/components/notifications';
import { useAuth } from '@/lib/auth';

export default function NotificationPreferencesScreen() {
  const router = useRouter();
  const getUser = useAuth.use.user;
  const user = getUser();

  const handleSave = () => {
    // Navigate back after saving
    router.back();
  };

  if (!user) {
    return null;
  }

  return (
    <NotificationPreferencesComponent userId={user.id} onSave={handleSave} />
  );
}
