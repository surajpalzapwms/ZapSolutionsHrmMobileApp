import { Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';

import { otherTools } from '../../data/mockData';
import { colors, radius, shadow } from '../../theme/colors';
import { SampleDataBadge } from './ModuleUI';

export default function OtherPanel() {
  return (
    <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
      <SampleDataBadge text="More tools" />

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        {otherTools.map((tool) => (
          <TouchableOpacity
            key={tool.key}
            activeOpacity={0.85}
            onPress={() => Alert.alert(tool.label, `${tool.description} This will be available once connected.`)}
            style={{
              width: '47%',
              backgroundColor: colors.card,
              borderRadius: radius.lg,
              borderWidth: 1,
              borderColor: colors.border,
              padding: 14,
              ...shadow.soft,
            }}>
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: radius.md,
                backgroundColor: colors.primarySoft,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 10,
              }}>
              <Text style={{ fontSize: 18 }}>{tool.emoji}</Text>
            </View>
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>{tool.label}</Text>
            <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 3, lineHeight: 15 }}>
              {tool.description}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}
