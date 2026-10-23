import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, spacing, radius, typography } from '../theme';

export function StatCard({
  label,
  value,
  unit,
  icon,
  sub,
  tone = 'default',
  onPress,
  style,
  valueColor,
  compact = false,
}) {
  const { colors } = useTheme();
  const tones = {
    default: colors.surface,
    alt: colors.surfaceAlt,
    primary: colors.primarySoft,
    success: colors.successSoft,
    warning: colors.warningSoft,
    danger: colors.dangerSoft,
    water: colors.water + '18',
  };
  const content = (
    <View
      style={[
        styles.card,
        {
          backgroundColor: tones[tone] || colors.surface,
          borderColor: colors.border,
          padding: compact ? spacing.md : spacing.lg,
        },
        style,
      ]}
    >
      <View style={styles.top}>
        {icon ? <Ionicons name={icon} size={17} color={valueColor || colors.textMuted} /> : <View />}
        <Text style={[typography.tiny, { color: colors.textMuted, flex: 1, marginLeft: icon ? 6 : 0 }]} numberOfLines={1}>
          {String(label || '').toUpperCase()}
        </Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 3, marginTop: spacing.sm }}>
        <Text style={[compact ? typography.h3 : typography.h2, { color: valueColor || colors.text }]} numberOfLines={1} adjustsFontSizeToFit>
          {value}
        </Text>
        {unit ? <Text style={[typography.small, { color: colors.textMuted }]}>{unit}</Text> : null}
      </View>
      {sub ? (
        <Text style={[typography.small, { color: colors.textMuted, marginTop: 2 }]} numberOfLines={2}>
          {sub}
        </Text>
      ) : null}
    </View>
  );
  if (!onPress) return content;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, borderWidth: 1, flex: 1, minWidth: 0 },
  top: { flexDirection: 'row', alignItems: 'center' },
});
