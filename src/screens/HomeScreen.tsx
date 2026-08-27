// HomeScreen.tsx
import { useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import type { AttendanceRecord, AuthUser, TodayAttendanceEntry } from '../../services/api';
import CornerLogo from '../components/CornerLogo';
import CounselingPanel from '../components/modules/CounselingPanel';
import OtherPanel from '../components/modules/OtherPanel';
import OvertimePanel from '../components/modules/OvertimePanel';
import PayrollPanel from '../components/modules/PayrollPanel';
import PayslipPanel from '../components/modules/PayslipPanel';
import ResignPanel from '../components/modules/ResignPanel';
import TimeOffPanel from '../components/modules/TimeOffPanel';
import QuickActionSheet from '../components/QuickActionSheet';
import { colors, radius, shadow } from '../theme/colors';
import { formatClock } from '../utils/format';
import CalendarScreen from './CalendarScreen';

type QuickActionKey =
  | 'Payroll'
  | 'Payslip'
  | 'Counseling'
  | 'Time Off'
  | 'Calendar'
  | 'Overtime'
  | 'Resign'
  | 'Other';

const QUICK_ACTIONS: { label: QuickActionKey; emoji: string; bg: string }[] = [
  { label: 'Payroll', emoji: '💰', bg: 'bg-indigo-100' },
  { label: 'Payslip', emoji: '🧾', bg: 'bg-pink-100' },
  { label: 'Counseling', emoji: '🧑‍💼', bg: 'bg-amber-100' },
  { label: 'Time Off', emoji: '⏰', bg: 'bg-emerald-100' },
  { label: 'Calendar', emoji: '📅', bg: 'bg-indigo-100' },
  { label: 'Overtime', emoji: '⏱️', bg: 'bg-pink-100' },
  { label: 'Resign', emoji: '↩️', bg: 'bg-amber-100' },
  { label: 'Other', emoji: '⋯', bg: 'bg-emerald-100' },
];

const FEATURED_MODULES: { label: QuickActionKey; emoji: string; bg: string; description: string }[] = [
  { label: 'Payroll', emoji: '💰', bg: 'bg-indigo-100', description: 'View salary breakdown and history' },
  { label: 'Payslip', emoji: '🧾', bg: 'bg-pink-100', description: 'Download monthly payslips' },
  { label: 'Counseling', emoji: '🧑‍💼', bg: 'bg-amber-100', description: 'Schedule HR sessions' },
  { label: 'Time Off', emoji: '⏰', bg: 'bg-emerald-100', description: 'Request and manage leave' },
];

function initials(name: string) {
  return (name || '?')
    .split(' ')
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export default function HomeScreen({
  user,
  onLogout,
  attendance,
  list,
  loading,
  refreshing,
  actionLoading,
  error,
  hasClockedIn,
  hasClockedOut,
  onRefresh,
  onClockIn,
  onClockOut,
  onViewAllAttendance,
}: {
  user: AuthUser;
  onLogout: () => void;
  attendance: AttendanceRecord;
  list: TodayAttendanceEntry[];
  loading: boolean;
  refreshing: boolean;
  actionLoading: boolean;
  error: string | null;
  hasClockedIn: boolean;
  hasClockedOut: boolean;
  onRefresh: () => void;
  onClockIn: () => void;
  onClockOut: () => void;
  onViewAllAttendance: () => void;
}) {
  const [openAction, setOpenAction] = useState<QuickActionKey | null>(null);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-[#F4F3FB]">
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const attendDisabled = actionLoading || (hasClockedIn && hasClockedOut);

  return (
    <View className="flex-1 bg-[#F4F3FB]">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}>
        {/* Header */}
        <LinearGradient
          colors={[colors.headerFrom, colors.headerTo]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            position: 'relative',
            borderBottomLeftRadius: radius.xl,
            borderBottomRightRadius: radius.xl,
            paddingHorizontal: 20,
            paddingTop: 8,
            paddingBottom: 20,
          }}>
          {/* Logo badge — same CornerLogo used on the login screen, flush
              against the top-left corner, so the brand mark matches across
              every screen. */}
          <CornerLogo size={64} />

          <View className="flex-row items-center justify-end">
            {/* User name — right */}
            <TouchableOpacity onPress={onLogout} activeOpacity={0.7} className="flex-row items-center gap-3">
              <View style={{ alignItems: 'flex-end' }}>
                <Text className="text-base font-bold text-white">{user.name}</Text>
              </View>
              <View
                style={{
                  height: 44,
                  width: 44,
                  borderRadius: 22,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'rgba(255,255,255,0.18)',
                  borderWidth: 1.5,
                  borderColor: 'rgba(255,255,255,0.5)',
                }}>
                <Text className="text-base font-bold text-white">{initials(user.name)}</Text>
              </View>
            </TouchableOpacity>
          </View>

          <Text className=" text-xl font-bold text-white">
            Welcome back, {user.name.split(' ')[0]}! 👋
          </Text>
          
        </LinearGradient>

        {/* Today's attendance */}
        <View className="mx-4 mt-2">
          <View
            style={{
              backgroundColor: colors.card,
              borderRadius: radius.xl,
              padding: 16,
              ...shadow.card,
            }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>Today&apos;s attendance</Text>
              <TouchableOpacity onPress={onViewAllAttendance}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: colors.primary }}>View all ›</Text>
              </TouchableOpacity>
            </View>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
              <View style={{ flex: 1, backgroundColor: colors.track, borderRadius: radius.md, padding: 10 }}>
                <Text style={{ fontSize: 11, color: colors.textMuted }}>Clock in</Text>
                <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text, marginTop: 2 }}>
                  {formatClock(attendance?.loginTime)}
                </Text>
              </View>
              <View style={{ flex: 1, backgroundColor: colors.track, borderRadius: radius.md, padding: 10 }}>
                <Text style={{ fontSize: 11, color: colors.textMuted }}>Clock out</Text>
                <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text, marginTop: 2 }}>
                  {formatClock(attendance?.logoutTime)}
                </Text>
              </View>
              <TouchableOpacity
                disabled={attendDisabled}
                onPress={hasClockedIn ? onClockOut : onClockIn}
                activeOpacity={0.85}
                style={{
                  width: 92,
                  borderRadius: radius.md,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: hasClockedIn ? colors.danger : colors.primary,
                  opacity: attendDisabled ? 0.5 : 1,
                }}>
                {actionLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>
                    {hasClockedIn ? 'Clock out' : 'Clock in'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            {error ? (
              <Text style={{ fontSize: 11, color: colors.danger, marginTop: 10 }}>{error}</Text>
            ) : (
              <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 10 }}>
                {list.length} {list.length === 1 ? 'person' : 'people'} clocked in today
              </Text>
            )}
          </View>
        </View>

        {/* Quick actions grid */}
        <View className="mx-4 mt-6 flex-row flex-wrap justify-between">
          {QUICK_ACTIONS.map((action) => (
            <TouchableOpacity
              key={action.label}
              className="mb-4 w-[22%] items-center"
              onPress={() => setOpenAction(action.label)}
              activeOpacity={0.7}>
              <View
                className={`h-12 w-12 items-center justify-center rounded-2xl ${action.bg}`}
                style={shadow.soft}>
                <Text className="text-lg">{action.emoji}</Text>
              </View>
              <Text className="mt-1 text-center text-[11px] text-gray-600">{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Featured Modules Section */}
        <View className="mx-4 mt-2">
          <Text className="mb-3 text-sm font-bold text-gray-900">Featured Modules</Text>
          <View className="rounded-3xl bg-white p-4" style={shadow.soft}>
            {FEATURED_MODULES.map((mod, i) => (
              <TouchableOpacity
                key={mod.label}
                className={`flex-row items-center py-3 ${i < FEATURED_MODULES.length - 1 ? 'border-b border-gray-100' : ''}`}
                onPress={() => setOpenAction(mod.label)}
                activeOpacity={0.7}>
                <View className={`h-12 w-12 items-center justify-center rounded-xl ${mod.bg}`}>
                  <Text className="text-xl">{mod.emoji}</Text>
                </View>
                <View className="ml-3 flex-1">
                  <Text className="text-sm font-semibold text-gray-900">{mod.label}</Text>
                  <Text className="text-xs text-gray-400">{mod.description}</Text>
                </View>
                <Text className="text-gray-300">›</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Quick Access Section */}
        <View className="mx-4 mt-4">
          <Text className="mb-3 text-sm font-bold text-gray-900">Quick Access</Text>
          <View className="flex-row flex-wrap gap-2">
            <TouchableOpacity
              className="min-w-[48%] flex-1 rounded-2xl bg-white p-3"
              style={shadow.soft}
              onPress={() => setOpenAction('Calendar')}
              activeOpacity={0.7}>
              <Text className="text-lg">📅</Text>
              <Text className="mt-1 text-xs font-semibold text-gray-900">Calendar</Text>
              <Text className="text-xs text-gray-400">View schedule</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="min-w-[48%] flex-1 rounded-2xl bg-white p-3"
              style={shadow.soft}
              onPress={() => setOpenAction('Overtime')}
              activeOpacity={0.7}>
              <Text className="text-lg">⏱️</Text>
              <Text className="mt-1 text-xs font-semibold text-gray-900">Overtime</Text>
              <Text className="text-xs text-gray-400">Track hours</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Quick action detail sheet */}
      <QuickActionSheet
        visible={openAction !== null}
        title={openAction || ''}
        onClose={() => setOpenAction(null)}>
        {openAction === 'Calendar' && <CalendarScreen />}
        {openAction === 'Time Off' && <TimeOffPanel />}
        {openAction === 'Payroll' && <PayrollPanel />}
        {openAction === 'Payslip' && <PayslipPanel />}
        {openAction === 'Counseling' && <CounselingPanel />}
        {openAction === 'Overtime' && <OvertimePanel />}
        {openAction === 'Resign' && <ResignPanel />}
        {openAction === 'Other' && <OtherPanel />}
      </QuickActionSheet>
    </View>
  );
}
