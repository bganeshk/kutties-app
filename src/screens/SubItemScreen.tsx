import React, { useEffect, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Image, Dimensions, SafeAreaView, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSheet } from '../hooks/useSheet';
import { getIconForCaption } from '../utils/iconMap';
import type { IconEntry } from '../utils/iconMap';
import { resolveScreen, isStaffAttendanceCaption } from '../navigation/screenRegistry';
import { Colors, KStyles } from '../styles/kutties-styles';
import { SHEETS } from '../utils/constants';

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

function CardIcon({ caption, value }: { caption: string | undefined; value: string | undefined }) {
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

interface Props {
  navigation: any;
  route: { params: { parentview: string; title: string } };
}

export default function SubItemScreen({ navigation, route }: Props) {
  const { parentview, title } = route.params;
  const { rows, syncing, sync } = useSheet(SHEETS.DASHBOARD);
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
                   const appviewsheet = String(item.appviewsheet ?? '');
                   const screenName = resolveScreen(appviewsheet);
                   console.log(`[SubItems] caption="${item.Dashcaption}" appviewsheet="${appviewsheet}" → screen="${screenName}"`);
                   if (screenName === 'Landing') {
                   navigation.navigate('Landing', {
                     title: String(item.Dashcaption ?? item.id),
                     appviewsheet,
                   });
                 } else {
                   const caption = String(item.Dashcaption ?? '');
                   navigation.navigate(screenName, {
                     headerTitle: caption,
                     ...(isStaffAttendanceCaption(caption) && { staffMode: true }),
                   });
                 }
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  header: KStyles.header,
  headerTitle: KStyles.headerTitle,
  headerIcon: KStyles.headerIcon,
  grid: { padding: 12 },
  row: { justifyContent: 'space-between', marginBottom: 12 },
  card: { ...KStyles.card, width: CARD_SIZE },
  cardImageArea: {
    height: CARD_SIZE * 0.95, alignItems: 'center',
    justifyContent: 'center', backgroundColor: '#fefefe',
  },
  cardEmoji: { fontSize: 64 },
  cardImage: { width: CARD_SIZE * 0.70, height: CARD_SIZE * 0.70 },
  cardLabel: { fontSize: 13, fontWeight: '500', color: '#222', marginTop: 3, textAlign: 'center', paddingHorizontal: 6 },
  loader: { ...KStyles.center, marginTop: 80 },
  empty: { ...KStyles.center, marginTop: 80 },
  emptyText: { fontSize: 15, color: Colors.muted },
});
