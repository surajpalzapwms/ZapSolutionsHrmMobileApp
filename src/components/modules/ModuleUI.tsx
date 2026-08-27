import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

import { colors, radius, shadow } from '../../theme/colors';

/** Small pill shown at the top of every mock-data module so it's clear the numbers are samples. */
export function SampleDataBadge({ text = 'Sample data' }: { text?: string }) {
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        backgroundColor: colors.primarySoft,
        borderRadius: radius.pill,
        paddingHorizontal: 10,
        paddingVertical: 5,
        marginBottom: 14,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
      }}>
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary }} />
      <Text style={{ fontSize: 11, fontWeight: '700', color: colors.primary }}>{text}</Text>
    </View>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 10 }}>{children}</Text>;
}

export function Card({ children, style }: { children: ReactNode; style?: object }) {
  return (
    <View
      style={{
        backgroundColor: colors.card,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 16,
        ...shadow.soft,
        ...style,
      }}>
      {children}
    </View>
  );
}

export function Badge({ label, tone = 'primary' }: { label: string; tone?: 'primary' | 'success' | 'danger' | 'warning' }) {
  const map = {
    primary: { bg: colors.primarySoft, text: colors.primary },
    success: { bg: colors.successSoft, text: colors.success },
    danger: { bg: colors.dangerSoft, text: colors.danger },
    warning: { bg: '#FEF3E2', text: colors.warning },
  } as const;
  const c = map[tone];
  return (
    <View style={{ backgroundColor: c.bg, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 5 }}>
      <Text style={{ fontSize: 11, fontWeight: '700', color: c.text }}>{label}</Text>
    </View>
  );
}

export function Divider() {
  return <View style={{ height: 1, backgroundColor: colors.border }} />;
}

export function Row({
  left,
  right,
  bold,
  rightColor,
}: {
  left: string;
  right: string;
  bold?: boolean;
  rightColor?: string;
}) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 }}>
      <Text style={{ fontSize: 13, color: bold ? colors.text : colors.textMuted, fontWeight: bold ? '700' : '400' }}>
        {left}
      </Text>
      <Text style={{ fontSize: 13, color: rightColor ?? colors.text, fontWeight: bold ? '700' : '600' }}>{right}</Text>
    </View>
  );
}

export function StatBox({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.track,
        borderRadius: radius.md,
        paddingVertical: 12,
        alignItems: 'center',
      }}>
      <Text style={{ fontSize: 16, fontWeight: '700', color: valueColor || colors.text }}>{value}</Text>
      <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 2, textAlign: 'center' }}>{label}</Text>
    </View>
  );
}

export function EmojiIcon({ emoji, bg, size = 44 }: { emoji: string; bg: string; size?: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: radius.md,
        backgroundColor: bg,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Text style={{ fontSize: size * 0.45 }}>{emoji}</Text>
    </View>
  );
}