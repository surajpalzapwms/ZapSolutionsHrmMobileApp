import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';

export type TabKey = 'Home' | 'Analytics' | 'Activity' | 'Profile';

const TABS: { key: TabKey; label: string; emoji: string }[] = [
  { key: 'Home', label: 'Home', emoji: '🏠' },
  { key: 'Analytics', label: 'Analytics', emoji: '📊' },
  { key: 'Activity', label: 'Activity', emoji: '⏳' },
  { key: 'Profile', label: 'Profile', emoji: '👤' },
];

function TabButton({
  label,
  emoji,
  active,
  onPress,
}: {
  label: string;
  emoji: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity onPress={onPress} className="items-center gap-1 px-2 py-1" activeOpacity={0.7}>
      <Text className={active ? 'text-lg' : 'text-lg opacity-40'}>{emoji}</Text>
      <Text className={active ? 'text-[11px] font-semibold text-indigo-600' : 'text-[11px] text-gray-400'}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export default function BottomTabBar({
  activeTab,
  onChangeTab,
  hasClockedIn,
  hasClockedOut,
  actionLoading,
  onAttendPress,
}: {
  activeTab: TabKey;
  onChangeTab: (tab: TabKey) => void;
  hasClockedIn: boolean;
  hasClockedOut: boolean;
  actionLoading: boolean;
  onAttendPress: () => void;
}) {
  const attendDisabled = actionLoading || (hasClockedIn && hasClockedOut);

  return (
    <View className="flex-row items-center justify-between border-t border-gray-100 bg-white px-6 pb-2 pt-3">
      <TabButton
        label={TABS[0].label}
        emoji={TABS[0].emoji}
        active={activeTab === 'Home'}
        onPress={() => onChangeTab('Home')}
      />
      <TabButton
        label={TABS[1].label}
        emoji={TABS[1].emoji}
        active={activeTab === 'Analytics'}
        onPress={() => onChangeTab('Analytics')}
      />

      {/* Raised center button — always clocks in/out, regardless of active tab */}
      <TouchableOpacity
        disabled={attendDisabled}
        onPress={onAttendPress}
        activeOpacity={0.85}
        className="-mt-8 h-14 w-14 items-center justify-center rounded-full bg-indigo-600 shadow-lg shadow-indigo-600/40"
        style={attendDisabled ? { opacity: 0.5 } : undefined}>
        {actionLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text className="text-xl text-white">{hasClockedIn ? '⏻' : '👆'}</Text>
        )}
      </TouchableOpacity>

      <TabButton
        label={TABS[2].label}
        emoji={TABS[2].emoji}
        active={activeTab === 'Activity'}
        onPress={() => onChangeTab('Activity')}
      />
      <TabButton
        label={TABS[3].label}
        emoji={TABS[3].emoji}
        active={activeTab === 'Profile'}
        onPress={() => onChangeTab('Profile')}
      />
    </View>
  );
}
