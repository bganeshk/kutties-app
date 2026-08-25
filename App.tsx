import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, ScrollView } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { initDb } from './src/db/database';
import TabNavigator from './src/navigation/TabNavigator';

export default function App() {
  const [ready, setReady] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    initDb()
      .catch((e) => setInitError(`DB init failed: ${(e as Error).message}`))
      .finally(() => setReady(true));
  }, []);

  if (!ready) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#C2185B" />
        <Text style={styles.loadingText}>Loading…</Text>
      </View>
    );
  }

  if (initError) {
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
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff', gap: 12 },
  loadingText: { color: '#888', fontSize: 14 },
  errorContainer: { flexGrow: 1, justifyContent: 'center', padding: 24, backgroundColor: '#fff' },
  errorTitle: { fontSize: 18, fontWeight: '700', color: '#C2185B', marginBottom: 12 },
  errorBody: { fontSize: 13, color: '#333', fontFamily: 'monospace' },
});
