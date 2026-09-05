import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, FlatList, StyleSheet, SafeAreaView,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '../../../navigation/HomeStack';
import { Colors, KStyles } from '../../../styles/kutties-styles';
import { SHEETS } from '../../../utils/constants';
import { studentFeeRepository } from '../../../db/repositories';
import { syncSheet } from '../../../sync/sync.service';
import FeeSummaryMonthCard, { type MonthSummary } from './FeeSummaryMonthCard';
import FeeSummaryChart from './FeeSummaryChart';

type Props = NativeStackScreenProps<HomeStackParamList, 'FeeSummary'>;

// ── Helpers ──────────────────────────────────────────────────────────────────

const MON: Record<string, string> = {
  jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
  jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
};
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function toMonthKey(dateStr: string | undefined): string {
  if (!dateStr) return '';
  const dm = dateStr.match(/^(\d{1,2})\/([A-Za-z]{3})\/(\d{4})$/);
  if (dm) {
    const m = MON[dm[2].toLowerCase()];
    return m ? `${dm[3]}-${m}` : '';
  }
  const im = dateStr.match(/^(\d{4})-(\d{2})/);
  if (im) return `${im[1]}-${im[2]}`;
  return '';
}

function monthLabel(key: string): string {
  const [year, mon] = key.split('-');
  const idx = parseInt(mon, 10) - 1;
  return `${MONTH_NAMES[idx] ?? mon} ${year}`;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function FeeSummaryScreen({ navigation }: Props) {
  const [months, setMonths]   = useState<MonthSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const didSync = useRef(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const fees = await studentFeeRepository.findAll();

    // Group PAID records by paidDate month; track pending by dueDate month
    const map = new Map<string, { collected: number; pending: number; count: number }>();

    for (const fee of fees) {
      const status = (fee.status ?? '').trim().toLowerCase();
      const amt = fee.amount ?? 0;

      if (status === 'paid') {
        // Paid records bucket into their paidDate month
        const mk = toMonthKey(fee.paidDate);
        if (!mk) continue;
        const entry = map.get(mk) ?? { collected: 0, pending: 0, count: 0 };
        entry.collected += amt;
        entry.count++;
        map.set(mk, entry);
      } else {
        // Unpaid/partial records accumulate as pending under their dueDate month
        const mk = toMonthKey(fee.dueDate);
        if (!mk) continue;
        const entry = map.get(mk) ?? { collected: 0, pending: 0, count: 0 };
        entry.pending += amt;
        entry.count++;
        map.set(mk, entry);
      }
    }

    // Build sorted list (newest first)
    const result: MonthSummary[] = Array.from(map.entries())
      .map(([mk, v]) => ({
        monthKey:    mk,
        monthLabel:  monthLabel(mk),
        collected:   v.collected,
        pending:     v.pending,
        recordCount: v.count,
      }))
      .sort((a, b) => b.monthKey.localeCompare(a.monthKey));

    setMonths(result);
    setLoading(false);
  }, []);

  const sync = useCallback(async () => {
    setSyncing(true);
    try {
      await syncSheet(SHEETS.STUDENT_FEE);
      await loadData();
    } finally {
      setSyncing(false);
    }
  }, [loadData]);

  // On first mount: sync then load. On subsequent focus: just load.
  useFocusEffect(
    useCallback(() => {
      if (!didSync.current) {
        didSync.current = true;
        sync();
      } else {
        loadData();
      }
    }, [sync, loadData]),
  );

  // Overall totals
  const totalCollected = months.reduce((s, m) => s + m.collected, 0);
  const totalPending   = months.reduce((s, m) => s + m.pending, 0);

  return (
    <SafeAreaView style={KStyles.listRoot}>
      {/* Header */}
      <View style={KStyles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={KStyles.headerTitle}>Fee Summary</Text>
        <TouchableOpacity
          style={KStyles.headerIcon}
          onPress={sync}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          {syncing
            ? <ActivityIndicator size="small" color="#fff" />
            : <Ionicons name="refresh" size={22} color="#fff" />}
        </TouchableOpacity>
      </View>

      {/* Summary banner */}
      {months.length > 0 && (
        <View style={styles.banner}>
          <View style={styles.bannerCell}>
            <Text style={styles.bannerValue}>
              ₹{totalCollected.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
            </Text>
            <Text style={styles.bannerLabel}>Collected</Text>
          </View>
          <View style={styles.bannerDivider} />
          <View style={styles.bannerCell}>
            <Text style={[styles.bannerValue, styles.pendingColor]}>
              ₹{totalPending.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
            </Text>
            <Text style={styles.bannerLabel}>Pending</Text>
          </View>
          <View style={styles.bannerDivider} />
          <View style={styles.bannerCell}>
            <Text style={styles.bannerValue}>{months.length}</Text>
            <Text style={styles.bannerLabel}>Months</Text>
          </View>
        </View>
      )}

      {/* Bar chart — shown once data is loaded */}
      {!loading && months.length > 0 && (
        <FeeSummaryChart months={months} maxBars={6} />
      )}

      {loading ? (
        <View style={KStyles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={months}
          keyExtractor={(m) => m.monthKey}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={KStyles.center}>
              <Ionicons name="cash-outline" size={48} color="#ccc" />
              <Text style={[KStyles.emptyText, { marginTop: 12 }]}>No fee records found</Text>
            </View>
          }
          renderItem={({ item }) => (
            <FeeSummaryMonthCard
              item={item}
              onPress={(m) =>
                navigation.navigate('FeeSummaryDrillDown', {
                  monthKey:   m.monthKey,
                  monthLabel: m.monthLabel,
                })
              }
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  list: { paddingVertical: 8, paddingBottom: 24 },
  banner: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    elevation: 1,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E0E0E0',
  },
  bannerCell:    { flex: 1, alignItems: 'center' },
  bannerDivider: { width: 1, backgroundColor: '#E0E0E0', marginVertical: 4 },
  bannerValue:   { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },
  bannerLabel:   { fontSize: 11, color: Colors.muted, marginTop: 2 },
  pendingColor:  { color: '#C62828' },
});
