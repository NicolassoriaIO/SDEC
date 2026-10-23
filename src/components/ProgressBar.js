import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme, spacing, typography } from '../theme';
import { clamp, formatNumber } from '../utils/numbers';

export function ProgressBar({ value = 0, max = 100, color, height = 8, showLabel = false, label, suffix = '' }) {
  const { colors } = useTheme();
  const pct = clamp(max > 0 ? (value / max) * 100 : 0, 0, 100);
  return (
    <View style={{ gap: 4 }}>
      {showLabel ? (
        <View style={styles.row}>
          <Text style={[typography.small, { color: colors.textMuted }]}>{label}</Text>
          <Text style={[typography.small, { color: colors.text, fontWeight: '800' }]}>
            {formatNumber(value)} / {formatNumber(max)} {suffix}
          </Text>
        </View>
      ) : null}
      <View style={[styles.track, { backgroundColor: colors.surfaceStrong, height, borderRadius: height / 2 }]}>
        <View
          style={{
            width: `${pct}%`,
            height,
            borderRadius: height / 2,
            backgroundColor: color || colors.primary,
          }}
        />
      </View>
    </View>
  );
}

export function MacroBars({ calories, target, protein, carbs, fat, targets }) {
  const { colors } = useTheme();
  const items = [
    { label: 'Proteína', value: protein, max: targets?.protein || 0, color: colors.protein, unit: 'g' },
    { label: 'Carbohidratos', value: carbs, max: targets?.carbs || 0, color: colors.carbs, unit: 'g' },
    { label: 'Grasas', value: fat, max: targets?.fat || 0, color: colors.fat, unit: 'g' },
  ];
  return (
    <View style={{ gap: spacing.sm }}>
      {items.map((item) => (
        <View key={item.label} style={{ gap: 3 }}>
          <View style={styles.row}>
            <View style={styles.dotRow}>
              <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: item.color }} />
              <Text style={[typography.small, { color: colors.textMuted }]}>{item.label}</Text>
            </View>
            <Text style={[typography.small, { color: colors.text, fontWeight: '700' }]}>
              {formatNumber(item.value)} / {formatNumber(item.max)} {item.unit}
            </Text>
          </View>
          <ProgressBar value={item.value} max={item.max} color={item.color} height={5} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  track: { overflow: 'hidden', width: '100%' },
  dotRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
