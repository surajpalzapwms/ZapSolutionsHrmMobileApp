import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { getYearBirthdays, getYearHolidays } from '../services/celebrationService';
import QuickActionSheet from './QuickActionSheet';
import Avatar from './Avatar';
import HolidaysListScreen from '../screens/HolidaysListScreen';
import BirthdaysListScreen from '../screens/BirthdaysListScreen';
import { colors, radius, shadow } from '../theme/colors';
import { cacheGet, cacheLoad, cacheSet } from '../utils/appCache';

const CACHE_KEY = 'celebrations';

const MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

// "20 Oct" from "YYYY-MM-DD", parsed as a LOCAL date (no timezone shift).
function shortDate(ymd) {
  const [y, m, d] = String(ymd).slice(0, 10).split('-').map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1);
  return `${dt.getDate()} ${MONTHS_SHORT[dt.getMonth()] ?? ''}`.trim();
}

// "9 Nov – 12 Nov" for multi-day holidays, "9 Nov" for single days.
function dateRange(start, end) {
  return end && end > start ? `${shortDate(start)} – ${shortDate(end)}` : shortDate(start);
}

function countdown(daysUntil) {
  if (daysUntil === 0) return 'Today';
  if (daysUntil === 1) return 'Tomorrow';
  return `in ${daysUntil} days`;
}

// Holiday = green, Birthday = pink.
const THEMES = {
  holiday: { bg: '#ECFDF5', border: '#A7F3D0', title: '#065F46', accent: '#047857', emoji: '🎊' },
  birthday: { bg: '#FDF2F8', border: '#FBCFE8', title: '#9D174D', accent: '#BE185D', emoji: '🎂' },
};

export default function BirthdayBanner({ user, refreshKey = 0 }) {
  // Last saved copy first (instant Home), then fresh data from the server.
  const cached = cacheGet(CACHE_KEY);
  const [birthdays, setBirthdays] = useState(() => cached?.birthdays || []);
  const [holidays, setHolidays] = useState(() => cached?.holidays || []);
  const [loading, setLoading] = useState(() => !cached);
  // 'holidays' | 'birthdays' | null — which full list sheet is open.
  const [listOpen, setListOpen] = useState(null);

  // Saved copy first (instant Home)…
  useEffect(() => {
    let cancelled = false;
    cacheLoad(CACHE_KEY).then((saved) => {
      if (cancelled || !saved) return;
      setBirthdays((cur) => (cur.length ? cur : saved.birthdays || []));
      setHolidays((cur) => (cur.length ? cur : saved.holidays || []));
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // …then fresh data from the server. This used to run ONLY when Home was
  // first built, and Home stays alive all day (frozen tab), so when a
  // colleague uploaded a photo everybody else kept seeing the old list
  // (initials, no photo) until they closed the app. Now it reloads every
  // time Home comes into view, when the app comes back to the front, and on
  // pull-to-refresh (refreshKey).
  const isAdmin = !!user && ['admin', 'super-admin'].includes(String(user.role || '').toLowerCase());
  const lastLoad = useRef(0);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const load = useCallback(
    (force = false) => {
      // Tab switches within 20 s don't hit the server again.
      if (!force && Date.now() - lastLoad.current < 20000) return;
      lastLoad.current = Date.now();
      Promise.allSettled([getYearBirthdays({ isAdmin }), getYearHolidays()])
        .then(([bRes, hRes]) => {
          if (!mounted.current) return;
          const b = bRes.status === 'fulfilled' ? bRes.value || [] : null;
          const h = hRes.status === 'fulfilled' ? hRes.value || [] : null;
          if (b) setBirthdays(b);
          if (h) setHolidays(h);
          if (b && h) cacheSet(CACHE_KEY, { birthdays: b, holidays: h }, { persist: true });
        })
        .finally(() => {
          if (mounted.current) setLoading(false);
        });
    },
    [isAdmin],
  );

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  useEffect(() => {
    if (refreshKey) load(true);
  }, [refreshKey, load]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (st) => {
      if (st === 'active') load();
    });
    return () => sub.remove();
  }, [load]);

  if (loading) {
    return (
      <View style={{ paddingVertical: 20, alignItems: 'center' }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const isMine = (b) =>
    b.isSelf || (!!user?.name && b.name?.toLowerCase() === user.name.toLowerCase());

  const bdayToday = birthdays.filter((b) => b.daysUntil === 0);
  const nextHoliday = holidays[0];
  const nextBirthday = birthdays[0];

  return (
    <View style={{ marginBottom: 4 }}>
      <BirthdayHighlight today={bdayToday} isMine={isMine} />

      {/* One card, two buttons */}
      <View
        style={{
          backgroundColor: colors.card,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: colors.border,
          padding: 12,
          flexDirection: 'row',
          gap: 12,
          ...shadow.soft,
        }}>
        <UpcomingButton
          label="Upcoming Holiday"
          theme={THEMES.holiday}
          count={holidays.length}
          nextTitle={nextHoliday?.name}
          nextDate={nextHoliday && dateRange(nextHoliday.date, nextHoliday.endDate)}
          nextWhen={nextHoliday && countdown(nextHoliday.daysUntil)}
          empty="No more holidays"
          onPress={() => setListOpen('holidays')}
        />
        <UpcomingButton
          label="Upcoming Birthday"
          theme={THEMES.birthday}
          count={birthdays.length}
          nextTitle={nextBirthday && `${nextBirthday.name}${isMine(nextBirthday) ? ' (You)' : ''}`}
          nextDate={nextBirthday && shortDate(nextBirthday.date)}
          nextWhen={nextBirthday && countdown(nextBirthday.daysUntil)}
          people={birthdays}
          isMine={isMine}
          empty="No more birthdays"
          onPress={() => setListOpen('birthdays')}
        />
      </View>

      <QuickActionSheet
        visible={listOpen !== null}
        title={listOpen === 'birthdays' ? 'Upcoming Birthdays' : 'Upcoming Holidays'}
        onClose={() => setListOpen(null)}>
        {listOpen === 'holidays' && <HolidaysListScreen />}
        {listOpen === 'birthdays' && <BirthdaysListScreen />}
      </QuickActionSheet>
    </View>
  );
}

// ── One button: "Upcoming Holiday" / "Upcoming Birthday" ─────────────────
// Shows the label, how many are left, and a small preview of the next one.
// How many birthday photos fit side by side in the half-width card.
const MAX_FACES = 4;

// Everyone with an upcoming birthday — each person's own photo (initials if
// they have none), overlapping, with "+N" when there are more. Before, only
// the next person had a photo here; the 2nd, 3rd… were left out.
function BirthdayFaces({ people, isMine, theme, count }) {
  // More than fit: show the first 3 photos + a "+N" bubble.
  const shown = people.length > MAX_FACES ? people.slice(0, MAX_FACES - 1) : people;
  const extra = people.length - shown.length;
  const slots = shown.length + (people.length > shown.length ? 1 : 0);
  const size = slots <= 2 ? 44 : slots === 3 ? 38 : 32;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
      {shown.map((b, i) => (
        <View
          key={`${b.id ?? b.name}-${i}`}
          style={{
            marginLeft: i ? -size * 0.28 : 0,
            borderWidth: 2,
            borderColor: '#fff',
            borderRadius: size / 2 + 2,
            backgroundColor: '#fff',
            zIndex: MAX_FACES - i,
          }}>
          <Avatar name={b.name} uri={b.photoUrl} size={size} self={!!isMine?.(b)} bg="#FCE7F3" color="#BE185D" />
        </View>
      ))}
      {extra > 0 && (
        <View
          style={{
            marginLeft: -size * 0.28,
            width: size + 4,
            height: size + 4,
            borderRadius: size / 2 + 2,
            borderWidth: 2,
            borderColor: '#fff',
            backgroundColor: theme.accent,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800' }}>+{extra}</Text>
        </View>
      )}
      {count > 0 && extra <= 0 && (
        <View
          style={{
            position: 'absolute',
            top: -6,
            right: -6,
            minWidth: 20,
            height: 20,
            paddingHorizontal: 5,
            borderRadius: 10,
            backgroundColor: theme.accent,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800' }}>{count}</Text>
        </View>
      )}
    </View>
  );
}

function UpcomingButton({ label, theme, count, nextTitle, nextDate, nextWhen, empty, onPress, people = null, isMine }) {
  const hasFaces = Array.isArray(people) && people.length > 0;
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={{
        flex: 1,
        backgroundColor: theme.bg,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: theme.border,
        paddingVertical: 14,
        paddingHorizontal: 10,
        alignItems: 'center',
      }}>
      {hasFaces ? (
        <BirthdayFaces people={people} isMine={isMine} theme={theme} count={count} />
      ) : (
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
        <Text style={{ fontSize: 20 }}>{theme.emoji}</Text>
        {count > 0 && (
          <View
            style={{
              position: 'absolute',
              top: -4,
              right: -6,
              minWidth: 20,
              height: 20,
              paddingHorizontal: 5,
              borderRadius: 10,
              backgroundColor: theme.accent,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800' }}>{count}</Text>
          </View>
        )}
      </View>
      )}

      <Text style={{ fontSize: 14, fontWeight: '800', color: theme.title, textAlign: 'center' }}>
        {label}
      </Text>

      {nextTitle ? (
        <>
          <Text
            numberOfLines={1}
            style={{ fontSize: 12, fontWeight: '600', color: colors.textMuted, marginTop: 6, textAlign: 'center' }}>
            Next: {nextTitle}
          </Text>
          <Text
            numberOfLines={1}
            style={{ fontSize: 11, color: colors.textMuted, marginTop: 2, textAlign: 'center' }}>
            {nextDate}
          </Text>
          <Text style={{ fontSize: 11, fontWeight: '700', color: theme.accent, marginTop: 2 }}>{nextWhen}</Text>
          {/* Names of everyone else coming up (their photos are at the top). */}
          {hasFaces && people.length > 1 && (
            <Text
              numberOfLines={2}
              style={{ fontSize: 11, color: colors.textMuted, marginTop: 4, textAlign: 'center' }}>
              Also: {people
                .slice(1)
                .map((b) => `${b.name.split(' ')[0]}${isMine?.(b) ? ' (You)' : ''}`)
                .join(', ')}
            </Text>
          )}
        </>
      ) : (
        <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 6, textAlign: 'center' }}>{empty}</Text>
      )}

      <Text style={{ fontSize: 12, fontWeight: '700', color: theme.accent, marginTop: 8 }}>View all ›</Text>
    </TouchableOpacity>
  );
}

// ── Birthday today: personal / team message ──────────────────────────────
function BirthdayHighlight({ today, isMine }) {
  const mine = today.find(isMine);
  const others = today.filter((b) => !isMine(b));
  if (!mine && others.length === 0) return null;

  return (
    <>
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
          {others.map((b, i) => (
            <View
              key={`${b.id ?? b.name}-${i}`}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: i ? 8 : 2 }}>
              <Avatar name={b.name} uri={b.photoUrl} size={36} self={isMine(b)} />
              <Text style={{ flex: 1, fontSize: 13, color: '#9A3412', lineHeight: 20 }}>
                Today is <Text style={{ fontWeight: '800' }}>{b.name}</Text>&apos;s birthday — don&apos;t
                forget to wish them and celebrate! 🥳
              </Text>
            </View>
          ))}
        </View>
      )}
    </>
  );
}
