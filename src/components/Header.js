import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTheme, spacing, typography } from '../theme';

export function Header({ title, subtitle, back = false, right = null, onBack, large = false, style }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.wrap, style]}>
      <View style={styles.left}>
        {back ? (
          <Pressable
            onPress={onBack || (() => router.back())}
            style={({ pressed }) => [styles.back, { backgroundColor: colors.surfaceAlt, opacity: pressed ? 0.7 : 1 }]}
            hitSlop={10}
            accessibilityLabel="Volver"
            accessibilityRole="button"
          >
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </Pressable>
        ) : null}
        <View style={{ flexShrink: 1 }}>
          <Text
            style={[large ? typography.h1 : typography.h2, { color: colors.text }]}
            numberOfLines={2}
            accessibilityRole="header"
          >
            {title}
          </Text>
          {subtitle ? (
            <Text style={[typography.small, { color: colors.textMuted, marginTop: 2 }]} numberOfLines={2}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>
      {right ? <View style={{ marginLeft: spacing.sm }}>{right}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  back: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
});
