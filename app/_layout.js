import React, { useEffect } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';
import { Stack, useGlobalSearchParams, useRootNavigationState, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Notifications from 'expo-notifications';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme, spacing, typography } from '../src/theme';
import { AuthProvider, useAuth } from '../src/features/auth/AuthContext';
import { DataProvider, useData } from '../src/features/profile/DataContext';
import { Logo } from '../src/components/Logo';

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

function BootScreen({ message, error }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.boot, { backgroundColor: colors.background }]}>
      <Logo size={72} showName />
      <View style={{ height: spacing.xl }} />
      {error ? (
        <Text style={[typography.body, { color: colors.danger, textAlign: 'center', maxWidth: 300 }]}>{error}</Text>
      ) : (
        <>
          <ActivityIndicator color={colors.primary} />
          <Text style={[typography.small, { color: colors.textMuted, marginTop: spacing.sm }]}>{message}</Text>
        </>
      )}
    </View>
  );
}

function RootNavigator() {
  const { colors, mode } = useTheme();
  const { ready, user, fatalError } = useAuth();
  const { profile, loading } = useData();
  const segments = useSegments();
  const router = useRouter();
  const navigationState = useRootNavigationState();
  const { edit } = useGlobalSearchParams();
  const editingOnboarding = edit === '1';

  useEffect(() => {
    if (Platform.OS === 'web' || !ready) return undefined;
    function openFromNotification(notification) {
      const url = notification?.request?.content?.data?.url;
      if (typeof url === 'string') {
        router.push(url);
        Notifications.clearLastNotificationResponse();
      }
    }
    const last = Notifications.getLastNotificationResponse();
    if (last?.notification) openFromNotification(last.notification);
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      openFromNotification(response?.notification);
    });
    return () => subscription.remove();
  }, [ready, router]);

  useEffect(() => {
    if (!navigationState?.key || !ready || fatalError) return;
    if (user && loading) return;
    const group = segments[0];
    const inAuth = group === '(auth)';
    const onOnboarding = group === 'onboarding';
    if (!user && !inAuth) {
      router.replace('/(auth)/bienvenida');
      return;
    }
    if (user && profile && !profile.onboarded && !onOnboarding) {
      router.replace('/onboarding');
      return;
    }
    if (user && profile?.onboarded && (inAuth || (onOnboarding && !editingOnboarding))) {
      router.replace('/(tabs)');
    }
  }, [navigationState?.key, ready, user, profile, loading, segments, fatalError, router, editingOnboarding]);

  if (!ready) return <BootScreen message="Preparando tu base de datos local…" />;
  if (fatalError) return <BootScreen error={fatalError} />;
  if (user && loading && !profile) return <BootScreen message="Cargando tu perfil…" />;

  return (
    <>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" options={{ animation: 'fade' }} />
        <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
        <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AuthProvider>
            <DataProvider>
              <RootNavigator />
            </DataProvider>
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  boot: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
});
