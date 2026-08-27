import { ScrollView, Text, View } from 'react-native';

import { colors, radius } from '../theme/colors';

export default function NotConnectedPanel({
  emoji,
  title,
  description,
}: {
  emoji: string;
  title: string;
  description: string;
}) {
  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 24, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          width: 64,
          height: 64,
          borderRadius: radius.lg,
          backgroundColor: colors.primarySoft,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 16,
        }}>
        <Text style={{ fontSize: 26 }}>{emoji}</Text>
      </View>
      <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 6, textAlign: 'center' }}>
        {title}
      </Text>
      <Text style={{ fontSize: 13, color: colors.textMuted, textAlign: 'center', lineHeight: 19 }}>
        {description}
      </Text>
      <View
        style={{
          marginTop: 18,
          backgroundColor: colors.primarySoft,
          borderRadius: radius.md,
          paddingHorizontal: 14,
          paddingVertical: 10,
        }}>
        <Text style={{ fontSize: 11, color: colors.primary, fontWeight: '600', textAlign: 'center' }}>
          Not wired to a backend endpoint yet — this screen is ready to show real data as soon as one exists.
        </Text>
      </View>
    </ScrollView>
  );
}
