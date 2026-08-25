import React, { useEffect, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Image, Dimensions, SafeAreaView, StatusBar, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSheet } from '../hooks/useSheet';

const PRIMARY = '#C2185B';
const { width } = Dimensions.get('window');
const CARD_SIZE = (width - 48) / 2;
const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

interface DashRow {
  id: string;
  Dashcaption?: string;
  dash_image?: string;
  appviewsheet?: string;
  parentview?: string;
  screen_order?: number;
  [key: string]: unknown;
}

function resolveImageUri(value: string): string {
  if (value.startsWith('http://') || value.startsWith('https://')) return value;
  return `${API_BASE}/assets/${value}`;
}

interface CardIconProps { value: string | undefined }
function CardIcon({ value }: CardIconProps) {
  if (!value) return <Text style={styles.cardEmoji}>📌</Text>;
  return (
    <Image
      source={{ uri: resolveImageUri(value) }}
      style={styles.cardImage}
      resizeMode="contain"
    />
  );
}

interface Props { navigation?: any }

export default function HomeScreen({ navigation }: Props) {
  const { rows, syncing, error, sync } = useSheet('dashboard');
  const synced = useRef(false);

  // Sync once on first mount to populate local store
  useEffect(() => {
    if (!synced.current) {
      synced.current = true;
      sync();
    }
  }, []);

  // Home items: parentview === 'Home', ordered by screen_order
  const items = (rows as DashRow[])
    .filter((r) => String(r.parentview ?? '').trim() === 'Home')
    .sort((a, b) => Number(a.screen_order ?? 99) - Number(b.screen_order ?? 99));

  const showLoader = syncing && items.length === 0;

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar backgroundColor={PRIMARY} barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="reorder-three" size={30} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Home</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerIcon}>
            <Ionicons name="search" size={22} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerIcon} onPress={() => sync()}>
            {syncing
              ? <ActivityIndicator size="small" color="#fff" />
              : <Ionicons name="refresh" size={22} color="#fff" />}
          </TouchableOpacity>
        </View>
      </View>

      {error ? <Text style={styles.errorBanner}>⚠ {error}</Text> : null}

      {showLoader ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={PRIMARY} />
          <Text style={styles.loaderText}>Loading dashboard…</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.row}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No items found</Text>
              <Text style={styles.emptyHint}>Tap refresh to sync from server</Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.85}
              onPress={() =>
                navigation?.navigate('SubItems', {
                  parentview: String(item.Dashcaption ?? ''),
                  title: String(item.Dashcaption ?? item.id),
                })
              }
            >
              <View style={styles.cardImageArea}>
                <CardIcon value={item.dash_image} />
                 <Text style={styles.cardLabel}>{String(item.Dashcaption ?? item.id)}</Text>
              </View>
              
            </TouchableOpacity>
          )}
        />
      )}

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#EEEEEE' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: PRIMARY, paddingHorizontal: 16, paddingVertical: 12,
  },
  headerTitle: { flex: 1, color: '#fff', fontSize: 18, fontWeight: '700', marginLeft: 14 },
  headerActions: { flexDirection: 'row' },
  headerIcon: { marginLeft: 14 },
  errorBanner: {
    backgroundColor: '#fce4ec', color: '#b71c1c',
    fontSize: 12, paddingHorizontal: 16, paddingVertical: 6,
  },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loaderText: { color: '#888', fontSize: 14 },
  grid: { padding: 12 },
  row: { justifyContent: 'space-between', marginBottom: 12 },
  card: {
    width: CARD_SIZE, backgroundColor: '#fff', borderRadius: 8, overflow: 'hidden',
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  cardImageArea: {
    height: CARD_SIZE * 0.95, alignItems: 'center',
    justifyContent: 'center', backgroundColor: '#fefefe',
  },
  cardEmoji: { fontSize: 72 },
  cardImage: { width: CARD_SIZE * 0.7, height: CARD_SIZE * 0.7 },
  cardFooter: { borderTopWidth: 2, borderTopColor: '#222', paddingHorizontal: 12, paddingVertical: 10 },
  cardLabel: { fontSize: 15, fontWeight: '500', color: '#222' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, marginTop: 80 },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#555', marginBottom: 8 },
  emptyHint: { fontSize: 12, color: '#999', textAlign: 'center' },
});
