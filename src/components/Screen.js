import React from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, spacing } from '../theme';

export function Screen({ children, scroll = false, padded = true, style, contentStyle, refreshControl, footer }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const base = { flex: 1, backgroundColor: colors.background };
  const content = [padded && { paddingHorizontal: spacing.lg }, contentStyle];
  if (scroll) {
    return (
      <KeyboardAvoidingView
        style={base}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        <ScrollView
          style={style}
          contentContainerStyle={[{ paddingTop: spacing.sm + insets.top, paddingBottom: spacing.xxl + insets.bottom }, content]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          refreshControl={refreshControl}
        >
          {children}
        </ScrollView>
        {footer}
      </KeyboardAvoidingView>
    );
  }
  return (
    <View style={[base, { paddingTop: insets.top }, style]}>
      <View style={[styles.fill, content]}>{children}</View>
      {footer}
    </View>
  );
}

export function Row({ children, style, gap = spacing.sm, wrap = false }) {
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap, flexWrap: wrap ? 'wrap' : 'nowrap' }, style]}>
      {children}
    </View>
  );
}

export function Spacer({ size = spacing.md }) {
  return <View style={{ height: size }} />;
}

export function Divider() {
  const { colors } = useTheme();
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginVertical: spacing.md }} />;
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
