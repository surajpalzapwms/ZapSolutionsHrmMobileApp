// src/screens/HolidaysListScreen.jsx
import React from "react";
import { holidayService } from "../services/holidayService";
import { useListLoader } from "../hooks/useListLoader";
import ModuleList from "../components/ModuleList";
import { Badge, ListItem } from "../components/ModuleUI";
import { formatShortDate } from "../utils/format";

function daysUntil(dateStr) {
  const [y, m, d] = String(dateStr).slice(0, 10).split("-").map(Number);
  const target = new Date(y, (m || 1) - 1, d || 1);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target - today) / 86400000);
}

export default function HolidaysListScreen() {
  const year = new Date().getFullYear();
  const loader = useListLoader(() => holidayService.getAll({ year }), "Could not load holidays.");

  const sorted = {
    ...loader,
    items: [...loader.items].sort((a, b) =>
      String(a.startDate || a.date).localeCompare(String(b.startDate || b.date))
    ),
  };

  return (
    <ModuleList
      loader={sorted}
      emptyEmoji="🏖️"
      emptyMessage={`No holidays found for ${year}.`}
      renderItem={({ item }) => {
        const start = item.startDate || item.date;
        const end = item.endDate;
        const range =
          end && String(end).slice(0, 10) !== String(start).slice(0, 10)
            ? `${formatShortDate(start)} – ${formatShortDate(end)}`
            : formatShortDate(start);
        const diff = start ? daysUntil(start) : null;
        const past = diff !== null && diff < 0;
        return (
          <ListItem
            emoji="🏖️"
            emojiBg={past ? "#F3F4F6" : "#D1FAE5"}
            title={item.name || item.title || "Holiday"}
            subtitle={range}
            right={
              diff === null ? null : diff === 0 ? (
                <Badge label="Today" tone="success" />
              ) : diff > 0 ? (
                <Badge label={diff === 1 ? "Tomorrow" : `in ${diff} days`} tone="primary" />
              ) : (
                <Badge label="Done" tone="muted" />
              )
            }
          />
        );
      }}
    />
  );
}
