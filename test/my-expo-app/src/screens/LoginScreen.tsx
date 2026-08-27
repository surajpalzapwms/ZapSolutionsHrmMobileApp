import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import { login, saveSession } from '../../services/api';
import type { AuthUser } from '../../services/api';
import CornerLogo from '../components/CornerLogo';

export default function LoginScreen({ onLoggedIn }: { onLoggedIn: (user: AuthUser) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { width, height } = useWindowDimensions();
  const isTablet = width >= 768;
  const headerHeight = Math.max(height * 0.3, 200);
  const contentMaxWidth = isTablet ? 440 : undefined;

  // Half the previous size, flush against the header's top-left corner.
  const logoCardWidth = Math.min(width * 0.21, 85);

  async function handleSubmit() {
    if (!email || !password) {
      setError('Enter your email and password.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await login(email.trim(), password);
      const { token, ...user } = res.data;
      await saveSession(token, user);
      onLoggedIn(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View className="flex-1 bg-[#F4F3FB]">
      {/* Gradient header */}
      <LinearGradient
        colors={['#6C4EE0', '#8B5CF6', '#B968E0']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ height: headerHeight }}
        className="w-full rounded-b-[36px]">
        {/* Logo badge, flush against the header's top-left corner — shared
            CornerLogo component so every screen shows the same brand mark
            in the same spot. */}
        <CornerLogo size={logoCardWidth} />
      </LinearGradient>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
        style={{ marginTop: -32 }}>
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            alignItems: 'center',
            paddingBottom: 32,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View
            className="w-full rounded-t-[32px] bg-white px-6 pt-8 shadow-lg"
            style={{ maxWidth: contentMaxWidth, flexGrow: 1 }}>
            <Text className="text-2xl font-bold text-gray-900">Welcome Back</Text>
            <Text className="mt-1 text-sm text-gray-400">Enter your details below</Text>

            <View className="mt-8 gap-4">
              {/* Email field */}
              <View>
                <Text className="mb-1 ml-1 text-xs font-medium text-gray-500">Email Address</Text>
                <View className="flex-row items-center rounded-2xl border border-gray-200 bg-gray-50 px-4">
                  <Ionicons name="mail-outline" size={18} color="#9CA3AF" />
                  <TextInput
                    placeholder="you@zapwms.com"
                    placeholderTextColor="#B0B0C3"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    className="ml-2 flex-1 py-3.5 text-sm text-gray-900"
                  />
                </View>
              </View>

              {/* Password field */}
              <View>
                <Text className="mb-1 ml-1 text-xs font-medium text-gray-500">Password</Text>
                <View className="flex-row items-center rounded-2xl border border-gray-200 bg-gray-50 px-4">
                  <Ionicons name="lock-closed-outline" size={18} color="#9CA3AF" />
                  <TextInput
                    placeholder="••••••••"
                    placeholderTextColor="#B0B0C3"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    className="ml-2 flex-1 py-3.5 text-sm text-gray-900"
                  />
                  <TouchableOpacity onPress={() => setShowPassword((v) => !v)} hitSlop={10}>
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={18}
                      color="#9CA3AF"
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {error ? <Text className="mt-4 text-xs font-medium text-red-500">{error}</Text> : null}

            <TouchableOpacity
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.85}
              className="mt-7 overflow-hidden rounded-2xl">
              <LinearGradient
                colors={['#6C4EE0', '#B968E0']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                className="items-center py-4">
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="text-base font-semibold text-white">Sign In</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <Text className="mt-5 text-center text-xs text-gray-400">
              Trouble signing in? Contact your HR admin.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
