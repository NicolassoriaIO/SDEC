import React from 'react';
import { Image, View, Text } from 'react-native';
import { useTheme } from '../theme';

const markSource = require('../../assets/logo-mark.png');

export function Logo({ size = 64, showName = false }) {
  const { colors } = useTheme();
  return (
    <View style={{ alignItems: 'center', gap: 10 }}>
      <Image
        source={markSource}
        style={{ width: size, height: size }}
        resizeMode="contain"
        accessibilityLabel="Logotipo de SDEC"
      />
      {showName ? (
        <View style={{ alignItems: 'center' }}>
          <Text style={{ color: colors.text, fontSize: 20, fontWeight: '900', letterSpacing: 1 }}>SDEC</Text>
          <Text style={{ color: colors.textMuted, fontSize: 11, textAlign: 'center' }}>Seguimiento de Ejercicio y Comida</Text>
        </View>
      ) : null}
    </View>
  );
}
