import { useEffect, useState } from 'react';
import { Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { getMyLeaveRequests } from '../../../services/api';
import type { LeaveRequest } from '../../../services/api';
import { leaveBalance, mockLeaveRequests } from '../../data/mockData';
import { colors, radius } from '../../theme/colors';
import { Badge, Card, Divider, SampleDataBadge, SectionTitle, StatBox } from './ModuleUI';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString([], { day: 'numeric', month: 'short' });
}

const STATUS_TONE: Record<LeaveRequest['status'], 'primary' | 'success' | 'danger'> = {
  pending: 'primary',
  approved: 'success',
  rejected: 'danger',
};

export default function TimeOffPanel() {
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [usingSampleData, setUsingSampleData] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getMyLeaveRequests()
      .then((res) => {
        if (cancelled) return;
        const data = res.data ?? [];
        if (data.length > 0) {
          setLeaves(data);
        } else {
          setLeaves(mockLeaveRequests);
          setUsingSampleData(true);
        }
      })
      .catch(() => {
        if (cancelled) return;
        setLeaves(mockLeaveRequests);
        setUsingSampleData(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
      {usingSampleData && <SampleDataBadge />}

      <SectionTitle>Leave balance</SectionTitle>
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
        {leaveBalance.map((b) => (
          <StatBox key={b.label} label={`${b.label} left`} value={`${b.total - b.used}/${b.total}`} />
        ))}
      </View>

      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => Alert.alert('Apply for leave', 'This form will submit to the leave endpoint once connected.')}
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
        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Apply for leave</Text>
      </TouchableOpacity>

      <SectionTitle>Requests</SectionTitle>
      {loading ? (
        <Card>
          <Text style={{ fontSize: 13, color: colors.textMuted }}>Loading…</Text>
        </Card>
      ) : leaves.length === 0 ? (
        <Card>
          <Text style={{ fontSize: 13, color: colors.textMuted }}>No leave requests yet.</Text>
        </Card>
      ) : (
        <Card>
          {leaves.map((lr, i, arr) => (
            <View key={lr._id}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 }}>
                <View>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>{lr.leaveType || 'Leave'}</Text>
                  <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
                    {formatDate(lr.fromDate)} – {formatDate(lr.toDate)}
                  </Text>
                </View>
                <Badge label={lr.status} tone={STATUS_TONE[lr.status] ?? 'primary'} />
              </View>
              {i < arr.length - 1 && <Divider />}
            </View>
          ))}
        </Card>
      )}
    </ScrollView>
  );
}
