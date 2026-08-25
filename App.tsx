import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
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
        await syncSheet('products').catch(() => {});  // best-effort; offline is fine
        await sleep(500)
        setPhase('ready');
      } catch (e) {
        setInitError((e as Error).message);
        setPhase('error');
      }
    }
    bootstrap();
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
