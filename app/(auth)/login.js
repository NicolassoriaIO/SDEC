import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../src/components/Screen';
import { Header } from '../../src/components/Header';
import { Input } from '../../src/components/Input';
import { Button } from '../../src/components/Button';
import { Notice } from '../../src/components/Notice';
import { Logo } from '../../src/components/Logo';
import { useAuth } from '../../src/features/auth/AuthContext';
import { validateLogin } from '../../src/utils/validation';
import { useTheme, spacing, typography } from '../../src/theme';

export default function LoginScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { login } = useAuth();
  const [values, setValues] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');

  function setField(field, value) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setServerError('');
  }

  async function handleSubmit() {
    const nextErrors = validateLogin(values);
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }
    setLoading(true);
    setServerError('');
    try {
      await login(values);
      router.replace('/(tabs)');
    } catch (error) {
      setServerError(error?.message || 'No se pudo iniciar sesión.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen scroll>
      <Header back title="Iniciar sesión" subtitle="Vuelve a tus registros" />
      <View style={styles.logo}>
        <Logo size={54} />
      </View>
      {serverError ? (
        <Notice tone="danger" title="No se pudo entrar" style={{ marginBottom: spacing.md }}>
          {serverError}
        </Notice>
      ) : null}
      <Input
        label="Correo electrónico"
        required
        value={values.email}
        onChangeText={(value) => setField('email', value)}
        placeholder="tu@correo.com"
        keyboardType="email-address"
        autoCapitalize="none"
        icon="mail-outline"
        error={errors.email}
      />
      <Input
        label="Contraseña"
        required
        value={values.password}
        onChangeText={(value) => setField('password', value)}
        placeholder="Tu contraseña"
        secureTextEntry={!showPassword}
        autoCapitalize="none"
        icon="lock-closed-outline"
        error={errors.password}
        right={
          <Pressable
            onPress={() => setShowPassword((value) => !value)}
            style={{ paddingHorizontal: spacing.md }}
            accessibilityRole="button"
            accessibilityLabel={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          >
            <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={19} color={colors.textMuted} />
          </Pressable>
        }
      />
      <Button onPress={handleSubmit} loading={loading} icon="log-in-outline" style={{ marginTop: spacing.sm }}>
        Entrar
      </Button>
      <Pressable onPress={() => router.push('/(auth)/recuperar')} style={{ alignSelf: 'center', padding: spacing.md }}>
        <Text style={[typography.small, { color: colors.primary, fontWeight: '700' }]}>Recuperar contraseña</Text>
      </Pressable>
      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        <Text style={[typography.small, { color: colors.textMuted }]}>¿Aún no tienes cuenta?</Text>
        <Pressable onPress={() => router.replace('/(auth)/registro')}>
          <Text style={[typography.small, { color: colors.primary, fontWeight: '800' }]}>Crear una</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  logo: { alignItems: 'center', marginBottom: spacing.xl },
  footer: {
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: spacing.lg,
    marginTop: spacing.lg,
  },
});
