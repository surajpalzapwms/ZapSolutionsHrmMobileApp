import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';

import { getStaffSummary } from '../../services/api';
import type { StaffSummaryEntry } from '../../services/api';
import BrandHeader from '../components/BrandHeader';
import StatCell from '../components/StatCell';
import WeeklyChart from '../components/WeeklyChart';
import { colors, radius, shadow } from '../theme/colors';

export default function AnalyticsScreen() {
  const [summary, setSummary] = useState<StaffSummaryEntry[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getStaffSummary()
      .then((res) => {
        if (!cancelled) setSummary(res.data ?? []);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load analytics');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const totalPresent = (summary || []).reduce((sum, s) => sum + (s.presentDays ?? s.present ?? 0), 0);
  const totalAbsent = (summary || []).reduce((sum, s) => sum + (s.absentDays ?? 0), 0);

  return (
    <View className="flex-1 bg-white px-5 pt-4">
      <BrandHeader title="Analytics" />

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          {error ? <Text className="mb-3 text-xs font-medium text-red-500">{error}</Text> : null}

          {/* Team totals card */}
          <View style={cardStyle}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 16 }}>
              Team Attendance (This Month)
            </Text>
            <View style={{ flexDirection: 'row' }}>
              <StatCell label="Present days" value={String(totalPresent)} divider />
              <StatCell label="Absent days" value={String(totalAbsent)} divider />
              <StatCell label="Staff tracked" value={String((summary || []).length)} />
            </View>
          </View>

          {/* Weekly trend */}
          <View style={cardStyle}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 8 }}>
              Weekly Trend
            </Text>
            <WeeklyChart />
          </View>

          {/* Per-staff breakdown */}
          <Text style={{ fontSize: 14, fontWeight: '700', color: colors.primary, marginBottom: 12 }}>
            Staff Summary
          </Text>
          <View style={cardStyle}>
            {(summary || []).length === 0 ? (
              <Text style={{ fontSize: 13, color: colors.textMuted }}>No attendance data yet.</Text>
            ) : (
              (summary || []).map((s, i, arr) => (
                <View key={s.name || s.staffName || i}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12 }}>
                    <Text style={{ fontSize: 14, color: colors.text, fontWeight: '500' }}>
                      {s.name || s.staffName || 'Staff'}
                    </Text>
                    <Text style={{ fontSize: 13, color: colors.textMuted, fontWeight: '600' }}>
                      {s.presentDays ?? s.present ?? '—'} days
                    </Text>
                  </View>
                  {i < arr.length - 1 && <View style={{ height: 1, backgroundColor: colors.border }} />}
                </View>
              ))
            )}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const cardStyle = {
  backgroundColor: colors.card,
  borderRadius: radius.lg,
  padding: 18,
  marginBottom: 18,
  borderWidth: 1,
  borderColor: colors.border,
  ...shadow.soft,
} as const;
