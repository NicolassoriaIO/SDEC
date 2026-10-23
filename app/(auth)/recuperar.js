import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '../../src/components/Screen';
import { Header } from '../../src/components/Header';
import { Input } from '../../src/components/Input';
import { Button } from '../../src/components/Button';
import { Notice } from '../../src/components/Notice';
import { recoverLocalAccount } from '../../src/services/authService';
import { isEmail } from '../../src/utils/validation';
import { useTheme, spacing, typography } from '../../src/theme';

export default function RecoverScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [values, setValues] = useState({ email: '', code: '', password: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  function setField(field, value) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setError('');
  }

  async function handleRecover() {
    const nextErrors = {};
    if (!isEmail(values.email)) nextErrors.email = 'Introduce un correo válido.';
    if (!values.code.trim()) nextErrors.code = 'Introduce tu código de recuperación.';
    if (!values.password) nextErrors.password = 'Introduce una contraseña nueva.';
    if (values.password !== values.confirmPassword) nextErrors.confirmPassword = 'Las contraseñas no coinciden.';
    if (Object.keys(nextErrors).length) return setErrors(nextErrors);
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await recoverLocalAccount({
        email: values.email,
        recoveryCode: values.code,
        newPassword: values.password,
        confirmPassword: values.confirmPassword,
      });
      setSuccess('Contraseña actualizada. Ya puedes iniciar sesión con la nueva contraseña.');
      setValues((current) => ({ ...current, code: '', password: '', confirmPassword: '' }));
    } catch (caught) {
      setError(caught?.message || 'No se pudo recuperar la cuenta.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen scroll>
      <Header back title="Recuperar acceso" subtitle="Recupera tu cuenta local" />
      <View style={{ height: spacing.md }} />
      {error ? (
        <Notice tone="danger" title="No se pudo continuar" style={{ marginBottom: spacing.md }}>
          {error}
        </Notice>
      ) : null}
      {success ? (
        <Notice tone="success" title="Listo" style={{ marginBottom: spacing.md }}>
          {success}
          <Pressable onPress={() => router.replace('/(auth)/login')} style={{ marginTop: spacing.sm }}>
            <Text style={{ color: colors.primary, fontWeight: '800' }}>Volver a iniciar sesión</Text>
          </Pressable>
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

      <Notice tone="warning" title="Cuenta local">
        El código de recuperación se mostró al crear la cuenta. Guárdalo en un lugar seguro.
      </Notice>
      <View style={{ height: spacing.md }} />
      <Input
        label="Código de recuperación"
        required
        value={values.code}
        onChangeText={(value) => setField('code', value)}
        placeholder="XXXX-XXXX-XXXX"
        autoCapitalize="characters"
        icon="key-outline"
        error={errors.code}
      />
      <Input
        label="Nueva contraseña"
        required
        value={values.password}
        onChangeText={(value) => setField('password', value)}
        placeholder="Mínimo 8 caracteres"
        secureTextEntry
        autoCapitalize="none"
        icon="lock-closed-outline"
        error={errors.password}
        hint="Al menos 8 caracteres, una letra y un número."
      />
      <Input
        label="Repetir contraseña"
        required
        value={values.confirmPassword}
        onChangeText={(value) => setField('confirmPassword', value)}
        placeholder="Repite la contraseña nueva"
        secureTextEntry
        autoCapitalize="none"
        icon="shield-checkmark-outline"
        error={errors.confirmPassword}
      />
      <Button onPress={handleRecover} loading={loading} icon="key-outline">
        Cambiar contraseña
      </Button>
      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        <Text style={[typography.small, { color: colors.textMuted }]}>¿Sin código ni correo?</Text>
        <Text style={[typography.small, { color: colors.textSubtle }]}>Crea una cuenta nueva; no es posible recuperar datos locales sin credenciales.</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  footer: { borderTopWidth: 1, paddingTop: spacing.lg, marginTop: spacing.lg, gap: 4 },
});
