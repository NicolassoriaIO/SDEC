import React, { useCallback, useState } from 'react';
import { Alert, Share, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Screen } from '../../src/components/Screen';
import { Header } from '../../src/components/Header';
import { Card, SectionTitle, KeyValue } from '../../src/components/Card';
import { Button, IconButton } from '../../src/components/Button';
import { Notice } from '../../src/components/Notice';
import { Segmented } from '../../src/components/Input';
import { InlineLoader } from '../../src/components/EmptyState';
import { useAuth } from '../../src/features/auth/AuthContext';
import { useData } from '../../src/features/profile/DataContext';
import { useEnergyPlan } from '../../src/features/profile/useEnergyPlan';
import { listReminders } from '../../src/database/repositories/remindersRepo';
import { dataForExport } from '../../src/database/repositories/statsRepo';
import { formatDateEs, todayKey } from '../../src/utils/date';
import { formatNumber } from '../../src/utils/numbers';
import { APP_INFO } from '../../src/constants';
import { useTheme, spacing, radius, typography } from '../../src/theme';

const QUICK_LINKS = [
  { icon: 'wallet-outline', title: 'Presupuesto', subtitle: 'Gastos y lista de compras', href: '/comida/presupuesto' },
  { icon: 'pricetags-outline', title: 'Precios de alimentos', subtitle: 'Coste real de tus recetas', href: '/comida/presupuesto/precios' },
  { icon: 'flask-outline', title: 'Suplementos', subtitle: 'Etiquetas, gasto y registros', href: '/comida/suplemento' },
  { icon: 'restaurant-outline', title: 'Recetas', subtitle: 'Tus recetas y las de SDEC', href: '/comida/receta' },
  { icon: 'barbell-outline', title: 'Entrenamientos', subtitle: 'Rutinas e historial', href: '/(tabs)/entrenamiento' },
];

export default function ProfileScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { user, logout, deleteAccount } = useAuth();
  const { profile, latestWeight, updateProfile } = useData();
  const { plan, waterGoal, ready } = useEnergyPlan();
  const [reminders, setReminders] = useState([]);
  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useFocusEffect(
    useCallback(() => {
      let active = true;
      if (user?.id) {
        listReminders(user.id)
          .then((rows) => {
            if (active) setReminders(rows);
          })
          .catch(() => {
            if (active) setReminders([]);
          });
      }
      return () => {
        active = false;
      };
    }, [user])
  );

  const displayName = profile?.display_name || user?.display_name || 'Tu cuenta';
  const email = user?.email || profile?.email || 'Sin correo';
  const initial = displayName.trim().charAt(0).toUpperCase() || 'S';
  const activeReminders = reminders.filter((reminder) => Boolean(reminder.enabled)).length;

  async function changeTheme(theme) {
    try {
      await updateProfile({ theme });
      setMessage(theme === 'light' ? 'Tema claro activado.' : 'Tema oscuro activado.');
      setError('');
    } catch (caught) {
      setError(caught?.message || 'No se pudo cambiar el tema.');
    }
  }

  async function exportData() {
    setExporting(true);
    setMessage('');
    setError('');
    try {
      const payload = await dataForExport(user.id);
      const file = new File(Paths.cache, `sdec-datos-${todayKey()}.json`);
      if (file.exists) file.delete();
      file.create();
      await file.write(JSON.stringify(payload, null, 2));
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, {
          dialogTitle: 'Exportar datos de SDEC',
          mimeType: 'application/json',
        });
        setMessage('Copia de seguridad preparada. Elige dónde guardarla o compartirla.');
      } else {
        await Share.share({ title: 'Datos SDEC', message: JSON.stringify(payload, null, 2) });
        setMessage('Datos preparados para compartir.');
      }
    } catch (caught) {
      setError(caught?.message || 'No se pudieron exportar los datos.');
    } finally {
      setExporting(false);
    }
  }

  function confirmLogout() {
    Alert.alert('Cerrar sesión', 'Tus datos seguirán en este dispositivo. Podrás volver a entrar con tu correo y contraseña.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Cerrar sesión', onPress: () => logout().catch((caught) => setError(caught?.message || 'No se pudo cerrar la sesión.')) },
    ]);
  }

  function confirmDelete() {
    Alert.alert(
      'Eliminar cuenta',
      'Se borrarán tu cuenta local y todos tus datos de este dispositivo: comidas, entrenamientos, medidas, presupuesto y recordatorios. Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Continuar',
          style: 'destructive',
          onPress: () =>
            Alert.alert('Confirmación final', '¿Eliminar definitivamente todos tus datos?', [
              { text: 'No, volver', style: 'cancel' },
              {
                text: 'Eliminar todo',
                style: 'destructive',
                onPress: () =>
                  deleteAccount()
                    .then(() => {
                      try {
                        const file = new File(Paths.cache, `sdec-datos-${todayKey()}.json`);
                        if (file.exists) file.delete();
                      } catch {
                        // The export cache file is optional.
                      }
                    })
                    .catch((caught) => setError(caught?.message || 'No se pudo eliminar la cuenta.')),
              },
            ]),
        },
      ]
    );
  }

  return (
    <Screen scroll>
      <Header
        title="Perfil"
        subtitle="Tus datos, objetivos y preferencias"
        right={<IconButton icon="settings-outline" onPress={() => router.push({ pathname: '/onboarding', params: { edit: '1' } })} accessibilityLabel="Editar datos" />}
      />
      {error ? <Notice tone="danger" title="Aviso" style={{ marginBottom: spacing.sm }}>{error}</Notice> : null}
      {message ? <Notice tone="success" title="Hecho" style={{ marginBottom: spacing.sm }}>{message}</Notice> : null}

      <Card>
        <View style={styles.identity}>
          <View style={[styles.avatar, { backgroundColor: colors.primarySoft, borderColor: colors.primary }]}>
            <Text style={[typography.h1, { color: colors.primary }]}>{initial}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[typography.h2, { color: colors.text }]} numberOfLines={1}>{displayName}</Text>
            <Text style={[typography.small, { color: colors.textMuted }]} numberOfLines={1}>{email}</Text>
            <View style={[styles.badge, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
              <Ionicons name="phone-portrait-outline" size={12} color={colors.textMuted} />
              <Text style={[typography.tiny, { color: colors.textMuted, textTransform: 'none', letterSpacing: 0 }]}>Cuenta local</Text>
            </View>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
          <Button small icon="create-outline" onPress={() => router.push({ pathname: '/onboarding', params: { edit: '1' } })} style={{ flex: 1 }}>
            Editar datos
          </Button>
          <Button small variant="secondary" icon="download-outline" onPress={exportData} loading={exporting} style={{ flex: 1 }}>
            Exportar
          </Button>
        </View>
      </Card>

      <SectionTitle>Tu plan actual</SectionTitle>
      {ready && plan?.target ? (
        <Card>
          <KeyValue label="Objetivo energético" value={`${formatNumber(plan.target)} kcal/día`} />
          <KeyValue label="Mantenimiento estimado" value={`${formatNumber(plan.maintenance)} kcal`} />
          {plan.macros ? (
            <>
              <KeyValue label="Proteína" value={`${formatNumber(plan.macros.protein)} g`} />
              <KeyValue label="Carbohidratos" value={`${formatNumber(plan.macros.carbs)} g`} />
              <KeyValue label="Grasas" value={`${formatNumber(plan.macros.fat)} g`} />
            </>
          ) : null}
          <KeyValue label="Agua" value={`${formatNumber(waterGoal)} ml`} />
          <KeyValue label="Pasos" value={formatNumber(profile?.step_goal || 8000)} />
          {profile?.target_weight_kg ? <KeyValue label="Peso objetivo" value={`${formatNumber(profile.target_weight_kg, 1)} kg`} /> : null}
          {latestWeight ? <KeyValue label="Último peso" value={`${formatNumber(latestWeight.weight_kg, 1)} kg · ${formatDateEs(latestWeight.date)}`} /> : null}
          {plan.warnings?.length ? (
            <Notice tone="warning" title="Ten en cuenta" style={{ marginTop: spacing.sm }}>
              {plan.warnings[0]}
            </Notice>
          ) : null}
          <Button small variant="ghost" icon="pencil-outline" onPress={() => router.push({ pathname: '/onboarding', params: { edit: '1' } })} style={{ marginTop: spacing.sm, alignSelf: 'flex-start' }}>
            Ajustar objetivos
          </Button>
        </Card>
      ) : (
        <Card>
          <Text style={[typography.small, { color: colors.textMuted }]}>
            Completa tu fecha de nacimiento, estatura y peso para calcular un objetivo energético orientativo.
          </Text>
          <Button small onPress={() => router.push({ pathname: '/onboarding', params: { edit: '1' } })} style={{ marginTop: spacing.sm }}>
            Completar datos
          </Button>
        </Card>
      )}

      <SectionTitle>Apariencia</SectionTitle>
      <Card>
        <Segmented
          options={[
            { key: 'dark', label: 'Oscuro' },
            { key: 'light', label: 'Claro' },
          ]}
          value={profile?.theme === 'light' ? 'light' : 'dark'}
          onChange={changeTheme}
        />
        <Text style={[typography.tiny, { color: colors.textSubtle, marginTop: spacing.sm, textTransform: 'none', letterSpacing: 0 }]}>
          El tema se guarda en tu perfil y se aplica al abrir la app.
        </Text>
      </Card>

      <SectionTitle
        action={<Button small full={false} variant="ghost" icon="chevron-forward" onPress={() => router.push('/perfil/recordatorios')}>Gestionar</Button>}
      >
        Recordatorios
      </SectionTitle>
      <Card onPress={() => router.push('/perfil/recordatorios')} accessibilityLabel="Gestionar recordatorios">
        <View style={styles.row}>
          <View style={[styles.linkIcon, { backgroundColor: colors.primarySoft }]}>
            <Ionicons name="notifications-outline" size={20} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[typography.small, { color: colors.text, fontWeight: '800' }]}>
              {reminders.length ? `${activeReminders} activos de ${reminders.length}` : 'Sin recordatorios'}
            </Text>
            <Text style={[typography.tiny, { color: colors.textMuted, textTransform: 'none', letterSpacing: 0 }]}>
              {reminders.length ? 'Avisos locales para comidas, entreno o agua' : 'Crea avisos que se adapten a tu rutina'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textSubtle} />
        </View>
      </Card>

      <SectionTitle>Accesos rápidos</SectionTitle>
      <Card padding="none">
        {QUICK_LINKS.map((link, index) => (
          <View key={link.title} style={[styles.linkRow, index > 0 && { borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth }]}>
            <View style={[styles.linkIcon, { backgroundColor: colors.surfaceAlt }]}>
              <Ionicons name={link.icon} size={19} color={colors.textMuted} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[typography.small, { color: colors.text, fontWeight: '700' }]}>{link.title}</Text>
              <Text style={[typography.tiny, { color: colors.textMuted, textTransform: 'none', letterSpacing: 0 }]}>{link.subtitle}</Text>
            </View>
            <IconButton icon="chevron-forward" size={17} variant="transparent" onPress={() => router.push(link.href)} accessibilityLabel={link.title} />
          </View>
        ))}
      </Card>

      <SectionTitle>Datos y privacidad</SectionTitle>
      <Card>
        <View style={styles.row}>
          <Ionicons name="shield-checkmark-outline" size={22} color={colors.accent} />
          <Text style={[typography.small, { color: colors.textMuted, flex: 1 }]}>
            Tus datos se guardan en una base de datos local en este dispositivo. La app funciona sin conexión. Exporta una
            copia con regularidad si quieres conservarla fuera del teléfono.
          </Text>
        </View>
        <Button small variant="secondary" icon="download-outline" onPress={exportData} loading={exporting} style={{ marginTop: spacing.md }}>
          Exportar copia de seguridad
        </Button>
        <InlineLoader visible={exporting} message="Preparando archivo…" />
      </Card>

      <SectionTitle>Sesión</SectionTitle>
      <Card>
        <Button variant="secondary" icon="log-out-outline" onPress={confirmLogout}>Cerrar sesión</Button>
        <Button variant="danger" icon="trash-outline" onPress={confirmDelete} style={{ marginTop: spacing.sm }}>Eliminar cuenta y datos</Button>
      </Card>

      <Notice tone="medical" title="Acompañamiento, no diagnóstico" style={{ marginTop: spacing.lg }}>
        SDEC ofrece estimaciones y registros para ayudarte a observar hábitos. No sustituye la valoración de un profesional
        sanitario o nutricionista, especialmente si tienes una condición clínica, embarazo o lactancia.
      </Notice>

      <Text style={[typography.tiny, { color: colors.textSubtle, textAlign: 'center', marginTop: spacing.lg, textTransform: 'none', letterSpacing: 0 }]}>
        {APP_INFO.fullName} · {APP_INFO.name} v{APP_INFO.version}
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  identity: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: { width: 64, height: 64, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 3, alignSelf: 'flex-start', marginTop: 5 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md },
  linkIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
