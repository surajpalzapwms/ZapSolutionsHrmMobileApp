import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';

import { getMyAttendanceMonth } from '../../services/api';
import type { MonthAttendanceEntry } from '../../services/api';
import { colors, radius, shadow } from '../theme/colors';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

type ViewMode = 'monthly' | 'annual';
type RecordMap = Record<string, MonthAttendanceEntry>;

function toDateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatTime(iso: string | null | undefined) {
  if (!iso) return '--:--';
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Builds a 7-column week grid (with leading/trailing blanks) for a given month.
function buildMonthWeeks(year: number, month: number) {
  const firstOfMonth = new Date(year, month, 1);
  const startOffset = firstOfMonth.getDay(); // 0 = Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (Date | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);

  const rows: (Date | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
  return rows;
}

// Solid-fill visual for a day cell: color-codes status the same way across
// the monthly grid and the annual mini-grids.
function cellVisual(status: MonthAttendanceEntry['status'] | undefined, dayOfWeek: number, isFuture: boolean) {
  if (isFuture) return { bg: 'transparent', text: colors.textMuted, weight: '500' as const };

  const solid = (bg: string) => ({ bg, text: '#fff', weight: '700' as const });

  switch (status) {
    case 'present':
      return solid(colors.success);
    case 'half-day':return solid(colors.halfDay);
    case 'swap-leave':
      return solid(colors.swapLeave);
    case 'paid-leave':
    case 'leave':
      return solid(colors.paidLeave);
    case 'unpaid-leave':
    case 'absent':
      return solid(colors.danger);
    case 'holiday':
      return solid(colors.holidayGray);
    case 'weekend':
      return dayOfWeek === 0 ? solid(colors.sundayTint) : { bg: 'transparent', text: colors.textMuted, weight: '500' as const };
    default:
      if (dayOfWeek === 0) return solid(colors.sundayTint);
      return { bg: 'transparent', text: colors.text, weight: '500' as const };
  }
}

export default function CalendarScreen() {
  const today = new Date();
  const [view, setView] = useState<ViewMode>('monthly');

  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [records, setRecords] = useState<RecordMap>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState<string>(toDateKey(today));

  const [annualYear, setAnnualYear] = useState(today.getFullYear());
  const [annualRecords, setAnnualRecords] = useState<RecordMap>({});
  const [annualLoading, setAnnualLoading] = useState(false);
  const [annualError, setAnnualError] = useState<string | null>(null);

  const year = cursor.getFullYear();
  const month = cursor.getMonth(); // 0-indexed

  // Monthly fetch
  useEffect(() => {
    if (view !== 'monthly') return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    getMyAttendanceMonth(year, month + 1)
      .then((res) => {
        if (cancelled) return;
        const map: RecordMap = {};
        for (const r of res.records || []) map[r.date] = r;
        setRecords(map);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load calendar');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [view, year, month]);

  // Annual fetch — one call per month of the selected year.
  useEffect(() => {
    if (view !== 'annual') return;
    let cancelled = false;
    setAnnualLoading(true);
    setAnnualError(null);
    Promise.all(
      Array.from({ length: 12 }, (_, i) =>
        getMyAttendanceMonth(annualYear, i + 1).catch(() => ({ success: false, records: [] as MonthAttendanceEntry[] })),
      ),
    )
      .then((results) => {
        if (cancelled) return;
        const map: RecordMap = {};
        results.forEach((res) => {
          for (const r of res.records || []) map[r.date] = r;
        });
        setAnnualRecords(map);
      })
      .catch((err) => {
        if (!cancelled) setAnnualError(err instanceof Error ? err.message : 'Failed to load annual calendar');
      })
      .finally(() => {
        if (!cancelled) setAnnualLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [view, annualYear]);

  const weeks = useMemo(() => buildMonthWeeks(year, month), [year, month]);

  const selected = records[selectedKey];
  const selectedDate = selectedKey ? new Date(selectedKey) : today;
  const isSelectedFuture = selectedDate > today;

  function goMonth(delta: number) {
    setCursor(new Date(year, month + delta, 1));
  }
  function jumpYear(delta: number) {
    setCursor(new Date(year + delta, month, 1));
  }
  function goAnnualYear(delta: number) {
    setAnnualYear((y) => y + delta);
  }
  function openMonthFromAnnual(m: number) {
    setCursor(new Date(annualYear, m, 1));
    setView('monthly');
  }

  return (
    <View className="flex-1 bg-white px-5 pt-4">

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <TouchableOpacity
          onPress={() => (view === 'monthly' ? jumpYear(-1) : goAnnualYear(-1))}
          style={{
            width: 40,
            height: 36,
            borderRadius: radius.sm,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.track,
          }}>
          <Text style={{ color: colors.textMuted, fontWeight: '700' }}>«</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => (view === 'monthly' ? goMonth(-1) : goAnnualYear(-1))}
          style={{
            flex: 1,
            height: 36,
            borderRadius: radius.sm,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.text,
          }}>
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>‹ Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => (view === 'monthly' ? goMonth(1) : goAnnualYear(1))}
          style={{
            width: 44,
            height: 36,
            borderRadius: radius.sm,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.primary,
          }}>
          <Text style={{ color: '#fff', fontWeight: '700' }}>»</Text>
        </TouchableOpacity>
      </View>

      {/* Monthly / Annual toggle */}
      <View
        style={{
          flexDirection: 'row',
          backgroundColor: colors.track,
          borderRadius: radius.pill,
          padding: 4,
          marginBottom: 14,
        }}>
        {(['monthly', 'annual'] as ViewMode[]).map((v) => (
          <TouchableOpacity
            key={v}
            onPress={() => setView(v)}
            style={{
              flex: 1,
              paddingVertical: 10,
              borderRadius: radius.pill,
              alignItems: 'center',
              backgroundColor: view === v ? colors.primary : 'transparent',
            }}>
            <Text
              style={{
                fontWeight: '700',
                fontSize: 13,
                color: view === v ? '#fff' : colors.textMuted,
                textTransform: 'capitalize',
              }}>
              {v}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {view === 'monthly' ? (
        <>
          {loading ? (
            <View style={{ paddingVertical: 40, alignItems: 'center' }}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
              <View
                style={{
                  backgroundColor: colors.card,
                  borderRadius: radius.lg,
                  borderWidth: 1,
                  borderColor: colors.border,
                  padding: 16,
                  ...shadow.soft,
                }}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 12 }}>
                  {MONTH_NAMES[month]} {year}
                </Text>

                {error ? (
                  <Text style={{ fontSize: 12, color: colors.danger, fontWeight: '500', marginBottom: 10 }}>
                    {error} — showing an empty calendar. Confirm the /attendance/me/month route on your backend.
                  </Text>
                ) : null}

                {/* Weekday header */}
                <View style={{ flexDirection: 'row', marginBottom: 4 }}>
                  {WEEKDAYS.map((w, i) => (
                    <View key={`${w}-${i}`} style={{ flex: 1, alignItems: 'center', paddingVertical: 6 }}>
                      <Text style={{ fontSize: 11, color: i === 0 ? colors.danger : colors.textMuted, fontWeight: '700' }}>
                        {w}
                      </Text>
                    </View>
                  ))}
                </View>

                {/* Grid */}
                {weeks.map((week, wi) => (
                  <View key={wi} style={{ flexDirection: 'row' }}>
                    {week.map((date, di) => {
                      if (!date) return <View key={di} style={{ flex: 1, aspectRatio: 1 }} />;
                      const key = toDateKey(date);
                      const entry = records[key];
                      const isFuture = date > today;
                      const isToday = key === toDateKey(today);
                      const isSelected = key === selectedKey;
                      const v = cellVisual(entry?.status, date.getDay(), isFuture);

                      return (
                        <TouchableOpacity key={di} onPress={() => setSelectedKey(key)} style={{ flex: 1, aspectRatio: 1, padding: 3 }}>
                          <View
                            style={{
                              flex: 1,
                              borderRadius: radius.md,
                              alignItems: 'center',
                              justifyContent: 'center',
                              backgroundColor: v.bg === 'transparent' && isToday ? colors.todaySoft : v.bg,
                              borderWidth: isSelected ? 2.5 : isToday ? 1.5 : 0,
                              borderColor: isSelected ? colors.primary : colors.paidLeave,
                            }}>
                            <Text style={{ fontSize: 13, fontWeight: v.weight, color: v.text }}>{date.getDate()}</Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ))}

                {/* Legend */}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 14, rowGap: 8, marginTop: 16 }}>
                  <LegendDot color={colors.success} label="Present" />
                  <LegendDot color={colors.halfDay} label="Half Day" />
                  <LegendDot color={colors.swapLeave} label="Swap Leave" />
                  <LegendDot color={colors.paidLeave} label="Paid Leave" />
                  <LegendDot color={colors.danger} label="Unpaid Leave" />
                  <LegendDot color={colors.sundayTint} label="Sunday" />
                  <LegendDot color={colors.holidayGray} label="Holiday" />
                  <LegendDot color={colors.todaySoft} label="Today" outline />
                </View>
              </View>

              {/* Selected day detail */}
              <View
                style={{
                  marginTop: 16,
                  backgroundColor: colors.card,
                  borderRadius: radius.lg,
                  borderWidth: 1,
                  borderColor: colors.border,
                  padding: 18,
                  ...shadow.soft,
                }}>
                {!selectedKey ? (
                  <Text style={{ fontSize: 13, color: colors.textMuted }}>Tap a day to see its details.</Text>
                ) : (
                  <>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 12 }}>
                      {selectedDate.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' })}
                    </Text>
                    {isSelectedFuture ? (
                      <Text style={{ fontSize: 13, color: colors.textMuted }}>This day hasn&apos;t happened yet.</Text>
                    ) : selected ? (
                      <View style={{ gap: 10 }}>
                        <DetailRow label="Status" value={selected.status || 'no record'} capitalize />
                        <DetailRow label="Clock in" value={formatTime(selected.loginTime)} />
                        <DetailRow label="Clock out" value={formatTime(selected.logoutTime)} />
                      </View>
                    ) : (
                      <Text style={{ fontSize: 13, color: colors.textMuted }}>No attendance record for this day.</Text>
                    )}
                  </>
                )}
              </View>
            </ScrollView>
          )}
        </>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 12 }}>{annualYear}</Text>

          {annualError ? (
            <Text style={{ fontSize: 12, color: colors.danger, fontWeight: '500', marginBottom: 10 }}>
              {annualError} — showing an empty calendar.
            </Text>
          ) : null}

          {annualLoading ? (
            <View style={{ paddingVertical: 40, alignItems: 'center' }}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : (
            <View style={{ gap: 14 }}>
              {MONTH_SHORT.map((label, m) => {
                const mWeeks = buildMonthWeeks(annualYear, m);
                return (
                  <TouchableOpacity
                    key={label}
                    activeOpacity={0.8}
                    onPress={() => openMonthFromAnnual(m)}
                    style={{
                      backgroundColor: colors.card,
                      borderRadius: radius.lg,
                      borderWidth: 1,
                      borderColor: colors.border,
                      padding: 14,
                      ...shadow.soft,
                    }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 8 }}>{label}</Text>
                    <View style={{ flexDirection: 'row', marginBottom: 2 }}>
                      {WEEKDAYS.map((w, i) => (
                        <View key={`${label}-${w}-${i}`} style={{ flex: 1, alignItems: 'center' }}>
                          <Text style={{ fontSize: 9, color: i === 0 ? colors.danger : colors.textMuted, fontWeight: '700' }}>
                            {w}
                          </Text>
                        </View>
                      ))}
                    </View>
                    {mWeeks.map((week, wi) => (
                      <View key={wi} style={{ flexDirection: 'row' }}>
                        {week.map((date, di) => {
                          if (!date) return <View key={di} style={{ flex: 1, aspectRatio: 1, margin: 1 }} />;
                          const key = toDateKey(date);
                          const entry = annualRecords[key];
                          const isFuture = date > today;
                          const isToday = key === toDateKey(today);
                          const v = cellVisual(entry?.status, date.getDay(), isFuture);
                          return (
                            <View key={di} style={{ flex: 1, aspectRatio: 1, margin: 1 }}>
                              <View
                                style={{
                                  flex: 1,
                                  borderRadius: 6,
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  backgroundColor: v.bg === 'transparent' && isToday ? colors.todaySoft : v.bg,
                                  borderWidth: isToday ? 1 : 0,
                                  borderColor: colors.paidLeave,
                                }}>
                                <Text style={{ fontSize: 9, fontWeight: v.weight, color: v.text }}>{date.getDate()}</Text>
                              </View>
                            </View>
                          );
                        })}
                      </View>
                    ))}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Legend */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 14, rowGap: 8, marginTop: 16 }}>
            <LegendDot color={colors.success} label="Present" />
            <LegendDot color={colors.halfDay} label="Half Day" />
            <LegendDot color={colors.swapLeave} label="Swap Leave" />
            <LegendDot color={colors.paidLeave} label="Paid Leave" />
            <LegendDot color={colors.danger} label="Unpaid Leave" />
            <LegendDot color={colors.sundayTint} label="Sunday" />
            <LegendDot color={colors.holidayGray} label="Holiday" />
          </View>
        </ScrollView>
      )}
    </View>
  );
}

function LegendDot({ color, label, outline }: { color: string; label: string; outline?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <View
        style={{
          width: 10,
          height: 10,
          borderRadius: 3,
          backgroundColor: color,
          borderWidth: outline ? 1.5 : 0,
          borderColor: colors.paidLeave,
        }}
      />
      <Text style={{ fontSize: 11, color: colors.textMuted }}>{label}</Text>
    </View>
  );
}

function DetailRow({ label, value, capitalize }: { label: string; value: string; capitalize?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <Text style={{ fontSize: 13, color: colors.textMuted }}>{label}</Text>
      <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text, textTransform: capitalize ? 'capitalize' : 'none' }}>
        {value}
      </Text>
    </View>
  );
}