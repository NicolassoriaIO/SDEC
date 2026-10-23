import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme';

export function Logo({ size = 64, showName = false }) {
  const { colors } = useTheme();
  return (
    <View style={{ alignItems: 'center', gap: 10 }}>
      <View
        style={[
          styles.mark,
          {
            width: size,
            height: size,
            borderRadius: size * 0.28,
            backgroundColor: colors.primary,
            borderColor: colors.primaryDark,
          },
        ]}
        accessibilityLabel="Logotipo de SDEC"
      >
        <Text style={{ color: colors.primaryText, fontSize: size * 0.3, fontWeight: '900', letterSpacing: -1 }}>SDEC</Text>
        <View style={[styles.bar, { width: size * 0.48, backgroundColor: colors.primaryText }]} />
      </View>
      {showName ? (
        <View style={{ alignItems: 'center' }}>
          <Text style={{ color: colors.text, fontSize: 20, fontWeight: '900', letterSpacing: 1 }}>SDEC</Text>
          <Text style={{ color: colors.textMuted, fontSize: 11, textAlign: 'center' }}>Seguimiento de Ejercicio y Comida</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  mark: { alignItems: 'center', justifyContent: 'center', borderWidth: 1, gap: 4 },
  bar: { height: 3, borderRadius: 2, opacity: 0.8 },
});
