import { Env } from '@env';
import { useColorScheme } from 'nativewind';
import { Linking, Share as RNShare } from 'react-native';

import { Item } from '@/components/settings/item';
import { ItemsContainer } from '@/components/settings/items-container';
import { LanguageItem } from '@/components/settings/language-item';
import { ThemeItem } from '@/components/settings/theme-item';
import {
  colors,
  FocusAwareStatusBar,
  ScrollView,
  Text,
  View,
} from '@/components/ui';
import { Github, Rate, Share, Support, Website } from '@/components/ui/icons';
import { translate, useAuth } from '@/lib';

export default function Settings() {
  const signOut = useAuth.use.signOut();
  const { colorScheme } = useColorScheme();
  const iconColor =
    colorScheme === 'dark' ? colors.neutral[400] : colors.neutral[500];
  return (
    <>
      <FocusAwareStatusBar />

      <ScrollView>
        <View className="flex-1 px-4 pt-16 ">
          <Text className="text-xl font-bold">
            {translate('settings.title')}
          </Text>
          <ItemsContainer title="settings.generale">
            <LanguageItem />
            <ThemeItem />
          </ItemsContainer>

          <ItemsContainer title="settings.about">
            <Item text="settings.app_name" value={Env.NAME} />
            <Item text="settings.version" value={Env.VERSION} />
          </ItemsContainer>

          <ItemsContainer title="settings.support_us">
            <Item
              text="settings.share"
              icon={<Share color={iconColor} />}
              onPress={() => RNShare.share({ message: 'Download F2T – Farm to Table app', url: 'https://f2t.vn' })}
            />
            <Item
              text="settings.rate"
              icon={<Rate color={iconColor} />}
              onPress={() => Linking.openURL('https://apps.apple.com/app/f2t')}
            />
            <Item
              text="settings.support"
              icon={<Support color={iconColor} />}
              onPress={() => Linking.openURL('mailto:support@f2t.vn')}
            />
          </ItemsContainer>

          <ItemsContainer title="settings.links">
            <Item text="settings.privacy" onPress={() => Linking.openURL('https://f2t.vn/privacy')} />
            <Item text="settings.terms" onPress={() => Linking.openURL('https://f2t.vn/terms')} />
            <Item
              text="settings.github"
              icon={<Github color={iconColor} />}
              onPress={() => Linking.openURL('https://github.com/f2t')}
            />
            <Item
              text="settings.website"
              icon={<Website color={iconColor} />}
              onPress={() => Linking.openURL('https://f2t.vn')}
            />
          </ItemsContainer>

          <View className="my-8">
            <ItemsContainer>
              <Item text="settings.logout" onPress={signOut} />
            </ItemsContainer>
          </View>
        </View>
      </ScrollView>
    </>
  );
}
