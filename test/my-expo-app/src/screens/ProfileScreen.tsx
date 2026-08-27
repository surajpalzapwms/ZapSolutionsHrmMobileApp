import { Text, TouchableOpacity, View } from 'react-native';

import type { AuthUser } from '../../services/api';
import BrandHeader from '../components/BrandHeader';
import { colors, radius, shadow } from '../theme/colors';

function initials(name: string) {
  return (name || '?')
    .split(' ')
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

const ROWS: { label: string; key: keyof AuthUser }[] = [
  { label: 'Full name', key: 'name' },
  { label: 'Email', key: 'email' },
  { label: 'Role', key: 'role' },
];

export default function ProfileScreen({ user, onLogout }: { user: AuthUser; onLogout: () => void }) {
  return (
    <View className="flex-1 bg-white px-5 pt-8">
      <BrandHeader title="Profile" />

      <View style={{ alignItems: 'center', marginBottom: 24 }}>
        <View
          style={{
            width: 84,
            height: 84,
            borderRadius: 42,
            backgroundColor: colors.primarySoft,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 12,
          }}>
          <Text style={{ fontSize: 28, fontWeight: '700', color: colors.primary }}>{initials(user.name)}</Text>
        </View>
        <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>{user.name}</Text>
        <Text style={{ fontSize: 13, color: colors.textMuted, textTransform: 'capitalize', marginTop: 2 }}>
          {user.role.replace('-', ' ')}
        </Text>
      </View>

      <View
        style={{
          backgroundColor: colors.card,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: colors.border,
          paddingHorizontal: 18,
          ...shadow.soft,
        }}>
        {ROWS.map((row, i) => (
          <View
            key={row.key}
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              paddingVertical: 14,
              borderBottomWidth: i < ROWS.length - 1 ? 1 : 0,
              borderBottomColor: colors.border,
            }}>
            <Text style={{ fontSize: 13, color: colors.textMuted }}>{row.label}</Text>
            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text, textTransform: row.key === 'role' ? 'capitalize' : 'none' }}>
              {String(user[row.key]).replace('-', ' ')}
            </Text>
          </View>
        ))}
      </View>

      <TouchableOpacity
        onPress={onLogout}
        activeOpacity={0.85}
        style={{
          flexDirection: 'row',
          alignSelf: 'center',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          marginTop: 28,
          paddingHorizontal: 28,
          paddingVertical: 13,
          borderRadius: radius.pill,
          backgroundColor: colors.danger,
          ...shadow.soft,
        }}>
        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Log out</Text>
      </TouchableOpacity>
    </View>
  );
}