import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../src/components/Screen';
import { Header } from '../../src/components/Header';
import { Input } from '../../src/components/Input';
import { Button } from '../../src/components/Button';
import { Notice } from '../../src/components/Notice';
import { ModalSheet } from '../../src/components/ModalSheet';
import { useAuth } from '../../src/features/auth/AuthContext';
import { validateRegistration } from '../../src/utils/validation';
import { useTheme, spacing, radius, typography } from '../../src/theme';

export default function RegisterScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { register } = useAuth();
  const [values, setValues] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');
  const [recoveryCode, setRecoveryCode] = useState(null);

  function setField(field, value) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setServerError('');
  }

  async function handleSubmit() {
    const nextErrors = validateRegistration(values);
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }
    setLoading(true);
    setServerError('');
    try {
      const result = await register(values);
      if (result.recoveryCode) setRecoveryCode(result.recoveryCode);
      else router.replace('/(tabs)');
    } catch (error) {
      setServerError(error?.message || 'No se pudo crear la cuenta.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen scroll>
      <Header back title="Crear cuenta" subtitle="Solo necesitamos lo esencial" />
      <Notice tone="info" title="Privacidad primero" style={{ marginBottom: spacing.lg }}>
        Tu cuenta y tus registros se guardan en este dispositivo. Las contraseñas se almacenan con hash y sal, nunca en texto plano.
      </Notice>
      {serverError ? (
        <Notice tone="danger" title="No se pudo crear la cuenta" style={{ marginBottom: spacing.md }}>
          {serverError}
        </Notice>
      ) : null}
      <Input
        label="Nombre"
        required
        value={values.name}
        onChangeText={(value) => setField('name', value)}
        placeholder="Cómo quieres que te llamemos"
        autoCapitalize="words"
        icon="person-outline"
        error={errors.name}
      />
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
        placeholder="Mínimo 8 caracteres"
        secureTextEntry={!showPassword}
        autoCapitalize="none"
        icon="lock-closed-outline"
        error={errors.password}
        hint="Al menos 8 caracteres, una letra y un número."
        right={
          <Pressable
            onPress={() => setShowPassword((value) => !value)}
            style={{ paddingHorizontal: spacing.md }}
            accessibilityLabel={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          >
            <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={19} color={colors.textMuted} />
          </Pressable>
        }
      />
      <Input
        label="Repetir contraseña"
        required
        value={values.confirmPassword}
        onChangeText={(value) => setField('confirmPassword', value)}
        placeholder="Repite la contraseña"
        secureTextEntry={!showPassword}
        autoCapitalize="none"
        icon="shield-checkmark-outline"
        error={errors.confirmPassword}
      />
      <Button onPress={handleSubmit} loading={loading} icon="person-add-outline" style={{ marginTop: spacing.sm }}>
        Crear cuenta
      </Button>
      <Text style={[typography.tiny, { color: colors.textSubtle, textAlign: 'center', marginTop: spacing.md, lineHeight: 16, textTransform: 'none', letterSpacing: 0 }]}>
        SDEC ofrece estimaciones educativas. No es un servicio médico. Si tienes una condición de salud, embarazo o
        lactancia, consulta con un profesional.
      </Text>
      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        <Text style={[typography.small, { color: colors.textMuted }]}>¿Ya tienes cuenta?</Text>
        <Pressable onPress={() => router.replace('/(auth)/login')}>
          <Text style={[typography.small, { color: colors.primary, fontWeight: '800' }]}>Iniciar sesión</Text>
        </Pressable>
      </View>

      <ModalSheet
        visible={Boolean(recoveryCode)}
        onClose={() => {
          setRecoveryCode(null);
          router.replace('/(tabs)');
        }}
        title="Guarda tu código de recuperación"
        subtitle="Es la única forma de recuperar tu cuenta local si olvidas la contraseña."
        footer={
          <Button
            onPress={() => {
              setRecoveryCode(null);
              router.replace('/(tabs)');
            }}
          >
            He guardado mi código
          </Button>
        }
      >
        <View style={[styles.codeBox, { backgroundColor: colors.surfaceAlt, borderColor: colors.primary }]}>
          <Text selectable style={[styles.code, { color: colors.primary }]}>
            {recoveryCode}
          </Text>
        </View>
        <Notice tone="warning" title="Anótalo en un lugar seguro">
          No lo compartas. Si pierdes la contraseña y el código, no podremos recuperar los datos locales en esta versión.
        </Notice>
      </ModalSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  footer: {
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: spacing.lg,
    marginTop: spacing.lg,
  },
  codeBox: { borderWidth: 1, borderRadius: radius.lg, padding: spacing.xl, alignItems: 'center', marginBottom: spacing.md },
  code: { fontSize: 28, fontWeight: '900', letterSpacing: 2, fontVariant: ['tabular-nums'] },
});
