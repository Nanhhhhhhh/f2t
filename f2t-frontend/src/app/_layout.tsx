import '../../global.css';
// Import DevUtils to initialize development tools
import '@/lib/dev-utils';

import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import type { ErrorBoundaryProps } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React from 'react';
import { LogBox, StyleSheet, View } from 'react-native';
import FlashMessage from 'react-native-flash-message';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { APIProvider } from '@/api';
import { hydrateAuth, loadSelectedTheme } from '@/lib';
import { useThemeConfig } from '@/lib/use-theme-config';

// Không hiện BẤT KỲ thông báo lỗi nào trên app — tất cả chỉ in ra console (Metro).
// (1) LogBox.ignoreAllLogs: ẩn hộp vàng/đỏ từ console.warn/console.error.
// (2) setGlobalHandler: ẩn cả overlay "Uncaught Error" (lỗi ném không bắt) bằng cách
//     thay handler mặc định bằng handler chỉ console.error, không gọi handler cũ.
LogBox.ignoreAllLogs(true);
if (__DEV__) {
  const g = global as unknown as {
    ErrorUtils?: {
      setGlobalHandler: (h: (e: unknown, isFatal?: boolean) => void) => void;
    };
  };
  g.ErrorUtils?.setGlobalHandler((error, isFatal) => {
    console.error('[App error]', isFatal ? '(fatal)' : '', error);
  });
}

// ErrorBoundary tuỳ biến THAY cho cái mặc định của expo-router (vốn vẽ màn lỗi đỏ
// toàn trang). Bắt lỗi render của route → chỉ in console (Metro), render rỗng để
// không hiện trang lỗi; người dùng vẫn điều hướng qua tab/back được.
export function ErrorBoundary({ error }: ErrorBoundaryProps) {
  console.error('[Render error]', error);
  return null;
}

export const unstable_settings = {
  initialRouteName: '(app)',
};

hydrateAuth();
loadSelectedTheme();
// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();
// Set the animation options. This is optional.
SplashScreen.setOptions({
  duration: 500,
  fade: true,
});

export default function RootLayout() {
  // Áp dụng lại mỗi lần render để Fast Refresh cũng tắt LogBox (không chỉ khi full reload).
  LogBox.ignoreAllLogs(true);
  return (
    <Providers>
      <View style={styles.container}>
        <Stack>
          <Stack.Screen name="(app)" options={{ headerShown: false }} />
          <Stack.Screen name="admin" options={{ headerShown: false }} />
          <Stack.Screen name="onboarding" options={{ headerShown: false }} />
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="register" options={{ headerShown: false }} />
          <Stack.Screen name="verification" options={{ headerShown: false }} />
          <Stack.Screen name="farms" options={{ headerShown: false }} />
          <Stack.Screen
            name="farm-edit"
            options={{
              presentation: 'modal',
              headerShown: true,
              title: 'Chỉnh sửa trang trại',
            }}
          />
        </Stack>
      </View>
    </Providers>
  );
}

function Providers({ children }: { children: React.ReactNode }) {
  const theme = useThemeConfig();
  return (
    <GestureHandlerRootView style={styles.container}>
      <KeyboardProvider>
        <ThemeProvider value={theme}>
          <APIProvider>
            <BottomSheetModalProvider>
              {children}
              <FlashMessage position="top" />
            </BottomSheetModalProvider>
          </APIProvider>
        </ThemeProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
