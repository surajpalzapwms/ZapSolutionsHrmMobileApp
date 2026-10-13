// src/screens/HolidaysListScreen.jsx
// Opens when the user taps "Upcoming holidays" on Home.
// Shows only holidays from today to 31 Dec of the current year — once a
// holiday is over it disappears from the list.
import React from "react";
import { getYearHolidays } from "../services/celebrationService";
import { useListLoader } from "../hooks/useListLoader";
import ModuleList from "../components/ModuleList";
import { Badge, ListItem } from "../components/ModuleUI";
import { SHORT_MONTHS } from "../utils/constants";

// "10 Oct 2026" from "YYYY-MM-DD", parsed as a LOCAL date (no timezone shift).
export function formatYMD(ymd) {
  const [y, m, d] = String(ymd).slice(0, 10).split("-").map(Number);
  if (!y) return "";
  return `${d} ${SHORT_MONTHS[(m || 1) - 1]} ${y}`;
}

export function dayBadge(diff) {
  if (diff === 0) return <Badge label="Today" tone="success" />;
  return <Badge label={diff === 1 ? "Tomorrow" : `in ${diff} days`} tone="primary" />;
}

export default function HolidaysListScreen() {
  const year = new Date().getFullYear();
  const loader = useListLoader(
    async () => ({ data: await getYearHolidays() }),
    "Could not load holidays."
  );

  return (
    <ModuleList
      loader={loader}
      keyExtractor={(item, idx) => `${item._id || item.date}-${idx}`}
      emptyEmoji="🏖️"
      emptyMessage={`No more holidays left in ${year}.`}
      renderItem={({ item }) => {
        // `date` is already moved to today for a holiday that has started,
        // so this shows only the remaining days (e.g. "10 Nov – 12 Nov").
        const range =
          item.endDate && item.endDate > item.date
            ? `${formatYMD(item.date)} – ${formatYMD(item.endDate)}`
            : formatYMD(item.date);
        return (
          <ListItem
            emoji={item.isSaturdayHoliday ? "🎊" : "🏖️"}
            emojiBg="#D1FAE5"
            title={item.name || "Holiday"}
            subtitle={range}
            right={dayBadge(item.daysUntil)}
          />
        );
      }}
    />
  );
}
