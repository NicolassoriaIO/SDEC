import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, spacing, radius, typography } from '../theme';

const TONES = {
  info: { icon: 'information-circle-outline' },
  success: { icon: 'checkmark-circle-outline' },
  warning: { icon: 'warning-outline' },
  danger: { icon: 'alert-circle-outline' },
  medical: { icon: 'medkit-outline' },
};

export function Notice({ tone = 'info', title, children, style, icon }) {
  const { colors } = useTheme();
  const palette = {
    info: { fg: colors.info, bg: colors.surfaceAlt, border: colors.border },
    success: { fg: colors.accent, bg: colors.successSoft, border: colors.accent },
    warning: { fg: colors.warning, bg: colors.warningSoft, border: colors.warning },
    danger: { fg: colors.danger, bg: colors.dangerSoft, border: colors.danger },
    medical: { fg: colors.info, bg: colors.surfaceAlt, border: colors.border },
  }[tone] || { fg: colors.info, bg: colors.surfaceAlt, border: colors.border };
  return (
    <View style={[styles.wrap, { backgroundColor: palette.bg, borderColor: palette.border }, style]}>
      <Ionicons name={icon || TONES[tone]?.icon || 'information-circle-outline'} size={18} color={palette.fg} style={{ marginTop: 1 }} />
      <View style={{ flex: 1, gap: 2 }}>
        {title ? <Text style={[typography.small, { color: colors.text, fontWeight: '800' }]}>{title}</Text> : null}
        {typeof children === 'string' ? (
          <Text style={[typography.small, { color: colors.textMuted, lineHeight: 19 }]}>{children}</Text>
        ) : (
          children
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', gap: spacing.sm, borderRadius: radius.md, borderWidth: 1, padding: spacing.md, alignItems: 'flex-start' },
});
