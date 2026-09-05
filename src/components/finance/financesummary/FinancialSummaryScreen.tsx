import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet, SafeAreaView,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '../../../navigation/HomeStack';
import { Colors, KStyles } from '../../../styles/kutties-styles';
import { SHEETS } from '../../../utils/constants';
import {
  studentFeeRepository,
  expenseRepository,
  staffPayRepository,
} from '../../../db/repositories';
import { syncSheet } from '../../../sync/sync.service';

type Props = NativeStackScreenProps<HomeStackParamList, 'FinancialSummary'>;

// ── Constants ──────────────────────────────────────────────────────────────────

const SHORT_MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

// Each column: header label + width
const COL_WIDTHS = {
  month:     80,
  netAmt:   110,
  fees:     110,
  expenses: 110,
  salary:   110,
  feeGpay:  110,
  feeCash:  110,
  salGpay:  110,
  salCash:  110,
  arrow:     36,
};

// ── Types ─────────────────────────────────────────────────────────────────────

interface MonthRow {
  monthKey:  string;   // e.g. "2024-01"
  label:     string;   // e.g. "Jan"
  fees:      number;   // total stfee paid
  feeGpay:   number;   // stfee paid via GPay/online
  feeCash:   number;   // stfee paid via Cash
  expenses:  number;   // total expenses
  salary:    number;   // total staffpay
  salGpay:   number;   // staffpay via GPay/online
  salCash:   number;   // staffpay via Cash
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const MON_MAP: Record<string, string> = {
  jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
  jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
};

function toMonthKey(dateStr: string | undefined): string {
  if (!dateStr) return '';
  // "DD/Mon/YYYY"
  const dm = dateStr.match(/^(\d{1,2})\/([A-Za-z]{3})\/(\d{4})$/);
  if (dm) {
    const m = MON_MAP[dm[2].toLowerCase()];
    return m ? `${dm[3]}-${m}` : '';
  }
  // "YYYY-MM-..." or "YYYY-MM"
  const im = dateStr.match(/^(\d{4})-(\d{2})/);
  if (im) return `${im[1]}-${im[2]}`;
  return '';
}

/** "2024-01" → "Jan-24" */
function monthShort(key: string): string {
  const [year, monStr] = key.split('-');
  const mon = parseInt(monStr ?? '0', 10);
  const label = SHORT_MONTHS[mon - 1] ?? monStr ?? key;
  const yy = (year ?? '').slice(-2);
  return yy ? `${label}-${yy}` : label;
}

function isGpay(mode: string | undefined): boolean {
  const m = (mode ?? '').toLowerCase();
  return m.includes('gpay') || m.includes('online') || m.includes('upi') || m.includes('neft');
}

function fmt(n: number): string {
  return '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function FinancialSummaryScreen({ navigation }: Props) {
  const [rows, setRows]       = useState<MonthRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const didSync = useRef(false);

  // ── Data loading ────────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    setLoading(true);

    const [fees, expenses, staffPays] = await Promise.all([
      studentFeeRepository.findAll(),
      expenseRepository.findAll(),
      staffPayRepository.findAll(),
    ]);

    const map = new Map<string, MonthRow>();

    const getRow = (mk: string): MonthRow => {
      if (!map.has(mk)) {
        map.set(mk, {
          monthKey:  mk,
          label:     monthShort(mk),
          fees:      0,
          feeGpay:   0,
          feeCash:   0,
          expenses:  0,
          salary:    0,
          salGpay:   0,
          salCash:   0,
        });
      }
      return map.get(mk)!;
    };

    // Fees — PAID records bucketed by paidDate
    for (const fee of fees) {
      if ((fee.status ?? '').trim().toLowerCase() !== 'paid') continue;
      const mk = toMonthKey(fee.paidDate);
      if (!mk) continue;
      const row = getRow(mk);
      const amt = fee.amount ?? 0;
      row.fees += amt;
      if (isGpay(fee.paymentMode)) row.feeGpay += amt;
      else                          row.feeCash += amt;
    }

    // Expenses — bucketed by expenseDate
    for (const exp of expenses) {
      const mk = toMonthKey(exp.expenseDate);
      if (!mk) continue;
      getRow(mk).expenses += exp.amount ?? 0;
    }

    // Staff pay — bucketed by payDate (fall back to payMonth)
    for (const pay of staffPays) {
      const mk = toMonthKey(pay.payDate) || toMonthKey(pay.payMonth);
      if (!mk) continue;
      const row = getRow(mk);
      const amt = pay.amount ?? 0;
      row.salary += amt;
      if (isGpay(pay.payMode)) row.salGpay += amt;
      else                      row.salCash += amt;
    }

    // Sort ascending by monthKey (Jan → Dec)
    const sorted = Array.from(map.values()).sort((a, b) =>
      a.monthKey.localeCompare(b.monthKey),
    );

    setRows(sorted);
    setLoading(false);
  }, []);

  // ── Sync ────────────────────────────────────────────────────────────────────

  const sync = useCallback(async () => {
    setSyncing(true);
    try {
      await Promise.all([
        syncSheet(SHEETS.STUDENT_FEE),
        syncSheet(SHEETS.EXPENSE),
        syncSheet(SHEETS.STAFF_PAY),
      ]);
      await loadData();
    } finally {
      setSyncing(false);
    }
  }, [loadData]);

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

  // ── Totals ──────────────────────────────────────────────────────────────────

  const totals = rows.reduce(
    (acc, r) => ({
      fees:     acc.fees     + r.fees,
      expenses: acc.expenses + r.expenses,
      salary:   acc.salary   + r.salary,
      feeGpay:  acc.feeGpay  + r.feeGpay,
      feeCash:  acc.feeCash  + r.feeCash,
      salGpay:  acc.salGpay  + r.salGpay,
      salCash:  acc.salCash  + r.salCash,
    }),
    { fees: 0, expenses: 0, salary: 0, feeGpay: 0, feeCash: 0, salGpay: 0, salCash: 0 },
  );

  const totalNet = rows.reduce(
    (s, r) => s + (r.fees - r.expenses - r.salary),
    0,
  );

  // ── Table helpers ────────────────────────────────────────────────────────────

  const totalTableWidth =
    COL_WIDTHS.month + COL_WIDTHS.netAmt + COL_WIDTHS.fees +
    COL_WIDTHS.expenses + COL_WIDTHS.salary +
    COL_WIDTHS.feeGpay + COL_WIDTHS.feeCash +
    COL_WIDTHS.salGpay + COL_WIDTHS.salCash +
    COL_WIDTHS.arrow;

  const renderHeaderCell = (label: string, width: number, last = false) => (
    <View
      key={label}
      style={[styles.headerCell, { width }, last && styles.lastCell]}
    >
      <Text style={styles.headerText} numberOfLines={1}>{label}</Text>
    </View>
  );

  const renderCell = (
    value: string,
    width: number,
    color?: string,
    last = false,
  ) => (
    <View style={[styles.cell, { width }, last && styles.lastCell]}>
      <Text style={[styles.cellText, color ? { color } : undefined]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );

  const renderDataRow = (row: MonthRow, isLast: boolean) => {
    const net    = row.fees - row.expenses - row.salary;
    const netColor = net >= 0 ? '#2E7D32' : '#C62828';
    return (
      <TouchableOpacity
        key={row.monthKey}
        style={[styles.dataRow, isLast && styles.totalRow]}
        activeOpacity={0.7}
        onPress={() =>
          navigation.navigate('FinancialSummaryDrillDown', {
            monthKey:   row.monthKey,
            monthLabel: row.label,
          })
        }
      >
        {renderCell(row.label,             COL_WIDTHS.month,     '#1A1A1A')}
        {renderCell(fmt(net),              COL_WIDTHS.netAmt,    netColor)}
        {renderCell(fmt(row.fees),         COL_WIDTHS.fees)}
        {renderCell(fmt(row.expenses),     COL_WIDTHS.expenses)}
        {renderCell(fmt(row.salary),       COL_WIDTHS.salary)}
        {renderCell(fmt(row.feeGpay),      COL_WIDTHS.feeGpay)}
        {renderCell(fmt(row.feeCash),      COL_WIDTHS.feeCash)}
        {renderCell(fmt(row.salGpay),      COL_WIDTHS.salGpay)}
        {renderCell(fmt(row.salCash),      COL_WIDTHS.salCash)}
        <View style={[styles.cell, { width: COL_WIDTHS.arrow }, styles.lastCell]}>
          <Ionicons name="chevron-forward" size={14} color={Colors.muted} />
        </View>
      </TouchableOpacity>
    );
  };

  const renderTotalsRow = () => {
    const netColor = totalNet >= 0 ? '#2E7D32' : '#C62828';
    return (
      <View style={[styles.dataRow, styles.totalRow]}>
        {renderCell('Total',               COL_WIDTHS.month,    '#1A1A1A')}
        {renderCell(fmt(totalNet),         COL_WIDTHS.netAmt,   netColor)}
        {renderCell(fmt(totals.fees),      COL_WIDTHS.fees)}
        {renderCell(fmt(totals.expenses),  COL_WIDTHS.expenses)}
        {renderCell(fmt(totals.salary),    COL_WIDTHS.salary)}
        {renderCell(fmt(totals.feeGpay),   COL_WIDTHS.feeGpay)}
        {renderCell(fmt(totals.feeCash),   COL_WIDTHS.feeCash)}
        {renderCell(fmt(totals.salGpay),   COL_WIDTHS.salGpay)}
        {renderCell(fmt(totals.salCash),   COL_WIDTHS.salCash)}
        <View style={[styles.cell, { width: COL_WIDTHS.arrow }, styles.lastCell]}>
          <Ionicons name="chevron-forward" size={14} color={Colors.muted} />
        </View>
      </View>
    );
  };

  // ── Render ──────────────────────────────────────────────────────────────────

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
        <Text style={KStyles.headerTitle}>Financial Summary</Text>
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

      {loading ? (
        <View style={KStyles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : rows.length === 0 ? (
        <View style={KStyles.center}>
          <Ionicons name="stats-chart-outline" size={48} color="#ccc" />
          <Text style={[KStyles.emptyText, { marginTop: 12 }]}>No financial records found</Text>
        </View>
      ) : (
        /* Vertical scroll for rows */
        <ScrollView style={styles.vScroll} showsVerticalScrollIndicator>
          {/* Horizontal scroll for columns */}
          <ScrollView horizontal showsHorizontalScrollIndicator style={styles.hScroll}>
            <View style={{ width: totalTableWidth }}>
              {/* Sticky-style header row */}
              <View style={styles.headerRow}>
                {renderHeaderCell('Month',      COL_WIDTHS.month)}
                {renderHeaderCell('Net Amnt:',  COL_WIDTHS.netAmt)}
                {renderHeaderCell('Fees',       COL_WIDTHS.fees)}
                {renderHeaderCell('Exps:',      COL_WIDTHS.expenses)}
                {renderHeaderCell('Salary',     COL_WIDTHS.salary)}
                {renderHeaderCell('Fee(Gpay)',  COL_WIDTHS.feeGpay)}
                {renderHeaderCell('Fee Cash',   COL_WIDTHS.feeCash)}
                {renderHeaderCell('Sal(GPay)',  COL_WIDTHS.salGpay)}
                {renderHeaderCell('Sal(Cash)',  COL_WIDTHS.salCash, true)}
              </View>

              {/* Data rows */}
              {rows.map((r, idx) => renderDataRow(r, idx === rows.length - 1))}

              {/* Totals row */}
              {renderTotalsRow()}
            </View>
          </ScrollView>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  vScroll: { flex: 1 },
  hScroll: { flexGrow: 0 },

  headerRow: {
    flexDirection:   'row',
    backgroundColor: '#F5F5F5',
    borderBottomWidth: 1.5,
    borderBottomColor: Colors.border,
  },
  headerCell: {
    paddingHorizontal: 10,
    paddingVertical:   10,
    borderRightWidth:  0.5,
    borderRightColor:  Colors.border,
    justifyContent:    'center',
  },
  headerText: {
    fontSize:   12,
    fontWeight: '700',
    color:      '#1A1A1A',
  },

  dataRow: {
    flexDirection:     'row',
    backgroundColor:   '#fff',
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
  },
  totalRow: {
    backgroundColor: '#FFF9C4',
    borderTopWidth:  1.5,
    borderTopColor:  '#F9A825',
  },

  cell: {
    paddingHorizontal: 10,
    paddingVertical:   12,
    borderRightWidth:  0.5,
    borderRightColor:  Colors.border,
    justifyContent:    'center',
  },
  lastCell: {
    borderRightWidth: 0,
  },
  cellText: {
    fontSize: 13,
    color:    '#444',
  },
});
