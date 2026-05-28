import { NavigationContext, useIsFocused } from '@react-navigation/native';
import { useColorScheme } from 'nativewind';
import * as React from 'react';
import { Platform } from 'react-native';
import { SystemBars } from 'react-native-edge-to-edge';

type Props = { hidden?: boolean };

/**
 * FocusAwareStatusBar
 * A status bar component that only applies styles when its screen is focused.
 * Safely handles missing navigation context (e.g. during transitions or in modals).
 */
export const FocusAwareStatusBar = ({ hidden = false }: Props) => {
  const { colorScheme } = useColorScheme();
  const navigation = React.useContext(NavigationContext);

  if (Platform.OS === 'web') return null;

  // If navigation context is not available, we can't use useIsFocused.
  // In this case, we default to rendering the status bar as if it were focused,
  // or we could skip it. Rendering it is safer for visual consistency.
  if (!navigation) {
    return (
      <SystemBars
        style={colorScheme === 'light' ? 'dark' : 'light'}
        hidden={hidden}
      />
    );
  }

  return (
    <FocusAwareStatusBarInternal hidden={hidden} colorScheme={colorScheme} />
  );
};

const FocusAwareStatusBarInternal = ({
  hidden,
  colorScheme,
}: {
  hidden: boolean;
  colorScheme: 'light' | 'dark' | undefined;
}) => {
  const isFocused = useIsFocused();

  if (!isFocused) return null;

  return (
    <SystemBars
      style={colorScheme === 'light' ? 'dark' : 'light'}
      hidden={hidden}
    />
  );
};
