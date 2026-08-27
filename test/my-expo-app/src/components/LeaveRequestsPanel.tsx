import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { getMyLeaveRequests } from '../../services/api';
import type { LeaveRequest } from '../../services/api';
import { colors, radius } from '../theme/colors';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString([], { day: 'numeric', month: 'short' });
}

const STATUS_COLOR: Record<LeaveRequest['status'], { bg: string; text: string }> = {
  pending: { bg: colors.primarySoft, text: colors.primary },
  approved: { bg: colors.successSoft, text: colors.success },
  rejected: { bg: colors.dangerSoft, text: colors.danger },
};

export default function LeaveRequestsPanel() {
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getMyLeaveRequests()
      .then((res) => {
        if (!cancelled) setLeaves(res.data ?? []);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load leave requests');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return <ActivityIndicator color={colors.primary} />;
  if (error) return <Text style={{ fontSize: 12, color: colors.danger, fontWeight: '500' }}>{error}</Text>;
  if (leaves.length === 0) return <Text style={{ fontSize: 13, color: colors.textMuted }}>No leave requests yet.</Text>;

  return (
    <View>
      {leaves.map((lr, i, arr) => {
        const chip = STATUS_COLOR[lr.status] || STATUS_COLOR.pending;
        return (
          <View key={lr._id}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 }}>
              <View>
                <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>{lr.leaveType || 'Leave'}</Text>
                <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
                  {formatDate(lr.fromDate)} – {formatDate(lr.toDate)}
                </Text>
              </View>
              <View style={{ backgroundColor: chip.bg, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 5 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: chip.text, textTransform: 'capitalize' }}>
                  {lr.status}
                </Text>
              </View>
            </View>
            {i < arr.length - 1 && <View style={{ height: 1, backgroundColor: colors.border }} />}
          </View>
        );
      })}
    </View>
  );
}
