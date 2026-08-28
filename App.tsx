import React, { useEffect, useState } from 'react';
import { AppState, AppStateStatus, Text, StyleSheet, ScrollView } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { initDb } from './src/db/database';
import { syncSheet } from './src/sync/sync.service';
import TabNavigator from './src/navigation/TabNavigator';
import AppSplashScreen from './src/screens/AppSplashScreen';

type Phase = 'db' | 'sync' | 'ready' | 'error';

export default function App() {
  const [phase, setPhase] = useState<Phase>('db');
  const [initError, setInitError] = useState<string | null>(null);
const sleep = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

  useEffect(() => {
    async function bootstrap() {
      try {
        
        setPhase('db');
        await initDb();

        setPhase('sync');
        await syncSheet('dashboard').catch(() => {});  // best-effort; offline is fine
        await syncSheet('products').catch(() => {});
        await syncSheet('reftbl').catch(() => {});
        await syncSheet('teachers').catch(() => {});
        await syncSheet('employees').catch(() => {});
        await syncSheet('courses').catch(() => {});
     
        await sleep(500)
        setPhase('ready');
      } catch (e) {
        setInitError((e as Error).message);
        setPhase('error');
      }
    }
    bootstrap();
  }, []);

  // Push pending changes when the app goes to background / inactive
  useEffect(() => {
    const sheets = ['dashboard', 'products', 'reftbl', 'teachers', 'employees', 'courses'];
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'background' || state === 'inactive') {
        sheets.forEach(sheet => syncSheet(sheet).catch(() => {}));
      }
    });
    return () => sub.remove();
  }, []);

  if (phase === 'db')   return <AppSplashScreen message="Initialising database…" />;
  if (phase === 'sync') return <AppSplashScreen message="Syncing data…" />;

  if (phase === 'error') {
    return (
      <ScrollView contentContainerStyle={styles.errorContainer}>
        <Text style={styles.errorTitle}>Initialisation Error</Text>
        <Text style={styles.errorBody}>{initError}</Text>
      </ScrollView>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <NavigationContainer>
        <TabNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  errorContainer: { flexGrow: 1, justifyContent: 'center', padding: 24, backgroundColor: '#fff' },
  errorTitle: { fontSize: 18, fontWeight: '700', color: '#C2185B', marginBottom: 12 },
  errorBody: { fontSize: 13, color: '#333', fontFamily: 'monospace' },
});
