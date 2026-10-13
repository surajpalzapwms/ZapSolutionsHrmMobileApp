// src/screens/BirthdaysListScreen.jsx
// Opens when the user taps "Upcoming birthdays" on Home.
// Same format as the holiday list. Shows only birthdays from today to
// 31 Dec of the current year — once a birthday has passed it disappears.
import React from "react";
import { getYearBirthdays } from "../services/celebrationService";
import { useAuth } from "../contexts/AuthContext";
import { useListLoader } from "../hooks/useListLoader";
import ModuleList from "../components/ModuleList";
import { ListItem } from "../components/ModuleUI";
import Avatar from "../components/Avatar";
import { dayBadge, formatYMD } from "./HolidaysListScreen";

export default function BirthdaysListScreen() {
  const { user, isAdmin } = useAuth();
  const year = new Date().getFullYear();
  const loader = useListLoader(
    async () => ({ data: await getYearBirthdays({ isAdmin }) }),
    "Could not load birthdays."
  );

  const isMine = (b) =>
    b.isSelf || (!!user?.name && b.name?.toLowerCase() === user.name.toLowerCase());

  return (
    <ModuleList
      loader={loader}
      keyExtractor={(item, idx) => `${item.id}-${idx}`}
      emptyEmoji="🎂"
      emptyMessage={`No more birthdays left in ${year}.`}
      renderItem={({ item }) => (
        <ListItem
          leading={<Avatar name={item.name} uri={item.photoUrl} size={44} self={isMine(item)} bg="#FCE7F3" color="#BE185D" />}
          title={`${item.name}${isMine(item) ? " (You)" : ""}`}
          subtitle={formatYMD(item.date)}
          right={dayBadge(item.daysUntil)}
        />
      )}
    />
  );
}
