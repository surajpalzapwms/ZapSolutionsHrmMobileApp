import { Text, View } from 'react-native';

import CornerLogo from './CornerLogo';
import { colors } from '../theme/colors';

export default function BrandHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
      <CornerLogo size={36} variant="inline" />
      <View>
        <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>{title}</Text>
        {subtitle ? <Text style={{ fontSize: 12, color: colors.textMuted }}>{subtitle}</Text> : null}
      </View>
    </View>
  );
}
