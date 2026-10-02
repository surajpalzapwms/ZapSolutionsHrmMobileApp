// src/components/ModuleList.jsx — lavender FlatList with the shared loading /
// error / empty states, used inside the Home quick-action sheets.
import React from "react";
import { FlatList, RefreshControl } from "react-native";
import { Loading, ErrorState, EmptyState } from "./ScreenStates";
import { colors } from "../theme/colors";

export default function ModuleList({
  loader,
  renderItem,
  emptyEmoji,
  emptyMessage,
  ListHeaderComponent,
  keyExtractor,
}) {
  const { items, loading, refreshing, error, refresh } = loader;

  if (loading) return <Loading />;
  if (error && !ListHeaderComponent) return <ErrorState message={error} />;

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: colors.screen }}
      data={items}
      keyExtractor={keyExtractor || ((item, idx) => item._id || item.id || String(idx))}
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
      ListHeaderComponent={ListHeaderComponent}
      ListEmptyComponent={<EmptyState emoji={emptyEmoji} message={emptyMessage} />}
      renderItem={renderItem}
      // Render a screenful first, the rest as you scroll — keeps long
      // lists (payroll, advances…) fast to open.
      initialNumToRender={10}
      maxToRenderPerBatch={10}
      windowSize={7}
      removeClippedSubviews
    />
  );
}
