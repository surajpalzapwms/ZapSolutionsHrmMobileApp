// src/screens/ExpensesListScreen.jsx
import React from "react";
import { Text } from "react-native";
import { officeExpenseService } from "../services/officeExpenseService";
import { useListLoader } from "../hooks/useListLoader";
import ModuleList from "../components/ModuleList";
import { ErrorState } from "../components/ScreenStates";
import { useAuth } from "../contexts/AuthContext";
import { ListItem } from "../components/ModuleUI";
import { colors } from "../theme/colors";
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

function ExpensesListContent() {
  const loader = useListLoader(() => officeExpenseService.getAll(), "Could not load expenses.");

  return (
    <ModuleList
      loader={loader}
      emptyEmoji="🧾"
      emptyMessage="No expenses found."
      renderItem={({ item }) => {
        const category =
          item.categoryName || (typeof item.category === "object" ? item.category?.name : null);
        return (
          <ListItem
            emoji="🧾"
            emojiBg="#FEF3C7"
            title={category || item.title || "Expense"}
            subtitle={item.note || item.remarks || item.description || undefined}
            meta={item.date ? formatShortDate(item.date) : undefined}
            right={
              <Text style={{ fontSize: 15, fontWeight: "800", color: colors.text }}>
                {formatMoney(item.amount)}
              </Text>
            }
          />
        );
      }}
    />
  );
}
