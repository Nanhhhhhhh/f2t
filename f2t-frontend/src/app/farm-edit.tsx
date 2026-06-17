import { useRouter } from 'expo-router';
import React from 'react';

import { FarmProfileWrappedEditForm } from '@/components/farms';
import { FocusAwareStatusBar, View } from '@/components/ui';
import { useAuth } from '@/lib';

// Farm Edit được present dạng MODAL ở root Stack (app/_layout.tsx) — tách khỏi
// stack của tab Orders để: (1) bấm từ Dashboard/Profile/View Profile đều mở cùng
// một màn nhất quán, (2) đóng/vuốt xuống quay đúng chỗ cũ thay vì nhảy về Orders.
export default function FarmEditModalScreen() {
  const router = useRouter();
  const farm = useAuth.use.farm();
  const updateFarm = useAuth.use.updateFarm();

  if (!farm) {
    return null;
  }

  return (
    <View className="flex-1 bg-white dark:bg-gray-900">
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
