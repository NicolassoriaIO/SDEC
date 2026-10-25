import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getProfile, updateProfile as updateProfileRepo } from '../../database/repositories/profileRepo';
import { getLatestWeight, upsertWeight } from '../../database/repositories/weightsRepo';
import { useAuth } from '../auth/AuthContext';
import { useTheme } from '../../theme';

const DataContext = createContext(null);

export function DataProvider({ children }) {
  const { user } = useAuth();
  const { setMode } = useTheme();
  const [profile, setProfile] = useState(null);
  const [latestWeight, setLatestWeight] = useState(null);
  const [loading, setLoading] = useState(Boolean(user));
  const [revision, setRevision] = useState(0);

  const load = useCallback(
    async (userId = user?.id) => {
      if (!userId) {
        setProfile(null);
        setLatestWeight(null);
        setLoading(false);
        return null;
      }
      setLoading(true);
      try {
        const nextProfile = await getProfile(userId);
        const weight = await getLatestWeight(userId);
        setProfile(nextProfile);
        setLatestWeight(weight);
        if (nextProfile?.theme) setMode(nextProfile.theme);
        return nextProfile;
      } finally {
        setLoading(false);
      }
    },
    [user, setMode]
  );

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) load(user?.id);
    });
    return () => {
      active = false;
    };
  }, [user, load]);

  const refreshProfile = useCallback(async () => load(user?.id), [load, user?.id]);

  const updateProfile = useCallback(
    async (changes) => {
      if (!user?.id) throw new Error('No hay sesión.');
      const updated = await updateProfileRepo(user.id, changes);
      setProfile(updated);
      if (changes.theme) setMode(changes.theme);
      setRevision((value) => value + 1);
      return updated;
    },
    [user, setMode]
  );

  const saveWeight = useCallback(
    async (entry) => {
      if (!user?.id) throw new Error('No hay sesión.');
      const saved = await upsertWeight(user.id, entry);
      setLatestWeight(saved);
      setRevision((value) => value + 1);
      return saved;
    },
    [user]
  );

  const bumpRevision = useCallback(() => setRevision((value) => value + 1), []);

  const value = useMemo(
    () => ({
      profile,
      latestWeight,
      loading,
      revision,
      refreshProfile,
      updateProfile,
      saveWeight,
      bumpRevision,
      setLatestWeight,
    }),
    [profile, latestWeight, loading, revision, refreshProfile, updateProfile, saveWeight, bumpRevision]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData debe usarse dentro de DataProvider.');
  return context;
}
