import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, SafeAreaView, ScrollView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { initDb } from './src/db/database';
import { ExcelApi } from './src/api/excel.api';
import SheetScreen from './src/screens/SheetScreen';

export default function App() {
  const [ready, setReady] = useState(false);
  const [sheets, setSheets] = useState<string[]>([]);
  const [activeSheet, setActiveSheet] = useState<string | null>(null);
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        await initDb();
      } catch (e) {
        setInitError(`DB init failed: ${(e as Error).message}`);
        setReady(true);
        return;
      }

      try {
        const s = await ExcelApi.listSheets();
        setSheets(s);
        if (s.length) setActiveSheet(s[0]);
      } catch {
        // server offline — app works offline with local SQLite data
      }

      setReady(true);
    })();
  }, []);

  if (!ready) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#0052cc" />
        <Text style={styles.loadingText}>Initialising local database…</Text>
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

  if (!activeSheet) {
    return (
      <SafeAreaView style={styles.loading}>
        <Text style={styles.emptyTitle}>No sheets found</Text>
        <Text style={styles.emptySub}>
          Make sure the Excel API server is running at{'\n'}
          {process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000'}
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar style="light" />
      <View style={styles.tabs}>
        <FlatList
          horizontal
          data={sheets}
          keyExtractor={(s) => s}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.tab, activeSheet === item && styles.tabActive]}
              onPress={() => setActiveSheet(item)}
            >
              <Text style={[styles.tabText, activeSheet === item && styles.tabTextActive]}>
                {item}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>
      <SheetScreen sheet={activeSheet} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0052cc' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff', gap: 12 },
  loadingText: { color: '#666', fontSize: 14 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#333' },
  emptySub: { fontSize: 13, color: '#666', textAlign: 'center', paddingHorizontal: 32, marginTop: 8 },
  errorContainer: { flexGrow: 1, justifyContent: 'center', padding: 24, backgroundColor: '#fff' },
  errorTitle: { fontSize: 18, fontWeight: '700', color: '#d03b3b', marginBottom: 12 },
  errorBody: { fontSize: 13, color: '#333', fontFamily: 'monospace' },
  tabs: { backgroundColor: '#003d99', paddingHorizontal: 8, paddingVertical: 4 },
  tab: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 6, marginRight: 6 },
  tabActive: { backgroundColor: '#fff' },
  tabText: { color: '#aac4ff', fontWeight: '600', fontSize: 13 },
  tabTextActive: { color: '#0052cc' },
});
