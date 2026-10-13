// src/screens/ExpensesListScreen.jsx — every office expense (light bill,
// breakfast, rent, internet … every category), newest first.
// Category chips on top filter the list; the header shows the total of
// what is shown and a per-category breakdown.
import React, { useMemo, useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { officeExpenseService } from "../services/officeExpenseService";
import { useListLoader } from "../hooks/useListLoader";
import ModuleList from "../components/ModuleList";
import { ErrorState } from "../components/ScreenStates";
import { useAuth } from "../contexts/AuthContext";
import { Card, ListItem } from "../components/ModuleUI";
import { TotalsHeader } from "../components/StaffWise";
import { colors, radius } from "../theme/colors";
import { formatMoney, formatShortDate } from "../utils/format";

// Admin / super-admin only (a promoted admin also needs the "expenses"
// permission) — staff accounts never see this list, same as the website.
export default function ExpensesListScreen() {
  const { isAdmin, canAccess } = useAuth();
  if (!isAdmin || !canAccess("expenses")) {
    return <ErrorState message="You don't have access to this section." />;
  }
  return <ExpensesListContent />;
}

const categoryOf = (item) =>
  item.categoryName || (typeof item.category === "object" ? item.category?.name : null) || "Other";

const EMOJI = [
  [/light|electric|power/i, "💡"],
  [/break ?fast|food|lunch|snack|tea|coffee|meal/i, "🍳"],
  [/rent/i, "🏢"],
  [/internet|wifi|broadband|phone|mobile/i, "📶"],
  [/travel|petrol|fuel|cab|taxi/i, "🚕"],
  [/water/i, "💧"],
  [/stationery|print/i, "🖨"],
  [/clean/i, "🧹"],
];
const emojiFor = (cat) => EMOJI.find(([re]) => re.test(cat))?.[1] || "💸";

function ExpensesListContent() {
  const loader = useListLoader(() => officeExpenseService.getAll(), "Could not load expenses.");
  const [category, setCategory] = useState("All");

  const categories = useMemo(() => {
    const totals = new Map();
    loader.items.forEach((e) => {
      const c = categoryOf(e);
      totals.set(c, (totals.get(c) || 0) + (Number(e.amount) || 0));
    });
    return [...totals.entries()].sort((a, b) => b[1] - a[1]);
  }, [loader.items]);

  const items = useMemo(
    () =>
      (category === "All" ? [...loader.items] : loader.items.filter((e) => categoryOf(e) === category)).sort(
        (a, b) => new Date(b.date || 0) - new Date(a.date || 0),
      ),
    [loader.items, category],
  );
  const total = items.reduce((s, e) => s + (Number(e.amount) || 0), 0);

  return (
    <ModuleList
      loader={{ ...loader, items }}
      emptyEmoji="💸"
      emptyMessage="No expenses found."
      ListHeaderComponent={
        <View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
            {["All", ...categories.map(([c]) => c)].map((c) => {
              const active = c === category;
              return (
                <TouchableOpacity
                  key={c}
                  onPress={() => setCategory(c)}
                  style={{
                    marginRight: 8,
                    paddingHorizontal: 12,
                    paddingVertical: 7,
                    borderRadius: radius.pill,
                    borderWidth: 1,
                    borderColor: active ? colors.primary : colors.border,
                    backgroundColor: active ? colors.primary : colors.card,
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: "700", color: active ? "#fff" : colors.textMuted }}>
                    {c === "All" ? "All" : `${emojiFor(c)} ${c}`}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <TotalsHeader
            title={category === "All" ? "All office expenses" : category}
            items={[
              { label: "Total", value: formatMoney(total) },
              { label: "Entries", value: String(items.length) },
            ]}
          />

          {category === "All" && categories.length > 0 ? (
            <Card style={{ marginBottom: 12, paddingVertical: 8 }}>
              <Text style={{ fontSize: 11, fontWeight: "700", color: colors.primary, letterSpacing: 0.6, marginVertical: 4 }}>
                BY CATEGORY
              </Text>
              {categories.map(([c, amt]) => (
                <TouchableOpacity
                  key={c}
                  onPress={() => setCategory(c)}
                  style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 6 }}
                >
                  <Text style={{ fontSize: 13, color: colors.text }}>
                    {emojiFor(c)} {c}
                  </Text>
                  <Text style={{ fontSize: 13, fontWeight: "700", color: colors.text }}>{formatMoney(amt)}</Text>
                </TouchableOpacity>
              ))}
            </Card>
          ) : null}
        </View>
      }
      renderItem={({ item }) => {
        const cat = categoryOf(item);
        return (
          <ListItem
            emoji={emojiFor(cat)}
            emojiBg="#FEF3C7"
            title={cat}
            subtitle={[item.note, item.remarks, item.description].filter(Boolean).join(" · ") || undefined}
            meta={item.date ? formatShortDate(item.date) : undefined}
            right={<Text style={{ fontSize: 15, fontWeight: "800", color: colors.text }}>{formatMoney(item.amount)}</Text>}
          />
        );
      }}
    />
  );
}
