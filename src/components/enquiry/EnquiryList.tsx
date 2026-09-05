import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  View, Text, TextInput, StyleSheet,
  SafeAreaView, TouchableOpacity, ActivityIndicator, SectionList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useSheet } from '../../hooks/useSheet';
import { enquiryRepository } from '../../db/repositories';
import type { EnquiryModel } from '../../db/models/enquiry.model';
import EnquiryRow from './EnquiryRow';
import { Colors, KStyles } from '../../styles/kutties-styles';
import { SHEETS } from '../../utils/constants';

const PRIMARY = Colors.primary;
const GREEN   = '#2e7d32';
const AMBER   = '#e65100';

type FilterKey = 'all' | 'pending' | 'admitted';

const FILTERS: { key: FilterKey; label: string; icon: string }[] = [
  { key: 'all',      label: 'All',      icon: 'list-outline' },
  { key: 'pending',  label: 'Pending',  icon: 'time-outline' },
  { key: 'admitted', label: 'Admitted', icon: 'checkmark-circle-outline' },
];

interface Props {
  navigation: any;
  route?: any;
}

interface Section {
  title: string;
  data: EnquiryModel[];
}

/** Group a flat list into "Month Year" sections, preserving insertion order. */
function toSections(items: EnquiryModel[]): Section[] {
  const map = new Map<string, EnquiryModel[]>();
  for (const item of items) {
    const d = new Date(item.enqDate);
    const key = isNaN(d.getTime())
      ? 'Unknown'
      : d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  }
  return Array.from(map.entries()).map(([title, data]) => ({ title, data }));
}

export default function EnquiryList({ navigation }: Props) {
  const { syncing, sync } = useSheet(SHEETS.ENQUIRIES);
  const synced = useRef(false);
  const [search, setSearch]   = useState('');
  const [items, setItems]     = useState<EnquiryModel[]>([]);
  const [filter, setFilter]   = useState<FilterKey>('all');

  // Set of expanded section titles — empty = all collapsed
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggleSection = useCallback((title: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      return next;
    });
  }, []);

  // Collapse all when the filter chip changes
  const handleFilterChange = useCallback((key: FilterKey) => {
    setFilter(key);
    setExpanded(new Set());
  }, []);

  const loadItems = useCallback(async () => {
    const results = search.trim()
      ? await enquiryRepository.search(search)
      : await enquiryRepository.findAll();
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

  // When search is active expand all sections so results are never hidden
  useEffect(() => {
    if (search.trim()) {
      setExpanded(new Set(toSections(filtered).map(s => s.title)));
    }
  }, [search, items, filter]);

  // Apply admission filter first, then group by month
  const filtered = useMemo(() => {
    if (filter === 'admitted') return items.filter(i => i.admissionTaken);
    if (filter === 'pending')  return items.filter(i => !i.admissionTaken);
    return items;
  }, [items, filter]);

  const allSections = useMemo(() => toSections(filtered), [filtered]);

  // Collapsed sections get an empty data array; header still renders
  const sections: Section[] = useMemo(
    () => allSections.map(s => ({
      title: s.title,
      data: expanded.has(s.title) ? s.data : [],
    })),
    [allSections, expanded],
  );

  // Counts for badges on filter chips
  const admittedCount = useMemo(() => items.filter(i => i.admissionTaken).length,  [items]);
  const pendingCount  = useMemo(() => items.filter(i => !i.admissionTaken).length, [items]);

  const totalCount = items.length;
  const canGoBack  = navigation.canGoBack();

  const renderItem = useCallback(
    ({ item, index }: { item: EnquiryModel; index: number }) => (
      <EnquiryRow
        item={item}
        index={index}
        onPress={(e) => navigation.navigate('EnquiryDetails', { item: e })}
      />
    ),
    [navigation],
  );

  const renderSectionHeader = useCallback(
    ({ section }: { section: Section }) => {
      const fullSection = allSections.find(s => s.title === section.title);
      const count = fullSection?.data.length ?? 0;
      const isOpen = expanded.has(section.title);
      return (
        <TouchableOpacity
          style={styles.sectionHeader}
          onPress={() => toggleSection(section.title)}
          activeOpacity={0.7}
        >
          <View style={styles.sectionLeft}>
            <Ionicons
              name={isOpen ? 'chevron-down' : 'chevron-forward'}
              size={14}
              color="#3a5275"
              style={{ marginRight: 6 }}
            />
            <Text style={styles.sectionTitle}>{section.title}</Text>
          </View>
          <View style={styles.sectionBadge}>
            <Text style={styles.sectionBadgeText}>{count}</Text>
          </View>
        </TouchableOpacity>
      );
    },
    [allSections, expanded, toggleSection],
  );

  return (
    <SafeAreaView style={KStyles.listRoot}>
      {/* Header */}
      <View style={KStyles.header}>
        {canGoBack ? (
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
        ) : (
          <Ionicons name="mail-open-outline" size={24} color="#fff" />
        )}
        <View style={styles.titleRow}>
          <Text style={KStyles.headerTitle}>Enquiries</Text>
          {totalCount > 0 && (
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{totalCount}</Text>
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

      {/* Search */}
      <View style={KStyles.searchRow}>
        <Ionicons name="search" size={18} color="#999" style={KStyles.searchIcon} />
        <TextInput
          style={KStyles.searchInput}
          placeholder="Search enquiries…"
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
        {FILTERS.map(f => {
          const isActive = filter === f.key;
          const chipColor = f.key === 'admitted' ? GREEN : f.key === 'pending' ? AMBER : PRIMARY;
          const count = f.key === 'admitted' ? admittedCount
                      : f.key === 'pending'  ? pendingCount
                      : totalCount;
          return (
            <TouchableOpacity
              key={f.key}
              style={[
                styles.chip,
                isActive && { backgroundColor: chipColor, borderColor: chipColor },
              ]}
              onPress={() => handleFilterChange(f.key)}
              activeOpacity={0.75}
            >
              <Ionicons
                name={f.icon as any}
                size={13}
                color={isActive ? '#fff' : '#666'}
                style={{ marginRight: 4 }}
              />
              <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                {f.label}
              </Text>
              {count > 0 && (
                <View style={[styles.chipBadge, isActive && styles.chipBadgeActive]}>
                  <Text style={[styles.chipBadgeText, isActive && styles.chipBadgeTextActive]}>
                    {count}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {items.length === 0 && syncing ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={PRIMARY} />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="mail-open-outline" size={48} color="#ccc" />
          <Text style={KStyles.emptyText}>
            {filter === 'admitted' ? 'No admissions yet'
           : filter === 'pending'  ? 'No pending enquiries'
           : 'No enquiries found'}
          </Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(e) => e.id}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={{ paddingBottom: 80 }}
        />
      )}

      {/* FAB — add */}
      <TouchableOpacity
        style={KStyles.fab}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('EnquiryForm', { mode: 'add' })}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center:     { ...KStyles.center, gap: 12, paddingTop: 80 },
  titleRow:   { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, marginLeft: 12 },
  countBadge: {
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
  chip: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 11, paddingVertical: 5,
    borderRadius: 16, borderWidth: 1, borderColor: '#ddd',
    backgroundColor: '#f5f5f5',
  },
  chipText:            { fontSize: 12, fontWeight: '600', color: '#555' },
  chipTextActive:      { color: '#fff' },
  chipBadge:           { marginLeft: 5, backgroundColor: '#e0e0e0', borderRadius: 8, paddingHorizontal: 5, paddingVertical: 1 },
  chipBadgeActive:     { backgroundColor: 'rgba(255,255,255,0.3)' },
  chipBadgeText:       { fontSize: 10, fontWeight: '700', color: '#555' },
  chipBadgeTextActive: { color: '#fff' },

  // Section header
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 8,
    backgroundColor: '#eef2f7',
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#dde3ec',
  },
  sectionLeft:      { flexDirection: 'row', alignItems: 'center' },
  sectionTitle:     { fontSize: 12, fontWeight: '700', color: '#3a5275', letterSpacing: 0.3 },
  sectionBadge:     { backgroundColor: '#3a5275', borderRadius: 9, paddingHorizontal: 7, paddingVertical: 1 },
  sectionBadgeText: { fontSize: 10, fontWeight: '700', color: '#fff' },
});
