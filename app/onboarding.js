import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Input, Chips, SelectField } from '../src/components/Input';
import { Button } from '../src/components/Button';
import { Notice } from '../src/components/Notice';
import { StatCard } from '../src/components/StatCard';
import { ProgressBar } from '../src/components/ProgressBar';
import { Logo } from '../src/components/Logo';
import { useAuth } from '../src/features/auth/AuthContext';
import { useData } from '../src/features/profile/DataContext';
import { upsertWeight } from '../src/database/repositories/weightsRepo';
import { ACTIVITY_LEVELS, CURRENCIES, EXPERIENCE_LEVELS, GOALS } from '../src/constants';
import { ageFromBirthDate, todayKey } from '../src/utils/date';
import { buildEnergyPlan, waterTarget } from '../src/utils/calculations';
import { numericRange } from '../src/utils/validation';
import { formatNumber, parseOptionalNumber } from '../src/utils/numbers';
import { useTheme, spacing, radius, typography } from '../src/theme';

const STEPS = [
  { title: 'Sobre ti', subtitle: 'Datos básicos para personalizar el plan' },
  { title: 'Tu actividad', subtitle: 'Cuánto te mueves y qué buscas' },
  { title: 'Tu objetivo', subtitle: 'Un ritmo realista y sostenible' },
  { title: 'Tu contexto', subtitle: 'Presupuesto, comidas y preferencias' },
  { title: 'Tu plan', subtitle: 'Revisa y confirma antes de empezar' },
];

export default function OnboardingScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const { profile, latestWeight, updateProfile } = useData();
  const params = useLocalSearchParams();
  const isEditing = params.edit === '1';
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [values, setValues] = useState({
    display_name: profile?.display_name || '',
    birth_date: profile?.birth_date || '',
    sex: profile?.sex || 'no_especificado',
    height_cm: profile?.height_cm ? String(profile.height_cm) : '',
    weight_kg: latestWeight?.weight_kg ? String(latestWeight.weight_kg) : '',
    activity_level: profile?.activity_level || 'ligero',
    experience_level: profile?.experience_level || 'principiante',
    training_days: profile?.training_days || 3,
    goal: profile?.goal || 'perder_grasa',
    deficit_percent: profile?.deficit_percent ?? 15,
    target_weight_kg: profile?.target_weight_kg ? String(profile.target_weight_kg) : '',
    weekly_budget: profile?.weekly_budget ? String(profile.weekly_budget) : '',
    currency: profile?.currency || 'USD',
    region: profile?.region || '',
    meals_per_day: profile?.meals_per_day || 4,
    step_goal: String(profile?.step_goal || 8000),
    water_goal_ml: String(profile?.water_goal_ml || 2000),
    dietary_preferences: profile?.dietary_preferences || '',
    allergies: profile?.allergies || '',
    health_notes: profile?.health_notes || '',
    supplements_enabled: profile?.supplements_enabled ?? 0,
  });

  const age = useMemo(() => ageFromBirthDate(values.birth_date), [values.birth_date]);
  const weight = parseOptionalNumber(values.weight_kg);
  const height = parseOptionalNumber(values.height_cm);
  const plan = useMemo(
    () =>
      buildEnergyPlan({
        weightKg: weight,
        heightCm: height,
        age,
        sex: values.sex,
        activityLevel: values.activity_level,
        deficitPercent: values.deficit_percent,
        proteinPerKg: profile?.protein_per_kg || 1.8,
        goal: values.goal,
        healthNotes: values.health_notes,
      }),
    [weight, height, age, values.sex, values.activity_level, values.deficit_percent, values.goal, values.health_notes, profile?.protein_per_kg]
  );

  function setField(field, value) {
    setValues((current) => ({ ...current, [field]: value }));
    setError('');
  }

  function validateStep() {
    if (step === 0) {
      if (!values.birth_date.match(/^\d{4}-\d{2}-\d{2}$/)) return 'Escribe la fecha de nacimiento como AAAA-MM-DD.';
      if (age === null) return 'La fecha de nacimiento no es válida.';
      const heightError = numericRange(values.height_cm, { min: 100, max: 250, label: 'La estatura' });
      if (heightError) return heightError;
      const weightError = numericRange(values.weight_kg, { min: 35, max: 300, label: 'El peso' });
      if (weightError) return weightError;
    }
    if (step === 2) {
      if (values.target_weight_kg) {
        const error = numericRange(values.target_weight_kg, { min: 35, max: 300, label: 'El peso objetivo', optional: true });
        if (error) return error;
      }
    }
    if (step === 3) {
      if (values.weekly_budget) {
        const error = numericRange(values.weekly_budget, { min: 0, max: 1000000, label: 'El presupuesto', optional: true });
        if (error) return error;
      }
    }
    return null;
  }

  function next() {
    const message = validateStep();
    if (message) {
      setError(message);
      return;
    }
    setStep((current) => Math.min(STEPS.length - 1, current + 1));
  }

  async function finish() {
    const message = validateStep();
    if (message) {
      setError(message);
      return;
    }
    setSaving(true);
    setError('');
    try {
      await updateProfile({
        display_name: values.display_name.trim() || profile?.display_name,
        birth_date: values.birth_date,
        sex: values.sex,
        height_cm: height,
        activity_level: values.activity_level,
        experience_level: values.experience_level,
        training_days: Number(values.training_days),
        goal: values.goal,
        deficit_percent: Number(values.deficit_percent),
        target_weight_kg: parseOptionalNumber(values.target_weight_kg),
        weekly_budget: parseOptionalNumber(values.weekly_budget),
        currency: values.currency,
        region: values.region.trim(),
        meals_per_day: Number(values.meals_per_day),
        step_goal: Number(values.step_goal) || 8000,
        water_goal_ml: Number(values.water_goal_ml) || waterTarget(weight, values.activity_level),
        dietary_preferences: values.dietary_preferences.trim(),
        allergies: values.allergies.trim(),
        health_notes: values.health_notes.trim(),
        supplements_enabled: values.supplements_enabled,
        onboarded: 1,
      });
      const weightChanged =
        !latestWeight ||
        latestWeight.date !== todayKey() ||
        Math.abs(Number(latestWeight.weight_kg) - Number(weight)) > 0.05;
      if (weightChanged) {
        await upsertWeight(user.id, {
          date: todayKey(),
          weightKg: weight,
          notes: isEditing ? 'Peso actualizado desde el perfil.' : 'Peso inicial registrado durante la configuración.',
        });
      }
      router.replace(isEditing ? '/(tabs)/perfil' : '/(tabs)');
    } catch (caught) {
      setError(caught?.message || 'No se pudo guardar la configuración.');
    } finally {
      setSaving(false);
    }
  }

  const current = STEPS[step];

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Logo size={40} />
        <View style={{ flex: 1 }}>
          <Text style={[typography.tiny, { color: colors.primary }]}>PASO {step + 1} DE {STEPS.length}</Text>
          <Text style={[typography.h2, { color: colors.text }]}>{current.title}</Text>
          <Text style={[typography.small, { color: colors.textMuted }]}>{current.subtitle}</Text>
        </View>
        {isEditing ? (
          <Pressable onPress={() => router.back()} hitSlop={10} accessibilityLabel="Cancelar edición">
            <Text style={[typography.small, { color: colors.textMuted }]}>Cancelar</Text>
          </Pressable>
        ) : null}
      </View>
      <ProgressBar value={step + 1} max={STEPS.length} height={5} />
      <View style={{ height: spacing.lg }} />

      <View style={{ flex: 1 }}>
        <ScrollView style={styles.scrollArea} contentContainerStyle={{ paddingBottom: spacing.lg }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {error ? (
            <Notice tone="danger" title="Revisa este paso" style={{ marginBottom: spacing.md }}>
              {error}
            </Notice>
          ) : null}
          {step === 0 ? (
            <StepAboutYou values={values} setField={setField} age={age} />
          ) : null}
          {step === 1 ? <StepActivity values={values} setField={setField} /> : null}
          {step === 2 ? <StepGoal values={values} setField={setField} plan={plan} /> : null}
          {step === 3 ? <StepContext values={values} setField={setField} weight={weight} /> : null}
          {step === 4 ? <StepPlan values={values} plan={plan} age={age} weight={weight} height={height} /> : null}
        </ScrollView>
      </View>

      <View style={[styles.footer, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
        <View style={styles.footerRow}>
          {step > 0 ? (
            <Button variant="secondary" onPress={() => setStep((value) => value - 1)} style={{ flex: 1 }} icon="chevron-back">
              Atrás
            </Button>
          ) : null}
          {step < STEPS.length - 1 ? (
            <Button onPress={next} style={{ flex: 2 }} icon="arrow-forward">
              Continuar
            </Button>
          ) : (
            <Button onPress={finish} loading={saving} style={{ flex: 2 }} icon="checkmark">
              {isEditing ? 'Guardar cambios' : 'Empezar'}
            </Button>
          )}
        </View>
        {step === STEPS.length - 1 ? (
          <Text style={[typography.tiny, { color: colors.textSubtle, textAlign: 'center', marginTop: spacing.sm, textTransform: 'none', letterSpacing: 0 }]}>
            Las estimaciones son orientativas y no sustituyen el consejo de un profesional sanitario.
          </Text>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

function StepAboutYou({ values, setField, age }) {
  return (
    <View style={{ gap: spacing.sm }}>
      <Input label="Nombre" value={values.display_name} onChangeText={(value) => setField('display_name', value)} placeholder="Tu nombre" autoCapitalize="words" icon="person-outline" />
      <Input
        label="Fecha de nacimiento"
        required
        value={values.birth_date}
        onChangeText={(value) => setField('birth_date', value)}
        placeholder="AAAA-MM-DD"
        keyboardType="numbers-and-punctuation"
        icon="calendar-outline"
        hint={age !== null ? `${age} años` : 'Formato AAAA-MM-DD, por ejemplo 1996-04-18.'}
        maxLength={10}
      />
      <SelectField
        label="Sexo de referencia"
        value={values.sex}
        onChange={(value) => setField('sex', value)}
        options={[
          { key: 'masculino', label: 'Masculino' },
          { key: 'femenino', label: 'Femenino' },
          { key: 'no_especificado', label: 'No indicar' },
        ]}
        hint="Se usa para estimar el metabolismo basal; no condiciona el resto de la app."
      />
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <Input label="Estatura (cm)" required style={{ flex: 1 }} value={values.height_cm} onChangeText={(value) => setField('height_cm', value)} placeholder="175" keyboardType="decimal-pad" />
        <Input label="Peso (kg)" required style={{ flex: 1 }} value={values.weight_kg} onChangeText={(value) => setField('weight_kg', value)} placeholder="72,5" keyboardType="decimal-pad" hint="Se guarda como registro de hoy." />
      </View>
      <Notice tone="info" title="¿Por qué pedimos esto?">
        Solo se usan para estimar calorías y macros. Puedes cambiarlo después desde tu perfil.
      </Notice>
    </View>
  );
}

function StepActivity({ values, setField }) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: spacing.sm }}>
      <Text style={[typography.label, { color: colors.textMuted, marginBottom: 2 }]}>Nivel de actividad</Text>
      {ACTIVITY_LEVELS.map((level) => {
        const active = values.activity_level === level.key;
        return (
          <Pressable key={level.key} onPress={() => setField('activity_level', level.key)}>
            <ActivityRow active={active} title={level.label} description={level.description} />
          </Pressable>
        );
      })}
      <View style={{ height: spacing.sm }} />
      <Text style={[typography.label, { color: colors.textMuted, marginBottom: 2 }]}>Experiencia entrenando</Text>
      <Chips options={EXPERIENCE_LEVELS} value={values.experience_level} onChange={(value) => setField('experience_level', value)} />
      <View style={{ height: spacing.sm }} />
      <Text style={[typography.label, { color: colors.textMuted }]}>Días de entrenamiento por semana</Text>
      <Chips options={[1, 2, 3, 4, 5, 6].map((n) => ({ key: n, label: `${n} días` }))} value={values.training_days} onChange={(value) => setField('training_days', value)} />
    </View>
  );
}

function ActivityRow({ active, title, description }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.optionRow, { backgroundColor: active ? colors.primarySoft : colors.surface, borderColor: active ? colors.primary : colors.border }]}>
      <View style={[styles.radio, { borderColor: active ? colors.primary : colors.border }]}>
        {active ? <View style={[styles.radioDot, { backgroundColor: colors.primary }]} /> : null}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[typography.small, { color: colors.text, fontWeight: '800' }]}>{title}</Text>
        <Text style={[typography.small, { color: colors.textMuted }]}>{description}</Text>
      </View>
    </View>
  );
}

function StepGoal({ values, setField, plan }) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: spacing.sm }}>
      <SelectField label="Objetivo principal" value={values.goal} onChange={(value) => setField('goal', value)} options={GOALS} />
      {['mantener', 'salud'].includes(values.goal) ? (
        <Notice tone="success" title="Sin déficit automático">
          Para este objetivo mantenemos las calorías de mantenimiento. El objetivo es construir hábitos, no forzar un déficit.
        </Notice>
      ) : (
        <>
          <Text style={[typography.label, { color: colors.textMuted }]}>Déficit calorífico orientativo</Text>
          <Chips
            options={[0, 10, 15, 20, 25].map((value) => ({ key: value, label: value === 0 ? 'Sin déficit' : `${value} %` }))}
            value={values.deficit_percent}
            onChange={(value) => setField('deficit_percent', value)}
          />
          <Text style={[typography.small, { color: colors.textSubtle }]}>
            Un déficit del 10–20 % suele ser más sostenible. Nunca aplicamos déficit a menores de 18 años ni a personas que indiquen embarazo, lactancia o una condición clínica.
          </Text>
        </>
      )}
      <Input label="Peso objetivo (kg)" value={values.target_weight_kg} onChangeText={(value) => setField('target_weight_kg', value)} placeholder="Opcional" keyboardType="decimal-pad" />
      {plan?.target ? (
        <Notice tone="info" title="Estimación actual">
          Mantenimiento ≈ {formatNumber(plan.maintenance)} kcal · Objetivo ≈ {formatNumber(plan.target)} kcal
          {plan.deficitPercent ? ` (${plan.deficitPercent} % de déficit)` : ''}.
        </Notice>
      ) : null}
    </View>
  );
}

function StepContext({ values, setField, weight }) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: spacing.sm }}>
      <SelectField label="Moneda" value={values.currency} onChange={(value) => setField('currency', value)} options={CURRENCIES.map((c) => ({ key: c.code, label: `${c.code} · ${c.symbol}` }))} />
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <Input label="Presupuesto semanal" style={{ flex: 1 }} value={values.weekly_budget} onChangeText={(value) => setField('weekly_budget', value)} placeholder="Opcional" keyboardType="decimal-pad" icon="wallet-outline" />
        <Input label="Región o ciudad" style={{ flex: 1 }} value={values.region} onChangeText={(value) => setField('region', value)} placeholder="Opcional" icon="location-outline" />
      </View>
      <Text style={[typography.label, { color: colors.textMuted }]}>Comidas al día</Text>
      <Chips options={[2, 3, 4, 5, 6].map((n) => ({ key: n, label: `${n}` }))} value={values.meals_per_day} onChange={(value) => setField('meals_per_day', value)} />
      <View style={{ height: spacing.sm }} />
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <Input label="Meta de pasos" style={{ flex: 1 }} value={values.step_goal} onChangeText={(value) => setField('step_goal', value)} keyboardType="number-pad" icon="footsteps-outline" />
        <Input label="Meta de agua (ml)" style={{ flex: 1 }} value={values.water_goal_ml} onChangeText={(value) => setField('water_goal_ml', value)} keyboardType="number-pad" icon="water-outline" hint={`Sugerencia: ${waterTarget(weight, values.activity_level)} ml`} />
      </View>
      <Input label="Preferencias alimentarias" value={values.dietary_preferences} onChangeText={(value) => setField('dietary_preferences', value)} placeholder="Vegetariano, sin lactosa…" multiline icon="leaf-outline" />
      <Input label="Alergias o intolerancias" value={values.allergies} onChangeText={(value) => setField('allergies', value)} placeholder="Frutos secos, marisco…" multiline icon="warning-outline" />
      <Input label="Embarazo, lactancia o condición clínica" value={values.health_notes} onChangeText={(value) => setField('health_notes', value)} placeholder="Opcional. Desactiva el déficit automático." multiline icon="medkit-outline" hint="No es un diagnóstico. Consulta con un profesional." />
      <Pressable
        onPress={() => setField('supplements_enabled', values.supplements_enabled ? 0 : 1)}
        style={[styles.optionRow, { backgroundColor: values.supplements_enabled ? colors.primarySoft : colors.surface, borderColor: values.supplements_enabled ? colors.primary : colors.border }]}
      >
        <Ionicons name={values.supplements_enabled ? 'checkbox' : 'square-outline'} size={20} color={values.supplements_enabled ? colors.primary : colors.textMuted} />
        <View style={{ flex: 1 }}>
          <Text style={[typography.small, { color: colors.text, fontWeight: '800' }]}>Quiero registrar suplementos</Text>
          <Text style={[typography.small, { color: colors.textMuted }]}>Puedes activarlo o desactivarlo después.</Text>
        </View>
      </Pressable>
    </View>
  );
}

function StepPlan({ values, plan, age, weight, height }) {
  const { colors } = useTheme();
  const goalLabel = GOALS.find((goal) => goal.key === values.goal)?.label || values.goal;
  const activityLabel = ACTIVITY_LEVELS.find((level) => level.key === values.activity_level)?.label || values.activity_level;
  return (
    <View style={{ gap: spacing.md }}>
      <View style={styles.planGrid}>
        <StatCard label="Calorías objetivo" value={plan.target ? formatNumber(plan.target) : '—'} unit="kcal" icon="flame-outline" tone="primary" valueColor={colors.primary} />
        <StatCard label="IMC estimado" value={plan.bmi ?? '—'} sub={plan.bmiLabel} icon="body-outline" />
      </View>
      <View style={styles.planGrid}>
        <StatCard label="Proteína" value={plan.macros ? formatNumber(plan.macros.protein) : '—'} unit="g" icon="barbell-outline" />
        <StatCard label="Carbohidratos" value={plan.macros ? formatNumber(plan.macros.carbs) : '—'} unit="g" icon="nutrition-outline" />
        <StatCard label="Grasas" value={plan.macros ? formatNumber(plan.macros.fat) : '—'} unit="g" icon="water-outline" />
      </View>
      <View style={[styles.summary, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <SummaryRow label="Objetivo" value={goalLabel} />
        <SummaryRow label="Actividad" value={activityLabel} />
        <SummaryRow label="Entrenamiento" value={`${values.training_days} días/semana · ${values.experience_level}`} />
        <SummaryRow label="Datos" value={`${formatNumber(weight)} kg · ${formatNumber(height)} cm · ${age} años`} />
        <SummaryRow label="Comidas y agua" value={`${values.meals_per_day} comidas · ${formatNumber(values.water_goal_ml || waterTarget(weight, values.activity_level))} ml`} />
        <SummaryRow label="Presupuesto" value={values.weekly_budget ? `${values.currency} ${formatNumber(values.weekly_budget, 2)} / semana` : 'Sin definir'} />
      </View>
      {plan.pace ? (
        <Notice tone="info" title="Ritmo estimado">
          Déficit diario de {formatNumber(plan.pace.dailyDeficit)} kcal. Cambio teórico aproximado: {plan.pace.kgPerWeek > 0 ? '−' : ''}
          {formatNumber(Math.abs(plan.pace.kgPerWeek), 1)} kg/semana. Es una estimación, no una promesa.
        </Notice>
      ) : null}
      {plan.warnings.map((warning) => (
        <Notice key={warning} tone="warning">
          {warning}
        </Notice>
      ))}
      <Notice tone="medical" title="Antes de empezar">
        Esta app no diagnostica ni trata enfermedades. Si tienes una condición clínica, embarazo, lactancia o tomas medicación,
        consulta con un profesional antes de cambiar tu alimentación o entrenamiento.
      </Notice>
    </View>
  );
}

function SummaryRow({ label, value }) {
  const { colors } = useTheme();
  return (
    <View style={styles.summaryRow}>
      <Text style={[typography.small, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[typography.small, { color: colors.text, fontWeight: '700', flex: 1, textAlign: 'right' }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  scrollArea: { flex: 1, overflow: 'hidden' },
  footer: { borderTopWidth: 1, paddingTop: spacing.md, paddingBottom: spacing.xs },
  footerRow: { flexDirection: 'row', gap: spacing.sm },
  optionRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderWidth: 1, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  planGrid: { flexDirection: 'row', gap: spacing.sm },
  summary: { borderWidth: 1, borderRadius: radius.lg, padding: spacing.md, gap: 8 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
});
