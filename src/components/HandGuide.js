import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Ellipse, G, Path, Rect } from 'react-native-svg';
import { useTheme, spacing, radius, typography } from '../theme';

function HandShape({ type, color }) {
  const common = { fill: color, opacity: 0.22, stroke: color, strokeWidth: 3, strokeLinejoin: 'round' };
  if (type === 'palma') {
    return (
      <Svg width={62} height={62} viewBox="0 0 100 100">
        <G>
          <Rect x="27" y="33" width="46" height="46" rx="15" {...common} />
          <Rect x="30" y="10" width="9" height="32" rx="4.5" {...common} />
          <Rect x="42" y="6" width="9" height="36" rx="4.5" {...common} />
          <Rect x="54" y="8" width="9" height="34" rx="4.5" {...common} />
          <Rect x="66" y="14" width="9" height="29" rx="4.5" {...common} />
          <Rect x="16" y="48" width="13" height="27" rx="6.5" transform="rotate(-30 22 61)" {...common} />
        </G>
      </Svg>
    );
  }
  if (type === 'puno') {
    return (
      <Svg width={62} height={62} viewBox="0 0 100 100">
        <Rect x="24" y="28" width="52" height="48" rx="20" {...common} />
        <Rect x="30" y="35" width="40" height="8" rx="4" fill={color} opacity={0.4} />
        <Rect x="30" y="48" width="40" height="8" rx="4" fill={color} opacity={0.4} />
        <Rect x="30" y="61" width="40" height="8" rx="4" fill={color} opacity={0.4} />
      </Svg>
    );
  }
  if (type === 'ahuecada') {
    return (
      <Svg width={62} height={62} viewBox="0 0 100 100">
        <Path d="M20 45 Q20 82 50 82 Q80 82 80 45 Q80 32 68 32 Q60 32 56 40 Q52 32 44 32 Q36 32 32 40 Q28 32 20 45 Z" {...common} />
        <Rect x="30" y="12" width="8" height="26" rx="4" {...common} />
        <Rect x="42" y="8" width="8" height="28" rx="4" {...common} />
        <Rect x="54" y="10" width="8" height="26" rx="4" {...common} />
        <Rect x="66" y="16" width="8" height="22" rx="4" {...common} />
      </Svg>
    );
  }
  return (
    <Svg width={62} height={62} viewBox="0 0 100 100">
      <G>
        <Ellipse cx="52" cy="54" rx="20" ry="26" {...common} />
        <Rect x="22" y="40" width="16" height="36" rx="8" transform="rotate(-25 30 58)" {...common} />
        <Rect x="36" y="22" width="14" height="24" rx="7" transform="rotate(-18 43 34)" {...common} />
        <Rect x="44" y="14" width="12" height="20" rx="6" transform="rotate(-45 50 24)" {...common} />
      </G>
    </Svg>
  );
}

export function HandGuideCard({ item }) {
  const { colors } = useTheme();
  const iconMap = {
    palma: 'palma',
    puno: 'puno',
    ahuecada: 'ahuecada',
    pulgar: 'pulgar',
  };
  const type = item.visual.toLowerCase().includes('pulgar')
    ? 'pulgar'
    : item.visual.toLowerCase().includes('ahuecada')
      ? 'ahuecada'
      : item.visual.toLowerCase().includes('puño')
        ? 'puno'
        : 'palma';
  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={[styles.diagram, { backgroundColor: colors.surfaceAlt }]}>
        <HandShape type={iconMap[type] || 'palma'} color={colors.primary} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[typography.small, { color: colors.text, fontWeight: '800' }]}>{item.food}</Text>
        <Text style={[typography.small, { color: colors.textMuted }]}>
          {item.visual}: <Text style={{ color: colors.primary, fontWeight: '800' }}>{item.grams}</Text>
        </Text>
        <Text style={[typography.tiny, { color: colors.textSubtle, textTransform: 'none', letterSpacing: 0, lineHeight: 15 }]}>
          {item.note}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', gap: spacing.md, borderRadius: radius.lg, borderWidth: 1, padding: spacing.md, alignItems: 'center' },
  diagram: { width: 70, height: 70, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
});
