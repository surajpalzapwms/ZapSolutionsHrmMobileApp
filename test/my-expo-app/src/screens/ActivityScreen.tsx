import { RefreshControl, ScrollView, Text, View } from 'react-native';

import type { TodayAttendanceEntry } from '../../services/api';
import AttendanceRow from '../components/AttendanceRow';
import BrandHeader from '../components/BrandHeader';
import LeaveRequestsPanel from '../components/LeaveRequestsPanel';
import { colors, radius, shadow } from '../theme/colors';

function formatTime(iso: string | null | undefined) {
  if (!iso) return '--:--';
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function ActivityScreen({
  todayList,
  refreshing,
  onRefresh,
}: {
  todayList: TodayAttendanceEntry[];
  refreshing: boolean;
  onRefresh: () => void;
}) {
  return (
    <View className="flex-1 bg-white px-5 pt-4">
      <BrandHeader title="Activity" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <Text style={{ fontSize: 14, fontWeight: '700', color: colors.primary, marginBottom: 12 }}>
          Today&apos;s Attendance
        </Text>
        <View style={cardStyle}>
          {todayList.length === 0 ? (
            <Text style={{ fontSize: 13, color: colors.textMuted }}>No one has clocked in yet today.</Text>
          ) : (
            todayList.map((entry) => {
              const person = typeof entry.userId === 'object' && entry.userId ? entry.userId : null;
              return (
                <AttendanceRow
                  key={entry._id}
                  name={person?.name || 'Unknown'}
                  role={person?.role?.replace('-', ' ') || ''}
                  time={formatTime(entry.loginTime)}
                  late={!entry.logoutTime}
                />
              );
            })
          )}
        </View>

        <Text style={{ fontSize: 14, fontWeight: '700', color: colors.primary, marginBottom: 12, marginTop: 8 }}>
          My Leave Requests
        </Text>
        <View style={cardStyle}>
          <LeaveRequestsPanel />
        </View>
      </ScrollView>
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

