import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, spacing, radius, typography } from '../theme';
import { parseOptionalNumber } from '../utils/numbers';

export function QuantityStepper({
  label = 'Cantidad',
  value,
  onChangeText,
  step = 10,
  min = 1,
  max = 100000,
  unit = 'g',
  hint,
  autoFocus = false,
}) {
  const { colors } = useTheme();
  const current = parseOptionalNumber(value) ?? 0;

  function adjust(direction) {
    const base = Number.isFinite(current) ? current : 0;
    const next = Math.min(max, Math.max(min, Math.round((base + direction * step) * 100) / 100));
    onChangeText(String(next));
  }

  return (
    <View style={styles.wrap}>
      {label ? <Text style={[typography.label, { color: colors.textMuted, marginBottom: 6 }]}>{label}</Text> : null}
      <View style={[styles.row, { backgroundColor: colors.input, borderColor: colors.border }]}>
        <Pressable
          onPress={() => adjust(-1)}
          disabled={current <= min}
          accessibilityRole="button"
          accessibilityLabel={`Restar ${step} ${unit}`}
          style={({ pressed }) => [
            styles.stepButton,
            { backgroundColor: colors.surfaceAlt, opacity: current <= min ? 0.35 : pressed ? 0.7 : 1 },
          ]}
        >
          <Ionicons name="remove" size={22} color={colors.text} />
        </Pressable>
        <View style={styles.valueWrap}>
          <TextInput
            value={value === null || value === undefined ? '' : String(value)}
            onChangeText={onChangeText}
            keyboardType="decimal-pad"
            autoFocus={autoFocus}
            selectTextOnFocus
            style={[typography.h3, styles.input, { color: colors.text }]}
            accessibilityLabel={label}
          />
          <Text style={[typography.small, { color: colors.textSubtle }]}>{unit}</Text>
        </View>
        <Pressable
          onPress={() => adjust(1)}
          disabled={current >= max}
          accessibilityRole="button"
          accessibilityLabel={`Sumar ${step} ${unit}`}
          style={({ pressed }) => [
            styles.stepButton,
            { backgroundColor: colors.primarySoft, opacity: current >= max ? 0.35 : pressed ? 0.7 : 1 },
          ]}
        >
          <Ionicons name="add" size={22} color={colors.primary} />
        </Pressable>
      </View>
      {hint ? <Text style={[typography.small, { color: colors.textSubtle, marginTop: 4 }]}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius.md,
    minHeight: 54,
    overflow: 'hidden',
  },
  stepButton: {
    width: 54,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
  },
  valueWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  input: { minWidth: 64, paddingVertical: 0, textAlign: 'center' },
});
