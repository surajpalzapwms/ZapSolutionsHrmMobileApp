import { useState } from 'react';
import { Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { resignationInfo } from '../../data/mockData';
import { colors, radius } from '../../theme/colors';
import { Card, SampleDataBadge, SectionTitle } from './ModuleUI';

export default function ResignPanel() {
  const [submitted, setSubmitted] = useState(resignationInfo.status !== 'none');

  return (
    <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
      <SampleDataBadge />

      <Card style={{ marginBottom: 20, alignItems: 'center' }}>
        <View
          style={{
            width: 52,
            height: 52,
            borderRadius: radius.lg,
            backgroundColor: colors.primarySoft,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 10,
          }}>
          <Ionicons name="calendar-number-outline" size={24} color={colors.primary} />
        </View>
        <Text style={{ fontSize: 13, color: colors.textMuted, textAlign: 'center' }}>Standard notice period</Text>
        <Text style={{ fontSize: 20, fontWeight: '800', color: colors.text, marginTop: 2 }}>
          {resignationInfo.noticePeriodDays} days
        </Text>
      </Card>

      <SectionTitle>How it works</SectionTitle>
      <Card style={{ marginBottom: 20 }}>
        {resignationInfo.steps.map((s, i) => (
          <View key={s.title} style={{ flexDirection: 'row', paddingVertical: 8 }}>
            <View
              style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                backgroundColor: colors.primarySoft,
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 12,
              }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: colors.primary }}>{i + 1}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>{s.title}</Text>
              <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2, lineHeight: 17 }}>
                {s.description}
              </Text>
            </View>
          </View>
        ))}
      </Card>

      {submitted ? (
        <Card style={{ alignItems: 'center' }}>
          <Ionicons name="checkmark-circle" size={28} color={colors.success} />
          <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text, marginTop: 8 }}>
            Resignation request submitted
          </Text>
          <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2, textAlign: 'center' }}>
            HR will reach out to confirm your last working day.
          </Text>
        </Card>
      ) : (
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => {
            Alert.alert(
              'Initiate resignation',
              'This will start the resignation process. This flow will submit to the backend once the endpoint is connected.',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Confirm', style: 'destructive', onPress: () => setSubmitted(true) },
              ],
            );
          }}
          style={{
            backgroundColor: colors.danger,
            borderRadius: radius.lg,
            paddingVertical: 14,
            alignItems: 'center',
          }}>
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Initiate resignation</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}
