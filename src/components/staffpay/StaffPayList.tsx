import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, SafeAreaView,
  TextInput, ActivityIndicator, StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Colors, KStyles } from '../../styles/kutties-styles';
import { SHEETS } from '../../utils/constants';
import {
  staffPayRepository, teacherRepository, employeeRepository,
} from '../../db/repositories';
import { syncSheet } from '../../sync/sync.service';
import type { StaffPayModel } from '../../db/models/staffpay.model';
import StaffPayRow from './StaffPayRow';

const PRIMARY = Colors.primary;

// Canonical month-year sort key: "MMM YYYY" → "YYYY-MM" for lexicographic ordering
const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function monthSortKey(m: string): string {
  const match = m.trim().match(/^([A-Za-z]{3})\s+(\d{4})$/);
  if (!match) return m;
  const idx = MONTH_LABELS.findIndex((l) => l.toLowerCase() === match[1].toLowerCase());
  return idx === -1 ? m : `${match[2]}-${String(idx + 1).padStart(2, '0')}`;
}

interface Props {
  navigation: any;
  route?: {
    params?: {
      staffEmail?: string;
      staffName?: string;
      headerTitle?: string;
    };
  };
}

export default function StaffPayList({ navigation, route }: Props) {
  const staffEmail  = route?.params?.staffEmail;
  const staffName   = route?.params?.staffName;
  const headerTitle = route?.params?.headerTitle ?? 'Staff Pay';

  const [items,         setItems]         = useState<StaffPayModel[]>([]);
  const [search,        setSearch]        = useState('');
  const [activeMonth,   setActiveMonth]   = useState<string | null>(null);
  const [loading,       setLoading]       = useState(true);
  const [syncing,       setSyncing]       = useState(false);
  // email → display name lookup built from staff sheet
  const [nameMap,       setNameMap]       = useState<Record<string, string>>({});
  const synced = useRef(false);

  // Build email→name map from staff sheet
  const buildNameMap = useCallback(async () => {
    const [teachers, employees] = await Promise.all([
      teacherRepository.findAll(),
      employeeRepository.findAll(),
    ]);
    const map: Record<string, string> = {};
    [...teachers, ...employees].forEach((s) => {
      if (s.email && s.name) {
        map[s.email.toLowerCase()] = s.name;
      }
    });
    setNameMap(map);
  }, []);

  // Run once on mount
  useEffect(() => { buildNameMap(); }, [buildNameMap]);

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const rows = staffEmail
        ? await staffPayRepository.findByStaff(staffEmail)
        : await staffPayRepository.findAll();
      // Sort newest pay date first
      rows.sort((a, b) => (b.payDate ?? '').localeCompare(a.payDate ?? ''));
      setItems(rows);
    } finally {
      setLoading(false);
    }
  }, [staffEmail]);

  const doSync = useCallback(async () => {
    setSyncing(true);
    try {
      // Sync both sheets so staff names are always fresh
      await Promise.all([syncSheet(SHEETS.STAFF_PAY), syncSheet(SHEETS.STAFF)]);
      await Promise.all([loadItems(), buildNameMap()]);
    } finally {
      setSyncing(false);
    }
  }, [loadItems, buildNameMap]);

  // Sync once on first mount
  useEffect(() => {
    if (!synced.current) {
      synced.current = true;
      doSync();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Reload when screen is focused
  useFocusEffect(
    useCallback(() => { loadItems(); }, [loadItems]),
  );

  // If the active month no longer exists in the new data, clear it
  useEffect(() => {
    if (activeMonth) {
      const exists = items.some((r) => (r.payMonth ?? '').trim() === activeMonth);
      if (!exists) setActiveMonth(null);
    }
  }, [items, activeMonth]);

  // ── Filtering ────────────────────────────────────────────────────────────
  const filtered = React.useMemo(() => {
    let result = items;
    if (activeMonth) {
      result = result.filter((r) => (r.payMonth ?? '').trim() === activeMonth);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((r) =>
        [r.staff, r.recptNo, r.payMode, r.payMonth, r.remarks]
          .some((v) => String(v ?? '').toLowerCase().includes(q)),
      );
    }
    return result;
  }, [items, activeMonth, search]);

  // ── Summary totals ───────────────────────────────────────────────────────
  const totalAmount = filtered.reduce((sum, r) => sum + (r.amount ?? 0), 0);

  function resolveName(email: string | undefined): string | undefined {
    if (!email) return undefined;
    return nameMap[email.toLowerCase()];
  }

  return (
    <SafeAreaView style={KStyles.listRoot}>
      {/* Header */}
      <View style={KStyles.header}>
        <TouchableOpacity
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={KStyles.headerTitle} numberOfLines={1}>
          {staffName ? `${staffName} — Pay` : headerTitle}
        </Text>
        <TouchableOpacity
          onPress={() => doSync()}
          style={KStyles.headerIcon}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          {syncing
            ? <ActivityIndicator size="small" color="#fff" />
            : <Ionicons name="refresh" size={22} color="#fff" />}
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={KStyles.searchRow}>
        <Ionicons name="search" size={16} color={Colors.muted} style={KStyles.searchIcon} />
        <TextInput
          style={KStyles.searchInput}
          placeholder="Search by name, month, mode…"
          placeholderTextColor={Colors.muted}
          value={search}
          onChangeText={setSearch}
          clearButtonMode="while-editing"
        />
      </View>

      {/* Summary banner */}
      {filtered.length > 0 && (
        <View style={styles.summaryBanner}>
          <Text style={styles.summaryText}>
            {filtered.length} record{filtered.length !== 1 ? 's' : ''}
            {activeMonth ? ` · ${activeMonth}` : ''}
          </Text>
          <Text style={styles.summaryAmount}>
            ₹{totalAmount.toLocaleString('en-IN')}
          </Text>
        </View>
      )}

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={PRIMARY} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <StaffPayRow
              item={item}
              staffName={resolveName(item.staff)}
              activeMonth={activeMonth}
              onPress={(r) => navigation.navigate('StaffPayDetails', { item: r })}
              onMonthPress={(m) => setActiveMonth((prev) => (prev === m ? null : m))}
            />
          )}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', marginTop: 60 }}>
              <Ionicons name="wallet-outline" size={48} color={Colors.muted} />
              <Text style={[KStyles.emptyText, { marginTop: 12 }]}>
                {activeMonth ? `No records for ${activeMonth}` : 'No pay records found'}
              </Text>
            </View>
          }
        />
      )}

      {/* FAB — add new record */}
      <TouchableOpacity
        style={KStyles.fab}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('StaffPayForm', {
          mode: 'add',
          prefilledStaff: staffEmail,
        })}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // ── Summary banner ───────────────────────────────────────────────────────────
  summaryBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: '#A5D6A7',
  },
  summaryText:   { fontSize: 13, fontWeight: '600', color: '#2E7D32' },
  summaryAmount: { fontSize: 13, fontWeight: '700', color: '#1B5E20' },
});
