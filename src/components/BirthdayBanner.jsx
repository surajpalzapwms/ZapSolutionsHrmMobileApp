import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';

import { getBirthdays, getUpcomingHolidays } from '../services/celebrationService';
import { colors, radius, shadow } from '../theme/colors';

const MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];


// ── Small shared helpers ─────────────────────────────────────────────────
function birthdayDate(b) {
  return `${b.day} ${MONTHS_SHORT[b.month] ?? ''}`.trim();
}

// "20 Oct" from a "YYYY-MM-DD" holiday date, parsed as a LOCAL date so the
// day never shifts due to timezone.
function holidayDate(h) {
  const [y, m, d] = h.date.slice(0, 10).split('-').map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1);
  return `${dt.getDate()} ${MONTHS_SHORT[dt.getMonth()] ?? ''}`.trim();
}

// Works for both Birthday and UpcomingHoliday — both carry `daysUntil`.
function countdown(daysUntil) {
  if (daysUntil === 0) return 'Today';
  if (daysUntil === 1) return 'Tomorrow';
  return `in ${daysUntil} days`;
}

function initials(name) {
  return (name || '?')
    .split(' ')
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

/**
 * Home-screen "celebrations" section with a Birthday / Holiday toggle.
 *
 * A pill button on the right flips the whole section between two modes:
 *   • Birthday mode — a celebration card for anyone whose birthday is TODAY
 *     (a personal message if it's the logged-in user), plus a horizontal
 *     "Upcoming birthdays" strip.
 *   • Holiday mode — a highlight card for a holiday landing TODAY or
 *     TOMORROW (shown with its date and festival name), plus a horizontal
 *     "Upcoming holidays" strip.
 *
 * The button label always names the OTHER mode ("Holiday" while showing
 * birthdays, "Birthday" while showing holidays), so tapping it switches over.
 *
 * Both lists are fully dynamic — birthdays come from /api/staff/birthdays and
 * holidays from the holidays endpoints. When an endpoint returns nothing (or
 * can't be reached) the matching section simply shows an empty state rather
 * than any placeholder/sample content.
 */
export default function BirthdayBanner({ user }) {
  const [mode, setMode] = useState('birthday');

  // Birthday data
  const [bdayToday, setBdayToday] = useState([]);
  const [bdayUpcoming, setBdayUpcoming] = useState([]);

  // Holiday data
  const [holToday, setHolToday] = useState([]);
  const [holUpcoming, setHolUpcoming] = useState([]);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    // Fetch both feeds in parallel so switching modes is instant (no second
    // network round-trip when the user taps the toggle).
    Promise.allSettled([getBirthdays(), getUpcomingHolidays()])
      .then(([bRes, hRes]) => {
        if (cancelled) return;

        // Birthdays — use whatever the endpoint returns (may be empty).
        if (bRes.status === 'fulfilled') {
          setBdayToday(bRes.value.today ?? []);
          setBdayUpcoming(bRes.value.upcoming ?? []);
        } else {
          setBdayToday([]);
          setBdayUpcoming([]);
        }

        // Holidays — same, no placeholder content.
        if (hRes.status === 'fulfilled') {
          setHolToday(hRes.value.today ?? []);
          setHolUpcoming(hRes.value.upcoming ?? []);
        } else {
          setHolToday([]);
          setHolUpcoming([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <View style={{ paddingVertical: 20, alignItems: 'center' }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={{ marginBottom: 4 }}>
      {/* Top highlight — depends on the active mode */}
      {mode === 'birthday' ? (
        <BirthdayHighlight today={bdayToday} user={user} />
      ) : (
        <HolidayHighlight today={holToday} upcoming={holUpcoming} />
      )}

      {/* Upcoming list card, with the Birthday/Holiday toggle in its header */}
      <View
        style={{
          backgroundColor: colors.card,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: colors.border,
          padding: 16,
          ...shadow.soft,
        }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 12,
          }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ fontSize: 16 }}>{mode === 'birthday' ? '🎈' : '📅'}</Text>
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>
              {mode === 'birthday' ? 'Upcoming birthdays' : 'Upcoming holidays'}
            </Text>
          </View>

          {/* Right-hand toggle: label names the mode you'll switch TO */}
          <ModeToggle mode={mode} onToggle={() => setMode((m) => (m === 'birthday' ? 'holiday' : 'birthday'))} />
        </View>

        {mode === 'birthday' ? (
          <BirthdayStrip upcoming={bdayUpcoming} user={user} />
        ) : (
          <HolidayStrip upcoming={holUpcoming} />
        )}
      </View>
    </View>
  );
}

// ── Toggle button ────────────────────────────────────────────────────────
function ModeToggle({ mode, onToggle }) {
  const nextLabel = mode === 'birthday' ? 'Holiday' : 'Birthday';
  const icon = mode === 'birthday' ? '📅' : '🎂';
  return (
    <TouchableOpacity
      onPress={onToggle}
      activeOpacity={0.8}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: radius.pill,
        backgroundColor: colors.primarySoft,
        borderWidth: 1,
        borderColor: colors.border,
      }}>
      <Text style={{ fontSize: 12 }}>{icon}</Text>
      <Text style={{ fontSize: 12, fontWeight: '700', color: colors.primary }}>{nextLabel}</Text>
    </TouchableOpacity>
  );
}

// ── Birthday: top highlight (today's birthdays) ──────────────────────────
function BirthdayHighlight({ today, user }) {
  const isMine = (b) =>
    b.isSelf || (!!user?.name && b.name?.toLowerCase() === user.name.toLowerCase());

  const mine = today.find(isMine);
  const others = today.filter((b) => !isMine(b));

  if (!mine && others.length === 0) return null;

  return (
    <>
      {/* Your own birthday — personal congratulations */}
      {mine && (
        <View
          style={{
            backgroundColor: colors.primary,
            borderRadius: radius.xl,
            padding: 18,
            marginBottom: 12,
            ...shadow.card,
          }}>
          <Text style={{ fontSize: 26, marginBottom: 4 }}>🎉🎂</Text>
          <Text style={{ color: '#fff', fontSize: 18, fontWeight: '800' }}>
            Happy Birthday, {mine.name.split(' ')[0]}!
          </Text>
          <Text style={{ color: '#fff', opacity: 0.9, fontSize: 13, marginTop: 4, lineHeight: 19 }}>
            Wishing you a wonderful day. The whole team is celebrating with you today. 🥳
          </Text>
        </View>
      )}

      {/* Someone else's birthday today — nudge everyone to celebrate */}
      {others.length > 0 && (
        <View
          style={{
            backgroundColor: '#FFF7ED',
            borderRadius: radius.lg,
            borderWidth: 1,
            borderColor: '#FED7AA',
            padding: 16,
            marginBottom: 12,
          }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <Text style={{ fontSize: 20 }}>🎂</Text>
            <Text style={{ fontSize: 14, fontWeight: '800', color: '#9A3412' }}>Birthday today!</Text>
          </View>
          {others.map((b) => (
            <Text key={b.id} style={{ fontSize: 13, color: '#9A3412', lineHeight: 20 }}>
              Today is <Text style={{ fontWeight: '800' }}>{b.name}</Text>&apos;s birthday — don&apos;t
              forget to wish them and celebrate! 🥳
            </Text>
          ))}
        </View>
      )}
    </>
  );
}

// ── Holiday: top highlight (today / tomorrow, else next upcoming) ─────────
function HolidayHighlight({
  today,
  upcoming,
}) {
  // Priority: a holiday TODAY, else TOMORROW, else the very next one.
  const tomorrow = upcoming.find((h) => h.isTomorrow);
  const featured = today[0] ?? tomorrow ?? upcoming[0];
  if (!featured) return null;

  const [y, m, d] = featured.date.slice(0, 10).split('-').map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1);
  const fullDate = dt.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' });

  const headline = featured.isToday
    ? 'Holiday today'
    : featured.isTomorrow
      ? 'Tomorrow is a holiday'
      : 'Next holiday';

  return (
    <View
      style={{
        backgroundColor: '#ECFDF5',
        borderRadius: radius.xl,
        borderWidth: 1,
        borderColor: '#A7F3D0',
        padding: 18,
        marginBottom: 12,
        ...shadow.card,
      }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <Text style={{ fontSize: 22 }}>🎊</Text>
        <Text style={{ fontSize: 14, fontWeight: '800', color: '#065F46' }}>{headline}</Text>
      </View>
      <Text style={{ fontSize: 18, fontWeight: '800', color: '#065F46' }}>{featured.name}</Text>
      <Text style={{ fontSize: 13, color: '#047857', marginTop: 4, fontWeight: '600' }}>
        {fullDate}
        {featured.isSaturdayHoliday ? ' · Saturday off' : ''} · {countdown(featured.daysUntil)}
      </Text>
    </View>
  );
}

// ── Birthday: horizontal upcoming strip ──────────────────────────────────
function BirthdayStrip({ upcoming, user }) {
  const isMine = (b) =>
    b.isSelf || (!!user?.name && b.name?.toLowerCase() === user.name.toLowerCase());

  if (upcoming.length === 0) {
    return <Text style={{ fontSize: 13, color: colors.textMuted }}>No upcoming birthdays.</Text>;
  }

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingRight: 4 }}>
      {[...upcoming]
        .sort((a, b) => a.daysUntil - b.daysUntil)
        .map((b) => (
          <View
            key={b.id}
            style={{
              width: 128,
              backgroundColor: colors.primarySoft,
              borderRadius: radius.lg,
              borderWidth: 1,
              borderColor: colors.border,
              paddingVertical: 14,
              paddingHorizontal: 10,
              alignItems: 'center',
            }}>
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: '#fff',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 8,
              }}>
              <Text style={{ fontSize: 14, fontWeight: '800', color: colors.primary }}>{initials(b.name)}</Text>
            </View>
            <Text
              numberOfLines={1}
              style={{ fontSize: 13, fontWeight: '700', color: colors.text, textAlign: 'center' }}>
              {b.name}
              {isMine(b) ? ' (You)' : ''}
            </Text>
            <Text
              style={{ fontSize: 11, color: colors.textMuted, fontWeight: '600', marginTop: 4, textAlign: 'center' }}>
              {birthdayDate(b)}
            </Text>
            <Text
              style={{ fontSize: 11, color: colors.primary, fontWeight: '700', marginTop: 2, textAlign: 'center' }}>
              {countdown(b.daysUntil)}
            </Text>
          </View>
        ))}
    </ScrollView>
  );
}

// ── Holiday: horizontal upcoming strip ───────────────────────────────────
function HolidayStrip({ upcoming }) {
  if (upcoming.length === 0) {
    return <Text style={{ fontSize: 13, color: colors.textMuted }}>No upcoming holidays.</Text>;
  }

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingRight: 4 }}>
      {[...upcoming]
        .sort((a, b) => a.daysUntil - b.daysUntil)
        .map((h) => (
          <View
            key={h._id}
            style={{
              width: 140,
              backgroundColor: '#ECFDF5',
              borderRadius: radius.lg,
              borderWidth: 1,
              borderColor: '#A7F3D0',
              paddingVertical: 14,
              paddingHorizontal: 10,
              alignItems: 'center',
            }}>
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: '#fff',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 8,
              }}>
              <Text style={{ fontSize: 18 }}>🎊</Text>
            </View>
            <Text
              numberOfLines={2}
              style={{ fontSize: 13, fontWeight: '700', color: '#065F46', textAlign: 'center' }}>
              {h.name}
            </Text>
            <Text
              style={{ fontSize: 11, color: colors.textMuted, fontWeight: '600', marginTop: 4, textAlign: 'center' }}>
              {holidayDate(h)}
            </Text>
            <Text
              style={{ fontSize: 11, color: '#047857', fontWeight: '700', marginTop: 2, textAlign: 'center' }}>
              {countdown(h.daysUntil)}
            </Text>
          </View>
        ))}
    </ScrollView>
  );
}