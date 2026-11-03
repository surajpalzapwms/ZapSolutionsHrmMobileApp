// src/screens/BirthdaysListScreen.jsx
// Opens when the user taps "Upcoming birthdays" on Home.
// Same format as the holiday list. Shows only birthdays from today to
// 31 Dec of the current year — once a birthday has passed it disappears.
// On the birthday itself (from 12:00 midnight India time) everyone except
// the birthday person gets a 🎉 Wish button that opens the party modal.
import React, { useState } from "react";
import { View } from "react-native";
import { getYearBirthdays } from "../services/celebrationService";
import { useAuth } from "../contexts/AuthContext";
import { useListLoader } from "../hooks/useListLoader";
import ModuleList from "../components/ModuleList";
import { ListItem } from "../components/ModuleUI";
import Avatar from "../components/Avatar";
import { WishButton } from "../components/BirthdayRow";
import { dayBadge, formatYMD } from "./HolidaysListScreen";

export default function BirthdaysListScreen() {
  const { user, isAdmin } = useAuth();
  const year = new Date().getFullYear();
  const loader = useListLoader(
    async () => ({ data: await getYearBirthdays({ isAdmin }) }),
    "Could not load birthdays."
  );
  // Wishes just sent from this list (until the next reload).
  const [patched, setPatched] = useState({});

  const isMine = (b) =>
    b.isSelf || (!!user?.name && b.name?.toLowerCase() === user.name.toLowerCase());

  return (
    <ModuleList
      loader={loader}
      extraData={patched}
      keyExtractor={(item, idx) => `${item.id}-${idx}`}
      emptyEmoji="🎂"
      emptyMessage={`No more birthdays left in ${year}.`}
      renderItem={({ item: raw }) => {
        const item = patched[raw.id] ? { ...raw, ...patched[raw.id] } : raw;
        const today = item.daysUntil === 0;
        return (
          <ListItem
            leading={<Avatar name={item.name} uri={item.photoUrl} size={44} self={isMine(item)} bg="#FCE7F3" color="#BE185D" />}
            title={`${item.name}${isMine(item) ? " (You)" : ""}`}
            subtitle={formatYMD(item.date)}
            meta={today && item.wishCount ? `🎉 ${item.wishCount} wish${item.wishCount === 1 ? "" : "es"} so far` : undefined}
            right={
              <View style={{ alignItems: "flex-end", gap: 6 }}>
                {dayBadge(item.daysUntil)}
                {today && !isMine(item) ? (
                  <WishButton
                    item={item}
                    compact
                    onWished={(u) => setPatched((cur) => ({ ...cur, [u.id]: { wishedByMe: true, wishCount: u.wishCount } }))}
                  />
                ) : null}
              </View>
            }
          />
        );
      }}
    />
  );
}
