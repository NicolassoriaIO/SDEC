import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, spacing, radius, typography } from '../theme';

export function Button({
  children,
  onPress,
  variant = 'primary',
  icon,
  disabled = false,
  loading = false,
  style,
  small = false,
  full = true,
  accessibilityLabel,
}) {
  const { colors } = useTheme();
  const variants = {
    primary: { bg: colors.primary, border: colors.primary, text: colors.primaryText },
    secondary: { bg: colors.surfaceAlt, border: colors.border, text: colors.text },
    outline: { bg: 'transparent', border: colors.border, text: colors.text },
    ghost: { bg: 'transparent', border: 'transparent', text: colors.textMuted },
    danger: { bg: colors.dangerSoft, border: colors.danger, text: colors.danger },
    success: { bg: colors.successSoft, border: colors.accent, text: colors.accent },
  };
  const palette = variants[variant] || variants.primary;
  const inactive = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || (typeof children === 'string' ? children : undefined)}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: palette.bg,
          borderColor: palette.border,
          opacity: inactive ? 0.5 : pressed ? 0.82 : 1,
          paddingVertical: small ? 8 : 13,
          paddingHorizontal: small ? spacing.md : spacing.lg,
          alignSelf: full ? 'stretch' : 'flex-start',
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={palette.text} />
      ) : (
        <View style={styles.content}>
          {icon ? <Ionicons name={icon} size={small ? 16 : 19} color={palette.text} /> : null}
          <Text
            style={[
              small ? typography.small : typography.body,
              { color: palette.text, fontWeight: '800', textAlign: 'center' },
            ]}
            numberOfLines={1}
          >
            {children}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

export function IconButton({ icon, onPress, color, size = 20, variant = 'soft', accessibilityLabel, style, disabled }) {
  const { colors } = useTheme();
  const bg = variant === 'soft' ? colors.surfaceAlt : 'transparent';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        styles.icon,
        { backgroundColor: bg, opacity: disabled ? 0.4 : pressed ? 0.7 : 1 },
        style,
      ]}
    >
      <Ionicons name={icon} size={size} color={color || colors.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  content: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  icon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
});
