import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, radius, typography } from '../theme';
import { addDays, formatDateEs, isToday, todayKey } from '../utils/date';

export function DateStepper({ date, onChange, allowFuture = false }) {
  const { colors } = useTheme();
  const nextDisabled = !allowFuture && date >= todayKey();
  return (
    <View style={[styles.wrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Pressable
        onPress={() => onChange(addDays(date, -1))}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Día anterior"
        style={({ pressed }) => [styles.arrow, { opacity: pressed ? 0.6 : 1 }]}
      >
        <Ionicons name="chevron-back" size={20} color={colors.text} />
      </Pressable>
      <Pressable onPress={() => onChange(todayKey())} accessibilityRole="button" style={{ flex: 1, alignItems: 'center' }}>
        <Text style={[typography.small, { color: colors.text, fontWeight: '800' }]}>
          {isToday(date) ? 'Hoy' : formatDateEs(date, { weekday: 'short' })}
        </Text>
        <Text style={[typography.tiny, { color: colors.textMuted, fontWeight: '500', textTransform: 'none', letterSpacing: 0 }]}>
          {formatDateEs(date, { year: 'numeric' })}
        </Text>
      </Pressable>
      <Pressable
        onPress={() => !nextDisabled && onChange(addDays(date, 1))}
        disabled={nextDisabled}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Día siguiente"
        style={({ pressed }) => [styles.arrow, { opacity: nextDisabled ? 0.25 : pressed ? 0.6 : 1 }]}
      >
        <Ionicons name="chevron-forward" size={20} color={colors.text} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  arrow: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
});
