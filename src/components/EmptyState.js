import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, spacing, radius, typography } from '../theme';
import { Button } from './Button';

export function EmptyState({ icon = 'leaf-outline', title, message, actionLabel, onAction, children }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.wrap, { borderColor: colors.border, backgroundColor: colors.surface }]}>
      <View style={[styles.icon, { backgroundColor: colors.primarySoft }]}>
        <Ionicons name={icon} size={26} color={colors.primary} />
      </View>
      <Text style={[typography.h3, { color: colors.text, textAlign: 'center' }]}>{title}</Text>
      {message ? (
        <Text style={[typography.small, { color: colors.textMuted, textAlign: 'center', lineHeight: 20 }]}>{message}</Text>
      ) : null}
      {children}
      {actionLabel && onAction ? (
        <Button onPress={onAction} variant="secondary" small style={{ marginTop: spacing.sm, alignSelf: 'center' }}>
          {actionLabel}
        </Button>
      ) : null}
    </View>
  );
}

export function LoadingState({ message = 'Cargando…' }) {
  const { colors } = useTheme();
  return (
    <View style={styles.loading}>
      <ActivityIndicator color={colors.primary} />
      <Text style={[typography.small, { color: colors.textMuted }]}>{message}</Text>
    </View>
  );
}

export function InlineLoader({ visible, message = 'Guardando…' }) {
  const { colors } = useTheme();
  if (!visible) return null;
  return (
    <View style={[styles.inline, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
      <ActivityIndicator size="small" color={colors.primary} />
      <Text style={[typography.small, { color: colors.textMuted }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  icon: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  loading: { padding: spacing.xl, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  inline: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
});
