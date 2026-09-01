import React, { useEffect, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Image, Dimensions, SafeAreaView, StatusBar, ActivityIndicator, // Image kept as fallback
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSheet } from '../hooks/useSheet';
import { getIconForCaption } from '../utils/iconMap';
import type { IconEntry } from '../utils/iconMap';
import { resolveScreen, isStaffAttendanceCaption, isLeaveCaption } from '../navigation/screenRegistry';
import { Colors, KStyles } from '../styles/kutties-styles';
import { SHEETS } from '../utils/constants';
import { ensureSheets } from '../sync/sync.service';

const PRIMARY = Colors.primary;
const { width } = Dimensions.get('window');
const CARD_SIZE = (width - 48) / 1.95;
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

interface CardIconProps { caption: string | undefined; value: string | undefined }
function CardIcon({ caption, value }: CardIconProps) {
  const entry: IconEntry | null = caption ? getIconForCaption(caption) : null;
  if (entry) {
    if (typeof entry === 'string') {
      return <Text style={styles.cardEmoji}>{entry}</Text>;
    }
    return <Ionicons name={entry.ionicon} size={CARD_SIZE * 0.38} color={entry.color} />;
  }
  if (value) {
    return (
      <Image
        source={{ uri: resolveImageUri(value) }}
        style={styles.cardImage}
        resizeMode="contain"
      />
    );
  }
  return <Text style={styles.cardEmoji}>📌</Text>;
}

interface Props { navigation?: any }

export default function HomeScreen({ navigation }: Props) {
  const { rows, syncing, error, sync } = useSheet(SHEETS.DASHBOARD);
  const synced = useRef(false);

  // Ensure sheets exist in the workbook, then sync dashboard on first mount
  useEffect(() => {
    if (!synced.current) {
      synced.current = true;
      ensureSheets().catch(() => {}).finally(() => sync());
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
          renderItem={({ item }) => {
            const hasChildren = (rows as DashRow[]).some(
              (r) => String(r.parentview ?? '') === String(item.Dashcaption ?? ''),
            );
            const appviewsheet = String(item.appviewsheet ?? '');
            const screenName = resolveScreen(appviewsheet);

            return (
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.85}
              onPress={() => {
                const caption = String(item.Dashcaption ?? '');
                // Try appviewsheet first, fall back to caption if unresolved
                let resolvedScreen = screenName;
                if (resolvedScreen === 'Landing') resolvedScreen = resolveScreen(caption);

                if (hasChildren) {
                  navigation?.navigate('SubItems', {
                    parentview: caption,
                    title: caption || String(item.id),
                  });
                } else if (resolvedScreen !== 'Landing') {
                  navigation?.navigate(resolvedScreen, {
                    headerTitle: caption,
                    ...(isStaffAttendanceCaption(caption) && { staffMode: true }),
                    ...(isLeaveCaption(caption) && { leaveMode: true, staffMode: true }),
                  });
                } else {
                  navigation?.navigate('Landing', {
                    title: caption || String(item.id),
                    appviewsheet,
                  });
                }
              }}
            >
              <View style={styles.cardImageArea}>
                <CardIcon caption={String(item.Dashcaption ?? '')} value={item.dash_image} />
                <Text style={styles.cardLabel}>{String(item.Dashcaption ?? item.id)}</Text>
              </View>
            </TouchableOpacity>
            );
          }}
        />
      )}

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  header: KStyles.header,
  headerTitle: KStyles.headerTitle,
  headerActions: { flexDirection: 'row' },
  headerIcon: KStyles.headerIcon,
  errorBanner: KStyles.errorBanner,
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loaderText: { color: Colors.muted, fontSize: 14 },
  grid: { padding: 12 },
  row: { justifyContent: 'space-between', marginBottom: 12 },
  card: { ...KStyles.card, width: CARD_SIZE },
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
