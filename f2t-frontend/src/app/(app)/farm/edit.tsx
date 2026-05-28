import { Stack, useRouter } from 'expo-router';
import React from 'react';

import { FarmProfileWrappedEditForm } from '@/components/farms';
import { FocusAwareStatusBar, View } from '@/components/ui';
import { useAuth } from '@/lib';

export default function EditFarmScreen() {
  const router = useRouter();
  const farm = useAuth.use.farm();
  const updateFarm = useAuth.use.updateFarm();

  if (!farm) {
    return null;
  }

  return (
    <View className="flex-1 bg-white dark:bg-gray-900">
      <Stack.Screen options={{ title: 'Farm Edit', headerShown: true }} />
      <FocusAwareStatusBar />
      <FarmProfileWrappedEditForm
        farm={farm}
        onSuccess={(updatedFarm) => {
          updateFarm(updatedFarm);
          router.back();
        }}
        onCancel={() => router.back()}
      />
    </View>
  );
}
