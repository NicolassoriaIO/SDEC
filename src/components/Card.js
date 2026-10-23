import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, spacing, radius, typography } from '../theme';

export function Card({ children, style, onPress, tone = 'default', padding = 'md', accessibilityLabel }) {
  const { colors } = useTheme();
  const tones = {
    default: colors.surface,
    alt: colors.surfaceAlt,
    primary: colors.primarySoft,
    success: colors.successSoft,
    warning: colors.warningSoft,
    danger: colors.dangerSoft,
  };
  const paddingValue = padding === 'none' ? 0 : padding === 'sm' ? spacing.md : spacing.lg;
  const content = (
    <View
      style={[
        styles.card,
        { backgroundColor: tones[tone] || tones.default, borderColor: colors.border, padding: paddingValue },
        style,
      ]}
    >
      {children}
    </View>
  );
  if (!onPress) return content;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => ({ opacity: pressed ? 0.82 : 1 })}
    >
      {content}
    </Pressable>
  );
}

export function SectionTitle({ children, action, style }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.section, style]}>
      <Text style={[typography.h3, { color: colors.text, flex: 1 }]}>{children}</Text>
      {action}
    </View>
  );
}

export function KeyValue({ label, value, valueColor, compact = false }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.keyValue, compact && { paddingVertical: 2 }]}>
      <Text style={[typography.small, { color: colors.textMuted, flex: 1 }]}>{label}</Text>
      <Text style={[typography.small, { color: valueColor || colors.text, fontWeight: '700', textAlign: 'right' }]}>{value}</Text>
    </View>
  );
}

export function InfoBanner({ title, children, tone = 'info', icon = 'information-circle-outline' }) {
  const { colors } = useTheme();
  const toneColors = {
    info: colors.info,
    warning: colors.warning,
    danger: colors.danger,
    success: colors.accent,
  };
  const backgroundColor = {
    info: colors.info + '18',
    warning: colors.warningSoft,
    danger: colors.dangerSoft,
    success: colors.successSoft,
  };
  return (
    <View style={[styles.banner, { backgroundColor: backgroundColor[tone] || backgroundColor.info, borderColor: colors.border }]}>
      <Ionicons name={icon} size={20} color={toneColors[tone] || colors.info} style={{ marginTop: 1 }} />
      <View style={{ flex: 1 }}>
        {title ? <Text style={[typography.small, { color: colors.text, fontWeight: '800', marginBottom: 2 }]}>{title}</Text> : null}
        <Text style={[typography.small, { color: colors.textMuted, lineHeight: 19 }]}>{children}</Text>
      </View>
    </View>
  );
}


const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, borderWidth: 1 },
  section: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  keyValue: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4, gap: spacing.md },
  banner: {
    flexDirection: 'row',
    gap: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
    marginVertical: spacing.sm,
  },
});
