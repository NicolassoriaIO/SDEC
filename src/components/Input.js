import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, spacing, radius, typography } from '../theme';

export function Input({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  hint,
  keyboardType = 'default',
  secureTextEntry,
  multiline = false,
  numberOfLines,
  required = false,
  icon,
  right,
  style,
  autoCapitalize,
  maxLength,
  editable = true,
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.wrap, style]}>
      {label ? (
        <Text style={[typography.label, { color: colors.textMuted, marginBottom: 6 }]}>
          {label}
          {required ? <Text style={{ color: colors.danger }}> *</Text> : null}
        </Text>
      ) : null}
      <View
        style={[
          styles.field,
          {
            backgroundColor: colors.input,
            borderColor: error ? colors.danger : colors.border,
            alignItems: multiline ? 'flex-start' : 'center',
            minHeight: multiline ? 96 : 48,
            opacity: editable ? 1 : 0.6,
          },
        ]}
      >
        {icon ? <Ionicons name={icon} size={18} color={colors.textMuted} style={{ marginLeft: spacing.md }} /> : null}
        <TextInput
          value={value === null || value === undefined ? '' : String(value)}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textSubtle}
          keyboardType={keyboardType}
          secureTextEntry={secureTextEntry}
          multiline={multiline}
          numberOfLines={numberOfLines}
          editable={editable}
          maxLength={maxLength}
          autoCapitalize={autoCapitalize}
          style={[
            typography.body,
            {
              flex: 1,
              color: colors.text,
              paddingHorizontal: spacing.md,
              paddingVertical: multiline ? spacing.md : 0,
              textAlignVertical: multiline ? 'top' : 'center',
              minHeight: multiline ? 92 : 46,
            },
          ]}
        />
        {right}
      </View>
      {error ? <Text style={[typography.small, { color: colors.danger, marginTop: 4 }]}>{error}</Text> : null}
      {!error && hint ? <Text style={[typography.small, { color: colors.textSubtle, marginTop: 4 }]}>{hint}</Text> : null}
    </View>
  );
}

export function SelectField({ label, value, options, onChange, placeholder = 'Seleccionar', error, required, hint }) {
  const { colors } = useTheme();
  return (
    <View style={styles.wrap}>
      {label ? (
        <Text style={[typography.label, { color: colors.textMuted, marginBottom: 6 }]}>
          {label}
          {required ? <Text style={{ color: colors.danger }}> *</Text> : null}
        </Text>
      ) : null}
      <View style={styles.options}>
        {options.map((option) => {
          const key = option.key ?? option.value ?? option;
          const text = option.label ?? option;
          const active = Array.isArray(value) ? value.includes(key) : value === key;
          return (
            <Pressable
              key={String(key)}
              onPress={() => onChange(key)}
              style={({ pressed }) => [
                styles.option,
                {
                  backgroundColor: active ? colors.primarySoft : colors.input,
                  borderColor: active ? colors.primary : colors.border,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <Text style={[typography.small, { color: active ? colors.text : colors.textMuted, fontWeight: '700' }]}>
                {text}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {error ? <Text style={[typography.small, { color: colors.danger, marginTop: 4 }]}>{error}</Text> : null}
      {hint ? <Text style={[typography.small, { color: colors.textSubtle, marginTop: 4 }]}>{hint}</Text> : null}
    </View>
  );
}

export function Chips({ options, value, onChange, multiple = false }) {
  const { colors } = useTheme();
  return (
    <View style={styles.options}>
      {options.map((option) => {
        const key = option.key ?? option;
        const text = option.label ?? option;
        const active = Array.isArray(value) ? value.includes(key) : value === key;
        return (
          <Pressable
            key={String(key)}
            onPress={() => onChange(key)}
            style={({ pressed }) => [
              styles.chip,
              {
                borderColor: active ? colors.primary : colors.border,
                backgroundColor: active ? colors.primarySoft : 'transparent',
                opacity: pressed ? 0.8 : 1,
              },
            ]}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
          >
            <Text style={[typography.small, { color: active ? colors.text : colors.textMuted, fontWeight: active ? '800' : '600' }]}>
              {text}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Segmented({ options, value, onChange }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.segmented, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
      {options.map((option) => {
        const key = option.key ?? option;
        const label = option.label ?? option;
        const active = value === key;
        return (
          <Pressable
            key={String(key)}
            onPress={() => onChange(key)}
            style={({ pressed }) => [
              styles.segment,
              active && { backgroundColor: colors.primary },
              { opacity: pressed ? 0.8 : 1 },
            ]}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
          >
            <Text style={[typography.small, { color: active ? colors.primaryText : colors.textMuted, fontWeight: '800' }]}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.md },
  field: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  option: { borderWidth: 1, borderRadius: radius.pill, paddingVertical: 9, paddingHorizontal: spacing.md },
  chip: { borderWidth: 1, borderRadius: radius.pill, paddingVertical: 7, paddingHorizontal: spacing.md },
  segmented: { flexDirection: 'row', borderRadius: radius.md, borderWidth: 1, padding: 3 },
  segment: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: radius.sm },
});
