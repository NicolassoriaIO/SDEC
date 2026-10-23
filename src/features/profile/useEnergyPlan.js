import { useMemo } from 'react';
import { useData } from './DataContext';
import { ageFromBirthDate } from '../../utils/date';
import { buildEnergyPlan, waterTarget } from '../../utils/calculations';

export function useEnergyPlan() {
  const { profile, latestWeight } = useData();
  return useMemo(() => {
    const weightKg = Number(latestWeight?.weight_kg || 0) || null;
    const heightCm = Number(profile?.height_cm || 0) || null;
    const age = ageFromBirthDate(profile?.birth_date);
    const plan = buildEnergyPlan({
      weightKg,
      heightCm,
      age,
      sex: profile?.sex || 'no_especificado',
      activityLevel: profile?.activity_level || 'ligero',
      deficitPercent: profile?.deficit_percent ?? 15,
      proteinPerKg: profile?.protein_per_kg || 1.8,
      goal: profile?.goal || 'perder_grasa',
      healthNotes: profile?.health_notes || '',
    });
    return {
      profile,
      latestWeight,
      weightKg,
      heightCm,
      age,
      plan,
      waterGoal: profile?.water_goal_ml || waterTarget(weightKg, profile?.activity_level),
      ready: Boolean(weightKg && heightCm && age),
    };
  }, [profile, latestWeight]);
}
