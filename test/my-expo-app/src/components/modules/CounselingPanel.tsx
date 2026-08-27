import { Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { counselingSessions } from '../../data/mockData';
import { colors, radius } from '../../theme/colors';
import { Badge, Card, Divider, SampleDataBadge, SectionTitle } from './ModuleUI';

export default function CounselingPanel() {
  return (
    <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
      <SampleDataBadge />

      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => Alert.alert('Schedule session', 'Booking will be enabled once the counseling endpoint is connected.')}
        style={{
          backgroundColor: colors.primary,
          borderRadius: radius.lg,
          paddingVertical: 14,
          alignItems: 'center',
          marginBottom: 20,
          flexDirection: 'row',
          justifyContent: 'center',
          gap: 8,
        }}>
        <Ionicons name="add-circle-outline" size={18} color="#fff" />
        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Schedule a session</Text>
      </TouchableOpacity>

      <SectionTitle>Upcoming</SectionTitle>
      {counselingSessions.upcoming.length === 0 ? (
        <Card style={{ marginBottom: 20 }}>
          <Text style={{ fontSize: 13, color: colors.textMuted }}>No upcoming sessions.</Text>
        </Card>
      ) : (
        <View style={{ gap: 10, marginBottom: 20 }}>
          {counselingSessions.upcoming.map((s) => (
            <Card key={s.id}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ flex: 1, marginRight: 10 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>{s.topic}</Text>
                  <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>{s.counselor}</Text>
                </View>
                <Badge label={s.mode} tone="primary" />
              </View>
              <Divider />
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 10 }}>
                <Ionicons name="calendar-outline" size={14} color={colors.textMuted} />
                <Text style={{ fontSize: 12, color: colors.textMuted }}>
                  {s.date} · {s.time}
                </Text>
              </View>
            </Card>
          ))}
        </View>
      )}

      <SectionTitle>Past sessions</SectionTitle>
      <View style={{ gap: 10 }}>
        {counselingSessions.past.map((s) => (
          <Card key={s.id}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>{s.topic}</Text>
                <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>{s.counselor}</Text>
                <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 6 }}>
                  {s.date} · {s.time} · {s.mode}
                </Text>
              </View>
              <Badge label={s.outcome ?? 'Completed'} tone="success" />
            </View>
          </Card>
        ))}
      </View>
    </ScrollView>
  );
}
