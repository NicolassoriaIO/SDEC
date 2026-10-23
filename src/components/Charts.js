import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop, Text as SvgText } from 'react-native-svg';
import { useTheme, spacing, typography } from '../theme';
import { formatNumber } from '../utils/numbers';

function ChartPlaceholder({ message = 'Aún no hay datos suficientes.' }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.placeholder, { borderColor: colors.border }]}>
      <Text style={[typography.small, { color: colors.textMuted }]}>{message}</Text>
    </View>
  );
}

function niceMax(max) {
  if (!max || max <= 0) return 10;
  const magnitude = 10 ** Math.floor(Math.log10(max));
  return Math.ceil((max * 1.15) / magnitude) * magnitude;
}

export function LineChart({ data = [], height = 150, color, unit = '', showDots = true, fill = true, emptyMessage }) {
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);
  const values = data.map((item) => Number(item.value || 0));
  const maxValue = Math.max(...values, 0);
  if (!data.length || maxValue <= 0) return <ChartPlaceholder message={emptyMessage} />;
  const chartHeight = height - 26;
  const padTop = 10;
  const padBottom = 4;
  const max = niceMax(maxValue);
  const usableWidth = Math.max(width - 8, 1);
  const stepX = data.length > 1 ? usableWidth / (data.length - 1) : 0;
  const points = data.map((item, index) => {
    const x = 4 + index * stepX;
    const y = padTop + (1 - Number(item.value || 0) / max) * (chartHeight - padTop - padBottom);
    return { x, y, value: Number(item.value || 0), label: item.label };
  });
  const lineColor = color || colors.primary;
  const path = points.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(' ');
  const areaPath = `${path} L${points[points.length - 1].x.toFixed(1)},${chartHeight} L${points[0].x.toFixed(1)},${chartHeight} Z`;
  return (
    <View onLayout={(event) => setWidth(event.nativeEvent.layout.width)} style={{ height: height + 16 }}>
      {width > 0 ? (
        <Svg width={width} height={height}>
          <Defs>
            <LinearGradient id="lineFill" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={lineColor} stopOpacity="0.28" />
              <Stop offset="1" stopColor={lineColor} stopOpacity="0.01" />
            </LinearGradient>
          </Defs>
          {[0.25, 0.5, 0.75, 1].map((fraction) => (
            <Path
              key={fraction}
              d={`M4,${padTop + (chartHeight - padTop - padBottom) * fraction} L${width - 4},${padTop + (chartHeight - padTop - padBottom) * fraction}`}
              stroke={colors.border}
              strokeWidth={1}
              strokeDasharray="2 5"
            />
          ))}
          {fill ? <Path d={areaPath} fill="url(#lineFill)" /> : null}
          <Path d={path} stroke={lineColor} strokeWidth={2.4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          {showDots
            ? points.map((point, index) => (
                <Circle key={`dot-${index}`} cx={point.x} cy={point.y} r={2.8} fill={lineColor} />
              ))
            : null}
          {points.map((point, index) => {
            const show = data.length <= 8 || index === 0 || index === data.length - 1 || index % Math.ceil(data.length / 6) === 0;
            if (!show) return null;
            return (
              <SvgText
                key={`label-${index}`}
                x={Math.min(Math.max(point.x, 14), width - 14)}
                y={height - 2}
                fontSize="9"
                fill={colors.textMuted}
                textAnchor="middle"
              >
                {point.label || ''}
              </SvgText>
            );
          })}
          <SvgText x={4} y={chartHeight + 12} fontSize="9" fill={colors.textSubtle}>
            {formatNumber(max)} {unit}
          </SvgText>
        </Svg>
      ) : null}
    </View>
  );
}

export function BarChart({ data = [], height = 150, color, unit = '', target = null, emptyMessage }) {
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);
  const values = data.map((item) => Number(item.value || 0));
  const maxValue = Math.max(...values, target || 0, 0);
  if (!data.length || maxValue <= 0) return <ChartPlaceholder message={emptyMessage} />;
  const max = niceMax(maxValue);
  const chartHeight = height - 24;
  const barWidth = Math.max(4, Math.min(22, (width - 8) / data.length - 6));
  const gap = data.length > 1 ? (width - 8 - barWidth * data.length) / (data.length - 1) : 0;
  const targetY = target ? 8 + (1 - target / max) * (chartHeight - 20) : null;
  return (
    <View onLayout={(event) => setWidth(event.nativeEvent.layout.width)} style={{ height: height + 14 }}>
      {width > 0 ? (
        <Svg width={width} height={height}>
          {targetY ? (
            <Path
              d={`M4,${targetY} L${width - 4},${targetY}`}
              stroke={colors.primary}
              strokeWidth={1}
              strokeDasharray="4 4"
              opacity={0.65}
            />
          ) : null}
          {data.map((item, index) => {
            const value = Number(item.value || 0);
            const h = Math.max(value > 0 ? 3 : 0, (value / max) * (chartHeight - 20));
            const x = 4 + index * (barWidth + gap);
            const y = chartHeight - h;
            return (
              <React.Fragment key={`bar-${index}`}>
                <Rect x={x} y={y} width={barWidth} height={h} rx={Math.min(4, barWidth / 2)} fill={color || colors.primary} opacity={0.9} />
                {data.length <= 10 ? (
                  <SvgText x={x + barWidth / 2} y={height - 2} fontSize="8.5" fill={colors.textMuted} textAnchor="middle">
                    {item.label || ''}
                  </SvgText>
                ) : null}
              </React.Fragment>
            );
          })}
          <SvgText x={4} y={chartHeight + 10} fontSize="9" fill={colors.textSubtle}>
            {formatNumber(max)} {unit}
          </SvgText>
        </Svg>
      ) : null}
    </View>
  );
}

export function ProgressRing({ value = 0, max = 100, size = 126, strokeWidth = 10, color, centerLabel, centerValue }) {
  const { colors } = useTheme();
  const progress = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  const radiusValue = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radiusValue;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={size / 2} cy={size / 2} r={radiusValue} stroke={colors.surfaceStrong} strokeWidth={strokeWidth} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radiusValue}
          stroke={color || colors.primary}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={circumference * (1 - progress)}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <Text style={[typography.h2, { color: colors.text }]}>{centerValue}</Text>
      {centerLabel ? <Text style={[typography.tiny, { color: colors.textMuted, textTransform: 'none' }]}>{centerLabel}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 100,
  },
});
