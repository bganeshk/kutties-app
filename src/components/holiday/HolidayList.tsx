import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  View, TextInput, StyleSheet, Text,
  SafeAreaView, TouchableOpacity, ActivityIndicator, SectionList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useSheet } from '../../hooks/useSheet';
import { holidayRepository } from '../../db/repositories';
import type { HolidayModel } from '../../db/models/holiday.model';
import HolidayRow, { DOT_GREEN, DOT_YELLOW } from './HolidayRow';
import { Colors, KStyles } from '../../styles/kutties-styles';
import { SHEETS } from '../../utils/constants';
import { COLS, DEFAULT_VISIBLE } from './cols';
import type { ColKey } from './cols';

const PRIMARY = Colors.primary;

type FilterKey = 'all' | 'kg' | 'daycare' | 'tuition' | 'teachers';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all',      label: 'All' },
  { key: 'kg',       label: 'KG' },
  { key: 'daycare',  label: 'Daycare' },
  { key: 'tuition',  label: 'Tuition' },
  { key: 'teachers', label: 'Teachers' },
];

interface Props {
  navigation: any;
  route?: any;
}

function toSections(items: HolidayModel[]) {
  const map = new Map<string, HolidayModel[]>();
  for (const item of items) {
    const d = new Date(item.date);
    const key = isNaN(d.getTime())
      ? 'Unknown'
      : d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  }
  return Array.from(map.entries()).map(([title, data]) => ({ title, data }));
}

export default function HolidayList({ navigation }: Props) {
  const { syncing, sync } = useSheet(SHEETS.HOLIDAY_LIST);
  const synced = useRef(false);
  const [search, setSearch]         = useState('');
  const [items, setItems]           = useState<HolidayModel[]>([]);
  const [sortAsc, setSortAsc]       = useState(true);
  const [filter, setFilter]         = useState<FilterKey>('all');
  const [visibleCols, setVisibleCols] = useState<Set<ColKey>>(new Set(DEFAULT_VISIBLE));

  const toggleCol = useCallback((key: ColKey) => {
    setVisibleCols(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const loadItems = useCallback(async () => {
    const results = search.trim()
      ? await holidayRepository.search(search)
      : await holidayRepository.findAll();
    setItems(results);
  }, [search]);

  useEffect(() => { loadItems(); }, [loadItems]);
  useFocusEffect(useCallback(() => { loadItems(); }, [loadItems]));

  useEffect(() => {
    if (!synced.current) {
      synced.current = true;
      sync().then(() => loadItems());
    }
  }, []);

  const filtered = useMemo(() => {
    let list = items;
    if (filter === 'kg')       list = list.filter(h => h.kg);
    if (filter === 'daycare')  list = list.filter(h => h.daycare);
    if (filter === 'tuition')  list = list.filter(h => h.tuition);
    if (filter === 'teachers') list = list.filter(h => h.teachers !== 'no');
    return [...list].sort((a, b) => {
      const diff = new Date(a.date).getTime() - new Date(b.date).getTime();
      return sortAsc ? diff : -diff;
    });
  }, [items, filter, sortAsc]);

  const sections = useMemo(() => toSections(filtered), [filtered]);

  const canGoBack = navigation.canGoBack();

  const renderItem = useCallback(
    ({ item, index }: { item: HolidayModel; index: number }) => (
      <HolidayRow
        item={item}
        index={index}
        visibleCols={visibleCols}
        onPress={(h) => navigation.navigate('HolidayDetails', { item: h })}
      />
    ),
    [navigation, visibleCols],
  );

  const renderSectionHeader = useCallback(
    ({ section }: { section: { title: string } }) => (
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{section.title}</Text>
      </View>
    ),
    [],
  );

  // ── List header: legend + column headers ────────────────────────────────────
  const ListHeader = (
    <>
      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: DOT_GREEN }]} />
          <Text style={styles.legendText}>Holiday applies</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: DOT_YELLOW }]} />
          <Text style={styles.legendText}>Optional</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, styles.legendDotEmpty]} />
          <Text style={styles.legendText}>Not applicable</Text>
        </View>
        <Text style={styles.legendHint}>Tap column to show/hide</Text>
      </View>

      {/* Column header row */}
      <View style={styles.colHeader}>
        {/* Date — always visible, also the sort toggle */}
        <TouchableOpacity
          style={styles.dateHCell}
          onPress={() => setSortAsc(v => !v)}
          hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
        >
          <Text style={styles.hCellText}>Date</Text>
          <Ionicons
            name={sortAsc ? 'arrow-up' : 'arrow-down'}
            size={11}
            color="#555"
            style={{ marginLeft: 2 }}
          />
        </TouchableOpacity>

        {/* Optional columns */}
        {COLS.map(col => {
          const active = visibleCols.has(col.key);
          return (
            <TouchableOpacity
              key={col.key}
              style={[
                styles.colHCell,
                { flex: col.flex },
                !active && styles.colHCellHidden,
              ]}
              onPress={() => toggleCol(col.key)}
              hitSlop={{ top: 8, bottom: 8, left: 2, right: 2 }}
            >
              <Text
                style={[styles.hCellText, !active && styles.hCellTextHidden]}
                numberOfLines={1}
              >
                {active ? col.label : col.label.charAt(0)}
              </Text>
              <Ionicons
                name={active ? 'chevron-up' : 'chevron-down'}
                size={9}
                color={active ? '#555' : '#aaa'}
                style={{ marginLeft: 1 }}
              />
            </TouchableOpacity>
          );
        })}
      </View>
    </>
  );

  return (
    <SafeAreaView style={KStyles.listRoot}>
      {/* App header */}
      <View style={KStyles.header}>
        {canGoBack ? (
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
        ) : (
          <Ionicons name="sunny" size={24} color="#fff" />
        )}
        <View style={styles.titleRow}>
          <Text style={KStyles.headerTitle}>Holiday List</Text>
          {filtered.length > 0 && (
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{filtered.length}</Text>
            </View>
          )}
        </View>
        <View style={KStyles.headerActions}>
          <TouchableOpacity onPress={() => sync()} style={KStyles.headerIcon}>
            {syncing
              ? <ActivityIndicator size="small" color="#fff" />
              : <Ionicons name="refresh" size={22} color="#fff" />}
          </TouchableOpacity>
        </View>
      </View>

      {/* Search bar */}
      <View style={KStyles.searchRow}>
        <Ionicons name="search" size={18} color="#999" style={KStyles.searchIcon} />
        <TextInput
          style={KStyles.searchInput}
          placeholder="Search holidays…"
          placeholderTextColor="#bbb"
          value={search}
          onChangeText={setSearch}
          clearButtonMode="while-editing"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color="#bbb" />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter chips */}
      <View style={styles.filterRow}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterChip, filter === f.key && styles.filterChipActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[styles.filterChipText, filter === f.key && styles.filterChipTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {items.length === 0 && syncing ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={PRIMARY} />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="sunny-outline" size={48} color="#ccc" />
          <Text style={KStyles.emptyText}>No holidays found</Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(h) => h.id}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          ListHeaderComponent={ListHeader}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={{ paddingBottom: 80 }}
        />
      )}

      {/* FAB — add */}
      <TouchableOpacity
        style={KStyles.fab}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('HolidayForm', { mode: 'add' })}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center:   { ...KStyles.center, gap: 12, paddingTop: 80 },

  // App header
  titleRow:  { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, marginLeft: 12 },
  countBadge:{
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 10, paddingHorizontal: 7, paddingVertical: 1,
  },
  countText: { fontSize: 11, fontWeight: '700', color: '#fff' },

  // Filter chips
  filterRow: {
    flexDirection: 'row', gap: 8,
    paddingHorizontal: 16, paddingVertical: 8,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#e5e7eb',
  },
  filterChip:         { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 14, backgroundColor: '#f0f0f0' },
  filterChipActive:   { backgroundColor: PRIMARY },
  filterChipText:     { fontSize: 12, color: '#555', fontWeight: '500' },
  filterChipTextActive: { color: '#fff' },

  // Legend
  legend: {
    flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 12,
    paddingHorizontal: 16, paddingVertical: 7,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#e5e7eb',
  },
  legendItem:     { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot:      { width: 10, height: 10, borderRadius: 5 },
  legendDotEmpty: { backgroundColor: '#e0e0e0', borderWidth: 1, borderColor: '#ccc' },
  legendText:     { fontSize: 11, color: '#666' },
  legendHint:     { fontSize: 10, color: '#aaa', marginLeft: 'auto' },

  // Column header
  colHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 8, paddingHorizontal: 16,
    backgroundColor: '#f7f8fa',
    borderBottomWidth: 1, borderBottomColor: '#e5e7eb',
  },
  dateHCell: {
    flex: 3, flexDirection: 'row', alignItems: 'center',
  },
  colHCell: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 2,
  },
  colHCellHidden: { opacity: 0.45 },
  hCellText:      { fontSize: 12, fontWeight: '700', color: '#555' },
  hCellTextHidden:{ color: '#aaa' },

  // Section header
  sectionHeader: {
    paddingHorizontal: 16, paddingVertical: 5,
    backgroundColor: '#eef2f7',
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#dde3ec',
  },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: '#3a5275', letterSpacing: 0.3 },
});
