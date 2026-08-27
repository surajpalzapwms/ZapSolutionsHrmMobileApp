import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  ScrollView,
  Text,
  View,
} from 'react-native';

import { API_URL, getMyPayrolls, getStoredUser } from '../../../services/api';
import type { PayrollRecord } from '../../../services/api';
import { payrollSummary } from '../../data/mockData';
import { colors, radius } from '../../theme/colors';
import {
  Card,
  Divider,
  Row,
  SampleDataBadge,
  SectionTitle,
} from './ModuleUI';

const CURRENCY = '₹';

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

// Bigger row height + a 3-row-tall window (with the middle row centered)
// so the picker is actually easy to grab and scroll.
const ITEM_HEIGHT = 40;
const VISIBLE_ROWS = 3;
const PICKER_HEIGHT = ITEM_HEIGHT * VISIBLE_ROWS;
const SIDE_PADDING = ITEM_HEIGHT; // lets first/last item reach the center

function money(n: number) {
  return `${CURRENCY}${Math.round(n).toLocaleString('en-IN')}`;
}

function formatPeriod(period: string, short = false) {
  const [year, month] = period.split('-').map(Number);
  const name = MONTHS[(month || 1) - 1] || period;

  return `${short ? name.slice(0, 3) : name} ${year}`;
}

/**
 * "YYYY-MM" for the current month and previous 11 months.
 * Most recent month comes first.
 */
function lastTwelveMonths(): string[] {
  const now = new Date();
  const periods: string[] = [];

  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);

    periods.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    );
  }

  return periods;
}

type SummaryRow = {
  label: string;
  amount: number;
};

type PayrollView = {
  month: string;
  netPay: number;
  earnings: SummaryRow[];
  deductions: SummaryRow[];
  history: {
    month: string;
    amount: number;
  }[];
};

/**
 * Builds the view for one selected period's record,
 * plus a "recent payouts" list drawn from the other
 * fetched records.
 */
function recordToView(
  record: PayrollRecord,
  otherRecords: PayrollRecord[]
): PayrollView {
  const earnings: SummaryRow[] = [
    {
      label: 'Basic Salary',
      amount: record.adjustedBasicSalary ?? record.basicSalary,
    },

    ...(record.allowances ?? []).map((a) => ({
      label: a.type,
      amount: a.amount,
    })),
  ];

  const deductions: SummaryRow[] = [
    ...(record.deductions ?? []).map((d) => ({
      label: d.type,
      amount: d.amount,
    })),
  ];

  if (record.advanceDeduction && record.advanceDeduction > 0) {
    deductions.push({
      label: 'Advance recovery',
      amount: record.advanceDeduction,
    });
  }

  return {
    month: formatPeriod(record.period),
    netPay: record.netSalaryExact ?? record.netSalary,
    earnings,
    deductions,
    history: otherRecords.slice(0, 4).map((r) => ({
      month: formatPeriod(r.period, true),
      amount: r.netSalaryExact ?? r.netSalary,
    })),
  };
}

function mockToView(): PayrollView {
  return {
    month: payrollSummary.month,
    netPay: payrollSummary.netPay,
    earnings: payrollSummary.earnings,
    deductions: payrollSummary.deductions,
    history: payrollSummary.history,
  };
}

export default function PayrollPanel() {
  const months = useMemo(() => lastTwelveMonths(), []);

  const [records, setRecords] = useState<PayrollRecord[]>([]);

  const [selectedPeriod, setSelectedPeriod] = useState<string>(months[0]);

  const [loading, setLoading] = useState(true);

  const [usingSampleData, setUsingSampleData] = useState(false);

  // Temporary diagnostic
  const [debug, setDebug] = useState<string>('');

  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const user = await getStoredUser();

      try {
        const res = await getMyPayrolls();

        if (cancelled) {
          return;
        }

        const data = res.data ?? [];

        if (data.length > 0) {
          setRecords(data);
          // Sort records by period (newest first)
          const sortedData = [...data].sort((a, b) => 
            b.period.localeCompare(a.period)
          );
          setSelectedPeriod(sortedData[0].period);
        } else {
          setUsingSampleData(true);

          setDebug(
            `Connected to ${API_URL}, but 0 payroll rows for "${
              user?.email ?? 'unknown'
            }" ` +
              `(role: ${user?.role ?? '?'}). ` +
              `No Staff matches this email, or that staff has no payroll rows.`
          );
        }
      } catch (err) {
        if (cancelled) {
          return;
        }

        setUsingSampleData(true);

        setDebug(
          `Request to ${API_URL}/api/hrm/payroll failed: ` +
            `${err instanceof Error ? err.message : 'unknown error'}. ` +
            `Check the IP in .env, that the backend is running, and that you're logged in.`
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Get unique periods from records and sort them (newest first)
  const availableMonths = useMemo(() => {
    if (records.length === 0) {
      // If no records, use the last 12 months for sample data
      return usingSampleData ? months : [];
    }
    
    // Get unique periods from records
    const uniquePeriods = [...new Set(records.map(r => r.period))];
    // Sort by period (newest first)
    return uniquePeriods.sort((a, b) => b.localeCompare(a));
  }, [records, months, usingSampleData]);

  // Update selected period when records change
  useEffect(() => {
    if (availableMonths.length > 0 && !availableMonths.includes(selectedPeriod)) {
      setSelectedPeriod(availableMonths[0]);
    }
  }, [availableMonths, selectedPeriod]);

  const selectedRecord =
    records.find((r) => r.period === selectedPeriod) ?? null;

  const view: PayrollView | null = selectedRecord
    ? recordToView(
        selectedRecord,
        records.filter((r) => r.period !== selectedPeriod)
      )
    : usingSampleData && selectedPeriod === months[0]
    ? mockToView()
    : null;

  const totalEarnings = view
    ? view.earnings.reduce((sum, earning) => sum + earning.amount, 0)
    : 0;

  const totalDeductions = view
    ? view.deductions.reduce((sum, deduction) => sum + deduction.amount, 0)
    : 0;

  const resolveIndexFromOffset = (offsetY: number) => {
    const index = Math.round(offsetY / ITEM_HEIGHT);

    return Math.max(0, Math.min(availableMonths.length - 1, index));
  };

  const handleSettle = (
    e: NativeSyntheticEvent<NativeScrollEvent>
  ) => {
    const offsetY = e.nativeEvent.contentOffset.y;

    const index = resolveIndexFromOffset(offsetY);

    const period = availableMonths[index];

    if (period && period !== selectedPeriod) {
      setSelectedPeriod(period);
    }
  };

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          paddingVertical: 60,
        }}
      >
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  // If no months available and not using sample data, show a message
  if (availableMonths.length === 0 && !usingSampleData) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20,
        }}
      >
        <Text style={{ fontSize: 16, color: colors.textMuted, textAlign: 'center' }}>
          No payroll records found.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={{
        padding: 20,
        paddingBottom: 40,
      }}
      showsVerticalScrollIndicator={false}
    >
      {usingSampleData && <SampleDataBadge />}

      {/* Temporary diagnostic banner */}
      {debug ? (
        <View
          style={{
            backgroundColor: usingSampleData ? '#FEF3E2' : colors.successSoft,
            borderRadius: radius.md,
            padding: 10,
            marginBottom: 14,
          }}
        >
          <Text style={{ fontSize: 11, color: colors.text }}>
            {debug}
          </Text>
        </View>
      ) : null}

      <View
        style={{
          backgroundColor: colors.primary,
          borderRadius: radius.xl,
          padding: 20,
          marginBottom: 18,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
          }}
        >
          {/* LEFT SIDE */}
          <View
            style={{
              flex: 1,
              paddingRight: 20,
            }}
          >
            {/* Net Pay */}
            <View
              style={{
                marginBottom: 18,
              }}
            >
              <Text
                style={{
                  color: '#fff',
                  opacity: 0.85,
                  fontSize: 12,
                  fontWeight: '600',
                }}
              >
                Net pay
              </Text>

              <Text
                style={{
                  color: '#fff',
                  fontSize: 32,
                  fontWeight: '800',
                  marginTop: 4,
                }}
              >
                {view ? money(view.netPay) : '—'}
              </Text>
            </View>

            {/* Earnings + Deductions SAME ROW */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'flex-start',
              }}
            >
              {/* Earnings */}
              <View
                style={{
                  flex: 1,
                }}
              >
                <Text
                  style={{
                    color: '#fff',
                    opacity: 0.8,
                    fontSize: 11,
                    fontWeight: '600',
                  }}
                >
                  Earnings
                </Text>

                <Text
                  style={{
                    color: '#fff',
                    fontWeight: '700',
                    fontSize: 18,
                    marginTop: 3,
                  }}
                >
                  {money(totalEarnings)}
                </Text>
              </View>

              {/* Deductions */}
              <View
                style={{
                  flex: 1,
                }}
              >
                <Text
                  style={{
                    color: '#fff',
                    opacity: 0.8,
                    fontSize: 11,
                    fontWeight: '600',
                  }}
                >
                  Deductions
                </Text>

                <Text
                  style={{
                    color: '#ff6b6b',
                    fontWeight: '700',
                    fontSize: 18,
                    marginTop: 3,
                  }}
                >
                  {money(totalDeductions)}
                </Text>
              </View>
            </View>
          </View>

          {/* RIGHT SIDE - MONTH PICKER */}
          {availableMonths.length > 0 && (
            <View
              style={{
                height: Math.min(PICKER_HEIGHT, availableMonths.length * ITEM_HEIGHT + SIDE_PADDING * 2),
                width: 100,
                borderRadius: radius.lg,
                backgroundColor: 'rgba(255,255,255,0.14)',
                overflow: 'hidden',
                flexShrink: 0,
              }}
            >
              {/* Highlight band behind the centered row */}
              <View
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  top: ITEM_HEIGHT,
                  left: 6,
                  right: 6,
                  height: ITEM_HEIGHT,
                  borderRadius: radius.md,
                  backgroundColor: 'rgba(255,255,255,0.16)',
                }}
              />

              <ScrollView
                ref={scrollRef}
                showsVerticalScrollIndicator={false}
                snapToInterval={ITEM_HEIGHT}
                decelerationRate="fast"
                nestedScrollEnabled={Platform.OS === 'android'}
                onMomentumScrollEnd={handleSettle}
                onScrollEndDrag={handleSettle}
                contentContainerStyle={{
                  paddingVertical: SIDE_PADDING,
                }}
              >
                {availableMonths.map((item) => {
                  const active = item === selectedPeriod;

                  return (
                    <View
                      key={item}
                      style={{
                        height: ITEM_HEIGHT,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text
                        style={{
                          fontSize: active ? 15 : 12,
                          fontWeight: active ? '800' : '500',
                          color: active
                            ? '#fff'
                            : 'rgba(255,255,255,0.5)',
                        }}
                      >
                        {formatPeriod(item)}
                      </Text>
                    </View>
                  );
                })}
              </ScrollView>
            </View>
          )}
        </View>
      </View>

      {view ? (
        <>
          {/* Earnings */}
          <SectionTitle>Earnings</SectionTitle>

          <Card style={{ marginBottom: 18 }}>
            {view.earnings.map((earning, index) => (
              <View key={`${earning.label}-${index}`}>
                <Row
                  left={earning.label}
                  right={money(earning.amount)}
                />

                {index < view.earnings.length - 1 && <Divider />}
              </View>
            ))}
          </Card>

          {/* Deductions */}
          {view.deductions.length > 0 && (
            <>
              <SectionTitle>Deductions</SectionTitle>

              <Card style={{ marginBottom: 18 }}>
                {view.deductions.map((deduction, index) => (
                  <View key={`${deduction.label}-${index}`}>
                    <View
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        paddingVertical: 8,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 14,
                          color: colors.text,
                        }}
                      >
                        {deduction.label}
                      </Text>
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: '600',
                          color: '#ff6b6b',
                        }}
                      >
                        {money(deduction.amount)}
                      </Text>
                    </View>

                    {index < view.deductions.length - 1 && <Divider />}
                  </View>
                ))}
              </Card>
            </>
          )}

          {/* Recent Payouts */}
          {view.history.length > 0 && (
            <>
              <SectionTitle>Recent payouts</SectionTitle>

              <Card>
                {view.history.map((history, index) => (
                  <View key={history.month}>
                    <Row
                      left={history.month}
                      right={money(history.amount)}
                    />

                    {index < view.history.length - 1 && <Divider />}
                  </View>
                ))}
              </Card>
            </>
          )}
        </>
      ) : (
        <Card>
          <Text
            style={{
              fontSize: 13,
              color: colors.textMuted,
              textAlign: 'center',
              paddingVertical: 24,
            }}
          >
            No payroll record for {formatPeriod(selectedPeriod)}.
          </Text>
        </Card>
      )}
    </ScrollView>
  );
}