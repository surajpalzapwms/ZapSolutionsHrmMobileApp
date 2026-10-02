// src/components/MonthSummary.jsx
// Mobile version of the website's MonthSummaryPanel: for the month on
// screen it shows
//   • Paid Leave earned, left (GREEN) and taken (RED), with their ₹ value
//   • that month's salary
//   • advance(s) given in that month
//   • Total payable = Salary − Advance given
// Paid Leave is NOT added month by month. Only in the RELIEVING month of a
// staff member who has left, the Paid Leave left from ALL months (full &
// final encashment) is added:
//   Total payable = Salary + total Paid Leave left − Advance given
// `compact` — narrow version used in the calendar's right-hand column
// (Month view), next to the colour legend.
import React, { createContext, useContext } from "react";
import { Text, View } from "react-native";
import { colors, radius, shadow } from "../theme/colors";

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
export const money2 = (v) =>
  `₹${(Number(v) || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const days = (n) => {
  const v = round2(n);
  return `${v} day${v === 1 ? "" : "s"}`;
};
const shortDate = (value) => {
  const d = new Date(value);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

const CompactCtx = createContext(false);

function Line({ label, sub, value, color = colors.text, bold }) {
  const c = useContext(CompactCtx);
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        paddingVertical: c ? 2 : 4,
        gap: c ? 6 : 10,
      }}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: c ? 10 : 12, color: bold ? colors.text : colors.textMuted, fontWeight: bold ? "700" : "500" }}>
          {label}
        </Text>
        {sub ? <Text style={{ fontSize: c ? 9 : 10, color: colors.textMuted, marginTop: 1 }}>{sub}</Text> : null}
      </View>
      <Text style={{ fontSize: c ? 11 : 13, fontWeight: "700", color }}>{value}</Text>
    </View>
  );
}

function Section({ title, children, last }) {
  const c = useContext(CompactCtx);
  return (
    <View
      style={{
        paddingHorizontal: c ? 8 : 14,
        paddingVertical: c ? 6 : 10,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: colors.border,
      }}
    >
      <Text style={{ fontSize: c ? 9 : 10, fontWeight: "700", color: colors.textMuted, letterSpacing: 0.6, marginBottom: 2 }}>
        {title.toUpperCase()}
      </Text>
      {children}
    </View>
  );
}

function Muted({ children, color = colors.textMuted }) {
  const c = useContext(CompactCtx);
  return <Text style={{ fontSize: c ? 10 : 12, color, paddingVertical: c ? 2 : 4 }}>{children}</Text>;
}

export default function MonthSummary({
  monthLabel,
  pl,
  salary,
  salaryLoading,
  advances = [],
  advancesLoading,
  isRelievingMonth = false,
  finalPaidLeave = null, // { days, amount, months: [{ period, label, days, perDaySalary, amount }] }
  compact = false,
}) {
  const c = compact;
  const plLeftAmount = pl?.credited ? Number(pl.plLeftAmount ?? pl.amount) || 0 : 0;
  const plTakenAmount = pl?.credited ? Number(pl.plTakenAmount) || 0 : 0;
  const salaryAmount = salary ? Number(salary.netSalary) || 0 : 0;
  const advanceTotal = round2(advances.reduce((s, a) => s + (Number(a.amount) || 0), 0));
  const addPaidLeave = isRelievingMonth && !!finalPaidLeave;
  const finalPlAmount = addPaidLeave ? Number(finalPaidLeave.amount) || 0 : 0;
  const totalPayable = round2(salaryAmount + finalPlAmount - advanceTotal);

  return (
    <CompactCtx.Provider value={c}>
    <View
      style={{
        backgroundColor: colors.card,
        borderRadius: c ? 10 : radius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        overflow: "hidden",
        marginTop: c ? 0 : 14,
        ...(c ? null : shadow.soft),
      }}
    >
      <View style={{ backgroundColor: "#1F4A82", paddingHorizontal: c ? 8 : 14, paddingVertical: c ? 7 : 10 }}>
        <Text style={{ color: "#fff", fontSize: c ? 11 : 13, fontWeight: "700" }} numberOfLines={1}>
          {monthLabel} — Summary
        </Text>
      </View>

      <Section title="Paid Leave">
        {!pl ? (
          <Muted>No Paid Leave for this month (before confirmation).</Muted>
        ) : !pl.credited ? (
          <Muted color={colors.warning}>{pl.reason || "Not earned this month."}</Muted>
        ) : (
          <>
            <Line label={`Earned ${days(pl.plDays)}`} sub={`${money2(pl.perDaySalary)}/day`} value={money2(pl.amount)} />
            <Line label={`Left ${days(pl.plLeftDays)}`} value={money2(plLeftAmount)} color={colors.success} />
            <Line label={`Taken ${days(pl.plTakenDays)}`} value={money2(plTakenAmount)} color={colors.danger} />
          </>
        )}
      </Section>

      <Section title="Salary">
        {salaryLoading && !salary ? (
          <Muted>Loading…</Muted>
        ) : !salary ? (
          <Muted>No salary for this month.</Muted>
        ) : (
          <Line
            label={salary.isEstimate ? "Salary (estimate)" : `Salary (${salary.status || "saved"})`}
            sub={
              salary.payableDays != null && salary.totalDays != null
                ? `${salary.payableDays}/${salary.totalDays} days paid${salary.unpaidDays ? ` · ${salary.unpaidDays} unpaid` : ""}`
                : undefined
            }
            value={money2(salaryAmount)}
            color="#1E3A8A"
          />
        )}
        {Number(salary?.advanceDeduction) > 0 ? (
          <Text style={{ fontSize: 10, color: colors.textMuted }}>
            {money2(salary.advanceDeduction)} advance already recovered in this payroll
          </Text>
        ) : null}
      </Section>

      <Section title="Advance given">
        {advancesLoading ? (
          <Muted>Loading…</Muted>
        ) : advances.length === 0 ? (
          <Line label="No advance this month" value={money2(0)} color={colors.textMuted} />
        ) : (
          <>
            {advances.map((a, i) => (
              <Line
                key={a._id || i}
                label={shortDate(a.date)}
                sub={[a.reason, a.status].filter(Boolean).join(" · ") || undefined}
                value={money2(a.amount)}
                color="#EA580C"
              />
            ))}
            {advances.length > 1 ? <Line label="Total advance" value={money2(advanceTotal)} color="#EA580C" /> : null}
          </>
        )}
      </Section>

      <View style={{ backgroundColor: "#FFFBEB", paddingHorizontal: c ? 8 : 14, paddingVertical: c ? 8 : 12 }}>
        <Text style={{ fontSize: 10, fontWeight: "700", color: "#92400E", letterSpacing: 0.6, marginBottom: 4 }}>
          TOTAL PAYABLE
        </Text>
        <SmallRow label="Salary" value={money2(salaryAmount)} />
        {addPaidLeave ? (
          <>
            <SmallRow
              label={`+ Paid Leave (full & final, ${days(finalPaidLeave.days)})`}
              value={money2(finalPlAmount)}
              color={colors.success}
            />
            {(finalPaidLeave.months || []).map((m) => (
              <SmallRow
                key={m.period}
                indent
                label={`${m.label}: ${days(m.days)} × ${money2(m.perDaySalary)}`}
                value={money2(m.amount)}
              />
            ))}
          </>
        ) : null}
        <SmallRow label="− Advance given" value={money2(advanceTotal)} color="#EA580C" />
        {isRelievingMonth && !finalPaidLeave ? (
          <Text style={{ fontSize: 10, color: "#EA580C", marginTop: 2 }}>Loading full &amp; final Paid Leave…</Text>
        ) : null}
        <View
          style={{
            marginTop: 8,
            paddingTop: 8,
            borderTopWidth: 1,
            borderTopColor: "#FDE68A",
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "baseline",
          }}
        >
          <Text style={{ fontSize: c ? 11 : 13, fontWeight: "700", color: "#78350F" }}>{c ? "Total" : "Total payable"}</Text>
          <Text style={{ fontSize: c ? 13 : 18, fontWeight: "800", color: totalPayable < 0 ? colors.danger : "#78350F" }}>
            {money2(totalPayable)}
          </Text>
        </View>
      </View>
    </View>
    </CompactCtx.Provider>
  );
}

function SmallRow({ label, value, color = colors.textMuted, indent }) {
  const c = useContext(CompactCtx);
  const size = (indent ? 10 : 11) - (c ? 1 : 0);
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", paddingLeft: indent ? 10 : 0, paddingVertical: 1, gap: c ? 4 : 8 }}>
      <Text style={{ flex: 1, fontSize: size, color: colors.textMuted }}>{label}</Text>
      <Text style={{ fontSize: size, color }}>{value}</Text>
    </View>
  );
}
