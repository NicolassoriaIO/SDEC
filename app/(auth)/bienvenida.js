import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, spacing, radius, typography } from '../../src/theme';
import { Logo } from '../../src/components/Logo';
import { Button } from '../../src/components/Button';
import { APP_INFO } from '../../src/constants';

const FEATURES = [
  { icon: 'nutrition-outline', title: 'Comida real', text: 'Alimentos, recetas económicas, porciones y macros.' },
  { icon: 'barbell-outline', title: 'Entreno guiado', text: 'Rutinas, series, repeticiones y sobrecarga progresiva.' },
  { icon: 'trending-up-outline', title: 'Progreso honesto', text: 'Peso, pasos, medidas, agua y presupuesto semanal.' },
];

export default function WelcomeScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <View style={styles.hero}>
        <View style={[styles.glow, { backgroundColor: colors.primarySoft }]} />
        <Logo size={78} />
        <View style={{ gap: 8, marginTop: spacing.xl }}>
          <Text style={[styles.eyebrow, { color: colors.primary }]}>ENTRENA Y ALIMÉNTATE CON DATOS</Text>
          <Text style={[typography.h1, { color: colors.text, fontSize: 34, lineHeight: 40 }]}>
            Tu progreso,{'\n'}
            <Text style={{ color: colors.primary }}>sin excusas.</Text>
          </Text>
          <Text style={[typography.body, { color: colors.textMuted, lineHeight: 22, maxWidth: 330 }]}>
            SDEC reúne comida, entrenamiento, gasto y hábitos en una sola app. Funciona sin conexión y sin cuenta en la nube.
          </Text>
        </View>
      </View>

      <View style={styles.features}>
        {FEATURES.map((feature) => (
          <View key={feature.title} style={[styles.feature, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.featureIcon, { backgroundColor: colors.primarySoft }]}>
              <Ionicons name={feature.icon} size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[typography.small, { color: colors.text, fontWeight: '800' }]}>{feature.title}</Text>
              <Text style={[typography.small, { color: colors.textMuted, lineHeight: 18 }]}>{feature.text}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.actions}>
        <Button onPress={() => router.push('/(auth)/registro')} icon="person-add-outline">
          Crear mi cuenta
        </Button>
        <Button variant="secondary" onPress={() => router.push('/(auth)/login')} icon="log-in-outline">
          Ya tengo cuenta
        </Button>
        <Pressable onPress={() => router.push('/(auth)/recuperar')} style={{ alignSelf: 'center', padding: 6 }}>
          <Text style={[typography.small, { color: colors.textMuted }]}>¿Olvidaste tu contraseña?</Text>
        </Pressable>
        <View style={styles.offlineRow}>
          <Ionicons name="shield-checkmark-outline" size={13} color={colors.textSubtle} />
          <Text style={[typography.tiny, { color: colors.textSubtle, textTransform: 'none', letterSpacing: 0 }]}>
            100 % local: tus datos no salen del dispositivo
          </Text>
        </View>
        <Text style={[typography.tiny, { color: colors.textSubtle, textAlign: 'center', textTransform: 'none', letterSpacing: 0 }]}>
          {APP_INFO.name} v{APP_INFO.version} · No sustituye el consejo médico ni nutricional.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: spacing.xl, justifyContent: 'space-between' },
  hero: { alignItems: 'center', paddingTop: spacing.lg, position: 'relative' },
  glow: { position: 'absolute', width: 240, height: 240, borderRadius: 120, top: -80, opacity: 0.5 },
  eyebrow: { ...typography.label, textAlign: 'center' },
  features: { gap: spacing.sm, marginVertical: spacing.lg },
  feature: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderWidth: 1, borderRadius: radius.lg, padding: spacing.md },
  featureIcon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  actions: { gap: spacing.sm, paddingBottom: spacing.sm },
  offlineRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, marginTop: 2 },
});
