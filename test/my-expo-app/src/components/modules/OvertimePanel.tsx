import { ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { overtimeSummary } from '../../data/mockData';
import { colors, radius } from '../../theme/colors';
import { Badge, Card, Divider, SampleDataBadge, SectionTitle, StatBox } from './ModuleUI';

export default function OvertimePanel() {
  return (
    <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
      <SampleDataBadge />

      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
        <StatBox label="Hours this month" value={`${overtimeSummary.monthHours}h`} valueColor={colors.primary} />
        <StatBox label="Pending approval" value={`${overtimeSummary.pendingHours}h`} valueColor={colors.warning} />
      </View>

      <SectionTitle>Log</SectionTitle>
      <Card>
        {overtimeSummary.entries.map((e, i, arr) => (
          <View key={e.id}>
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10 }}>
              <View
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: radius.md,
                  backgroundColor: colors.primarySoft,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <Ionicons name="time-outline" size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>{e.reason}</Text>
                <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>
                  {e.date} · {e.hours}h
                </Text>
              </View>
              <Badge label={e.status} tone={e.status === 'Approved' ? 'success' : 'warning'} />
            </View>
            {i < arr.length - 1 && <Divider />}
          </View>
        ))}
      </Card>
    </ScrollView>
  );
}
