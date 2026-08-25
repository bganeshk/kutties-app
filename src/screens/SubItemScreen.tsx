import React, { useEffect, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Image, Dimensions, SafeAreaView, ActivityIndicator,
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

function CardIcon({ value }: { value: string | undefined }) {
  if (!value) return <Text style={styles.cardEmoji}>📌</Text>;
  return (
    <Image
      source={{ uri: resolveImageUri(value) }}
      style={styles.cardImage}
      resizeMode="contain"
    />
  );
}

interface Props {
  navigation: any;
  route: { params: { parentview: string; title: string } };
}

export default function SubItemScreen({ navigation, route }: Props) {
  const { parentview, title } = route.params;
  const { rows, syncing, sync } = useSheet('dashboard');
  const synced = useRef(false);

  useEffect(() => {
    if (!synced.current) {
      synced.current = true;
      sync();
    }
  }, []);

  const items = (rows as DashRow[])
    .filter((r) => String(r.parentview ?? '').trim() === parentview)
    .sort((a, b) => Number(a.screen_order ?? 99) - Number(b.screen_order ?? 99));

  return (
    <SafeAreaView style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{title}</Text>
        <TouchableOpacity style={styles.headerIcon} onPress={() => sync()}>
          {syncing
            ? <ActivityIndicator size="small" color="#fff" />
            : <Ionicons name="refresh" size={22} color="#fff" />}
        </TouchableOpacity>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={styles.row}
        ListEmptyComponent={
          syncing
            ? <View style={styles.loader}><ActivityIndicator size="large" color={PRIMARY} /></View>
            : <View style={styles.empty}><Text style={styles.emptyText}>No items found</Text></View>
        }
        renderItem={({ item }) => {
          // check if this item has children to drill into
          const hasChildren = (rows as DashRow[]).some(
            (r) => String(r.parentview ?? '') === String(item.Dashcaption ?? ''),
          );

          return (
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.85}
              onPress={() => {
                if (hasChildren) {
                  navigation.push('SubItems', {
                    parentview: String(item.Dashcaption ?? ''),
                    title: String(item.Dashcaption ?? item.id),
                  });
                } else {
                  navigation.navigate('Landing', {
                    title: String(item.Dashcaption ?? item.id),
                    appviewsheet: String(item.appviewsheet ?? ''),
                  });
                }
              }}
            >
              <View style={styles.cardImageArea}>
                <CardIcon value={item.dash_image} />
                <Text style={styles.cardLabel}>{String(item.Dashcaption ?? item.id)}</Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />
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
  headerIcon: { marginLeft: 14 },
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
  cardEmoji: { fontSize: 64 },
  cardImage: { width: CARD_SIZE * 0.65, height: CARD_SIZE * 0.65 },
  cardLabel: { fontSize: 13, fontWeight: '500', color: '#222', marginTop: 6, textAlign: 'center', paddingHorizontal: 6 },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 80 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 80 },
  emptyText: { fontSize: 15, color: '#888' },
});
