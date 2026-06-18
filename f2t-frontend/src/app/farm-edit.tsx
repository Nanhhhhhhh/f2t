import { useRouter } from 'expo-router';
import React from 'react';
import { ActivityIndicator } from 'react-native';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';

import { useGetFarm } from '@/api/farms';
import { FarmProfileWrappedEditForm } from '@/components/farms';
import { FocusAwareStatusBar, View } from '@/components/ui';
import { useAuth } from '@/lib';

// Farm Edit được present dạng MODAL ở root Stack (app/_layout.tsx) — tách khỏi
// stack của tab Orders để: (1) bấm từ Dashboard/Profile/View Profile đều mở cùng
// một màn nhất quán, (2) đóng/vuốt xuống quay đúng chỗ cũ thay vì nhảy về Orders.
export default function FarmEditModalScreen() {
  const router = useRouter();
  const authFarm = useAuth.use.farm();
  const updateFarm = useAuth.use.updateFarm();

  // Fetch dữ liệu farm TƯƠI theo id rồi map thẳng vào form — không dựa vào snapshot
  // auth-store (có thể cũ/thiếu field). Giống cách product edit dùng useGetProduct.
  const { data, isLoading } = useGetFarm({
    variables: { id: authFarm?.id ?? '' },
    enabled: !!authFarm?.id,
  });
  // Ưu tiên data tươi; chỉ fallback authFarm nếu fetch lỗi.
  const farm = data?.success ? data.data : authFarm;

  if (!authFarm) {
    return null;
  }

  return (
    <BottomSheetModalProvider>
      <View className="flex-1 bg-white dark:bg-gray-900">
        <FocusAwareStatusBar />
        {isLoading ? (
          // Đợi fetch xong rồi mới mount form, để defaultValues (chỉ chạy 1 lần)
          // lấy đúng data tươi thay vì snapshot auth-store cũ.
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" />
          </View>
        ) : (
          <FarmProfileWrappedEditForm
            key={farm?.id}
            farm={farm || authFarm}
            onSuccess={(updatedFarm) => {
              updateFarm(updatedFarm);
              router.back();
            }}
            onCancel={() => router.back()}
          />
        )}
      </View>
    </BottomSheetModalProvider>
  );
}
