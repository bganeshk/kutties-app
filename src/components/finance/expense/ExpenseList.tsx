import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  View, Text, SectionList, TouchableOpacity, SafeAreaView,
  TextInput, ActivityIndicator, StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Colors, KStyles } from '../../../styles/kutties-styles';
import { SHEETS } from '../../../utils/constants';
import { expenseRepository } from '../../../db/repositories';
import { syncSheet } from '../../../sync/sync.service';
import type { ExpenseModel } from '../../../db/models/expense.model';
import ExpenseRow from './ExpenseRow';

const PRIMARY = Colors.primary;

interface Props {
  navigation: any;
  route?:     any;
}

// ── Grouping helpers ──────────────────────────────────────────────────────────

const MONTH_SHORT = [
  'Jan','Feb','Mar','Apr','May','Jun',
  'Jul','Aug','Sep','Oct','Nov','Dec',
];

/** Normalise any date string → "YYYY-MM" key. Handles:
 *  - ISO:       "2026-09-05"  → "2026-09"
 *  - DD/MMM/YY: "05/Sep/2026" → "2026-09"
 */
function monthOf(iso: string | undefined): string {
  if (!iso) return '0000-00';
  // ISO format YYYY-MM-DD
  if (/^\d{4}-\d{2}/.test(iso)) return iso.slice(0, 7);
  // DD/MMM/YYYY or DD/MMM/YY
  const dmy = iso.match(/^(\d{1,2})\/([A-Za-z]{3})\/(\d{2,4})$/);
  if (dmy) {
    const monthIdx = MONTH_SHORT.findIndex(
      (s) => s.toLowerCase() === dmy[2].toLowerCase(),
    );
    if (monthIdx >= 0) {
      const y = dmy[3].length === 2 ? `20${dmy[3]}` : dmy[3];
      const mm = String(monthIdx + 1).padStart(2, '0');
      return `${y}-${mm}`;
    }
  }
  return '0000-00';
}

function monthLabel(monthKey: string): string {
  if (!monthKey || monthKey === '0000-00') return 'Unknown';
  const [y, m] = monthKey.split('-');
  const short = MONTH_SHORT[Number(m) - 1];
  return short ? `${short}-${y}` : monthKey;
}

/** A flat SectionList item — either a TypeHeader or an ExpenseModel row. */
type ListItem =
  | { kind: 'typeHeader'; typeKey: string; count: number; total: number }
  | { kind: 'row'; expense: ExpenseModel };

interface MonthSection {
  monthKey:   string;
  title:      string;   // display label
  count:      number;
  total:      number;
  data:       ListItem[];
}

/**
 * Build a two-level section structure: Month → ExpenseType.
 * Each month section's `data` contains interleaved TypeHeader and row items
 * so SectionList only needs one level.
 * expandedMonths  — set of monthKey strings that are open
 * expandedTypes   — set of "monthKey|typeKey" strings that are open
 */
function buildSections(
  items: ExpenseModel[],
  expandedMonths: Set<string>,
  expandedTypes:  Set<string>,
): MonthSection[] {
  // Group by month (newest first)
  const monthMap = new Map<string, ExpenseModel[]>();
  for (const item of items) {
    const mk = monthOf(item.expenseDate);
    if (!monthMap.has(mk)) monthMap.set(mk, []);
    monthMap.get(mk)!.push(item);
  }
  const sortedMonths = [...monthMap.keys()].sort((a, b) => b.localeCompare(a));

  return sortedMonths.map((mk) => {
    const monthItems = monthMap.get(mk)!;
    const monthTotal = monthItems.reduce((s, r) => s + (r.amount ?? 0), 0);

    const data: ListItem[] = [];

    if (expandedMonths.has(mk)) {
      // Group by expenseType within this month (alphabetical)
      const typeMap = new Map<string, ExpenseModel[]>();
      for (const item of monthItems) {
        const tk = (item.expenseType ?? 'Other').trim();
        if (!typeMap.has(tk)) typeMap.set(tk, []);
        typeMap.get(tk)!.push(item);
      }
      const sortedTypes = [...typeMap.keys()].sort((a, b) => a.localeCompare(b));

      for (const tk of sortedTypes) {
        const typeItems = typeMap.get(tk)!;
        const typeTotal = typeItems.reduce((s, r) => s + (r.amount ?? 0), 0);
        const compositeKey = `${mk}|${tk}`;

        // Type sub-header
        data.push({ kind: 'typeHeader', typeKey: tk, count: typeItems.length, total: typeTotal });

        // Rows — only when this type sub-section is expanded
        if (expandedTypes.has(compositeKey)) {
          for (const expense of typeItems) {
            data.push({ kind: 'row', expense });
          }
        }
      }
    }

    return {
      monthKey: mk,
      title:    monthLabel(mk),
      count:    monthItems.length,
      total:    monthTotal,
      data,
    };
  });
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ExpenseList({ navigation }: Props) {
  const [items,          setItems]          = useState<ExpenseModel[]>([]);
  const [search,         setSearch]         = useState('');
  const [loading,        setLoading]        = useState(true);
  const [syncing,        setSyncing]        = useState(false);
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());
  const [expandedTypes,  setExpandedTypes]  = useState<Set<string>>(new Set());
  const synced = useRef(false);

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await expenseRepository.findAll();
      rows.sort((a, b) => (b.expenseDate ?? '').localeCompare(a.expenseDate ?? ''));
      setItems(rows);
    } finally {
      setLoading(false);
    }
  }, []);

  const doSync = useCallback(async () => {
    setSyncing(true);
    try {
      await syncSheet(SHEETS.EXPENSE);
      await loadItems();
    } finally {
      setSyncing(false);
    }
  }, [loadItems]);

  useEffect(() => {
    if (!synced.current) { synced.current = true; doSync(); }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useFocusEffect(useCallback(() => { loadItems(); }, [loadItems]));

  // ── Filtering ──────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter((r) =>
      [r.recptNo, r.expenseType, r.paymentMode, r.paidTo, r.remarks]
        .some((v) => String(v ?? '').toLowerCase().includes(q)),
    );
  }, [items, search]);

  // ── Auto-expand all when searching ────────────────────────────────────────
  useEffect(() => {
    if (search.trim()) {
      const allMonths = new Set(filtered.map((r) => monthOf(r.expenseDate)));
      const allTypes  = new Set(
        filtered.map((r) => `${monthOf(r.expenseDate)}|${(r.expenseType ?? 'Other').trim()}`),
      );
      setExpandedMonths(allMonths);
      setExpandedTypes(allTypes);
    }
  }, [search, filtered]);

  // ── Toggle helpers ─────────────────────────────────────────────────────────
  const toggleMonth = useCallback((mk: string) => {
    setExpandedMonths((prev) => {
      const next = new Set(prev);
      if (next.has(mk)) next.delete(mk); else next.add(mk);
      return next;
    });
  }, []);

  const toggleType = useCallback((mk: string, tk: string) => {
    const compositeKey = `${mk}|${tk}`;
    setExpandedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(compositeKey)) next.delete(compositeKey); else next.add(compositeKey);
      return next;
    });
  }, []);

  // ── Build sections ─────────────────────────────────────────────────────────
  const sections = useMemo(
    () => buildSections(filtered, expandedMonths, expandedTypes),
    [filtered, expandedMonths, expandedTypes],
  );

  // Overall summary across filtered items
  const totalAmount = filtered.reduce((s, r) => s + (r.amount ?? 0), 0);

  // ── Renderers ──────────────────────────────────────────────────────────────
  const renderSectionHeader = useCallback(
    ({ section }: { section: MonthSection }) => {
      const isOpen = expandedMonths.has(section.monthKey);
      return (
        <TouchableOpacity
          style={styles.monthHeader}
          onPress={() => toggleMonth(section.monthKey)}
          activeOpacity={0.75}
        >
          <View style={styles.monthHeaderLeft}>
            <Ionicons
              name={isOpen ? 'chevron-down' : 'chevron-forward'}
              size={14}
              color={PRIMARY}
              style={{ marginRight: 6 }}
            />
            <Text style={styles.monthHeaderTitle}>{section.title}</Text>
          </View>
          <View style={styles.monthHeaderRight}>
            <View style={styles.monthBadge}>
              <Text style={styles.monthBadgeText}>{section.count}</Text>
            </View>
            <Text style={styles.monthTotal}>
              ₹{section.total.toLocaleString('en-IN')}
            </Text>
          </View>
        </TouchableOpacity>
      );
    },
    [expandedMonths, toggleMonth],
  );

  const renderItem = useCallback(
    ({ item, section }: { item: ListItem; section: MonthSection }) => {
      if (item.kind === 'typeHeader') {
        const compositeKey = `${section.monthKey}|${item.typeKey}`;
        const isOpen = expandedTypes.has(compositeKey);
        return (
          <TouchableOpacity
            style={styles.typeHeader}
            onPress={() => toggleType(section.monthKey, item.typeKey)}
            activeOpacity={0.75}
          >
            <View style={styles.typeHeaderLeft}>
              <Ionicons
                name={isOpen ? 'chevron-down' : 'chevron-forward'}
                size={12}
                color="#555"
                style={{ marginRight: 5 }}
              />
              <View style={styles.typeAvatar}>
                <Text style={styles.typeAvatarText}>
                  {item.typeKey.charAt(0).toUpperCase()}
                </Text>
              </View>
              <Text style={styles.typeHeaderTitle}>{item.typeKey}</Text>
            </View>
            <View style={styles.typeHeaderRight}>
              <Text style={styles.typeCount}>{item.count}</Text>
              <Text style={styles.typeTotal}>
                ₹{item.total.toLocaleString('en-IN')}
              </Text>
            </View>
          </TouchableOpacity>
        );
      }

      // kind === 'row'
      return (
        <ExpenseRow
          item={item.expense}
          onPress={(r) => navigation.navigate('ExpenseDetails', { item: r })}
        />
      );
    },
    [expandedTypes, toggleType, navigation],
  );

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
        <Text style={KStyles.headerTitle} numberOfLines={1}>Expenses</Text>
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
          placeholder="Search by type, mode, paid to…"
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
      ) : filtered.length === 0 ? (
        <View style={{ alignItems: 'center', marginTop: 60 }}>
          <Ionicons name="wallet-outline" size={48} color={Colors.muted} />
          <Text style={[KStyles.emptyText, { marginTop: 12 }]}>No expenses found</Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item, index) =>
            item.kind === 'row' ? item.expense.id : `th-${index}`
          }
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
        onPress={() => navigation.navigate('ExpenseForm', { mode: 'add' })}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // ── Summary banner ───────────────────────────────────────────────────────────
  summaryBanner: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#FCE4EC',
    paddingHorizontal: 16, paddingVertical: 8,
    borderBottomWidth: 0.5, borderBottomColor: '#F48FB1',
  },
  summaryText:   { fontSize: 13, fontWeight: '600', color: PRIMARY },
  summaryAmount: { fontSize: 13, fontWeight: '700', color: PRIMARY },

  // ── Month section header ─────────────────────────────────────────────────────
  monthHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: '#FCE4EC',
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#F48FB1',
  },
  monthHeaderLeft:  { flexDirection: 'row', alignItems: 'center', flex: 1 },
  monthHeaderTitle: { fontSize: 13, fontWeight: '700', color: PRIMARY, letterSpacing: 0.3 },
  monthHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  monthBadge: {
    backgroundColor: PRIMARY, borderRadius: 9,
    paddingHorizontal: 7, paddingVertical: 1,
  },
  monthBadgeText: { fontSize: 10, fontWeight: '700', color: '#fff' },
  monthTotal:     { fontSize: 12, fontWeight: '700', color: PRIMARY },

  // ── Type sub-section header ──────────────────────────────────────────────────
  typeHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 8,
    backgroundColor: '#FFF0F5',
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#FCCFE3',
  },
  typeHeaderLeft:  { flexDirection: 'row', alignItems: 'center', flex: 1 },
  typeAvatar: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: PRIMARY,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 7,
  },
  typeAvatarText:   { fontSize: 11, fontWeight: '700', color: '#fff' },
  typeHeaderTitle:  { fontSize: 12, fontWeight: '600', color: '#374151' },
  typeHeaderRight:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  typeCount:        { fontSize: 11, color: '#6B7280', fontWeight: '500' },
  typeTotal:        { fontSize: 12, fontWeight: '700', color: '#374151' },
});
