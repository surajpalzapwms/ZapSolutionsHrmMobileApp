import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import './global.css';
import BottomTabBar from './src/components/BottomTabBar';
import type { TabKey } from './src/components/BottomTabBar';
import { useAttendance } from './src/hooks/useAttendance';
import ActivityScreen from './src/screens/ActivityScreen';
import AnalyticsScreen from './src/screens/AnalyticsScreen';
import HomeScreen from './src/screens/HomeScreen';
import LoginScreen from './src/screens/LoginScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import { clearSession, getStoredUser } from './services/api';
import type { AuthUser } from './services/api';

function AuthedApp({ user, onLogout }: { user: AuthUser; onLogout: () => void }) {
  const [activeTab, setActiveTab] = useState<TabKey>('Home');
  const attendance = useAttendance();

  async function handleAttendPress() {
    if (attendance.hasClockedIn) {
      await attendance.clockOut();
    } else {
      await attendance.clockIn();
    }
  }

  return (
    <View className="flex-1 bg-[#F4F3FB]">
      <View className="flex-1">
        {activeTab === 'Home' && (
          <HomeScreen
            user={user}
            onLogout={onLogout}
            attendance={attendance.attendance}
            list={attendance.list}
            loading={attendance.loading}
            refreshing={attendance.refreshing}
            actionLoading={attendance.actionLoading}
            error={attendance.error}
            hasClockedIn={attendance.hasClockedIn}
            hasClockedOut={attendance.hasClockedOut}
            onRefresh={attendance.refresh}
            onClockIn={attendance.clockIn}
            onClockOut={attendance.clockOut}
            onViewAllAttendance={() => setActiveTab('Activity')}
          />
        )}
        {activeTab === 'Analytics' && <AnalyticsScreen />}
        {activeTab === 'Activity' && (
          <ActivityScreen
            todayList={attendance.list}
            refreshing={attendance.refreshing}
            onRefresh={attendance.refresh}
          />
        )}
        {activeTab === 'Profile' && <ProfileScreen user={user} onLogout={onLogout} />}
      </View>

      <BottomTabBar
        activeTab={activeTab}
        onChangeTab={setActiveTab}
        hasClockedIn={attendance.hasClockedIn}
        hasClockedOut={attendance.hasClockedOut}
        actionLoading={attendance.actionLoading}
        onAttendPress={handleAttendPress}
      />
    </View>
  );
}

export default function App() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    getStoredUser()
      .then(setUser)
      .finally(() => setCheckingSession(false));
  }, []);

  async function handleLogout() {
    await clearSession();
    setUser(null);
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView className="flex-1 bg-[#F4F3FB]" edges={['top']}>
        {checkingSession ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#4F46E5" />
          </View>
        ) : user ? (
          <AuthedApp user={user} onLogout={handleLogout} />
        ) : (
          <LoginScreen onLoggedIn={setUser} />
        )}
        <StatusBar style="light" />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
