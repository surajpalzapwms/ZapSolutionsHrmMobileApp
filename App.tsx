import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { AuthProvider } from './src/contexts/AuthContext';
import RootNavigator from './src/navigation/RootNavigator';
// Registers the background presence task (must load before any component).
import './src/presence/backgroundPresence';

export default function App() {
  return (
    <SafeAreaProvider>
      {/* Top edge only — the custom tab bar handles the bottom inset itself. */}
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F4F3FB' }} edges={['top']}>
        <AuthProvider>
          <RootNavigator />
        </AuthProvider>
        <StatusBar style="dark" />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
