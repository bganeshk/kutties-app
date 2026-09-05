import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, SafeAreaView,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '../../../navigation/HomeStack';
import { Colors, KStyles } from '../../../styles/kutties-styles';
import {
  studentFeeRepository,
  expenseRepository,
  staffPayRepository,
} from '../../../db/repositories';

type Props = NativeStackScreenProps<HomeStackParamList, 'FinancialSummaryDrillDown'>;

// ── Helpers ──────────────────────────────────────────────────────────────────

const MON_MAP: Record<string, string> = {
  jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
  jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
};

function toMonthKey(dateStr: string | undefined): string {
  if (!dateStr) return '';
  const dm = dateStr.match(/^(\d{1,2})\/([A-Za-z]{3})\/(\d{4})$/);
  if (dm) {
    const m = MON_MAP[dm[2].toLowerCase()];
    return m ? `${dm[3]}-${m}` : '';
  }
  const im = dateStr.match(/^(\d{4})-(\d{2})/);
  if (im) return `${im[1]}-${im[2]}`;
  return '';
}

function isGpay(mode: string | undefined): boolean {
  const m = (mode ?? '').toLowerCase();
  return m.includes('gpay') || m.includes('online') || m.includes('upi') || m.includes('neft');
}

function fmt(n: number): string {
  return '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function FinancialSummaryDrillDown({ navigation, route }: Props) {
  const { monthKey, monthLabel } = route.params;

  const [data, setData]   = useState({
    fees: 0, feeGpay: 0, feeCash: 0,
    expenses: 0,
    salary: 0, salGpay: 0, salCash: 0,
  });
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);

    const [fees, expenses, staffPays] = await Promise.all([
      studentFeeRepository.findAll(),
      expenseRepository.findAll(),
      staffPayRepository.findAll(),
    ]);

    let feeTotal = 0, feeGpay = 0, feeCash = 0;
    let expTotal = 0;
    let salTotal = 0, salGpay = 0, salCash = 0;

    for (const fee of fees) {
      if ((fee.status ?? '').trim().toLowerCase() !== 'paid') continue;
      if (toMonthKey(fee.paidDate) !== monthKey) continue;
      const amt = fee.amount ?? 0;
      feeTotal += amt;
      if (isGpay(fee.paymentMode)) feeGpay += amt;
      else                          feeCash += amt;
    }

    for (const exp of expenses) {
      if (toMonthKey(exp.expenseDate) !== monthKey) continue;
      expTotal += exp.amount ?? 0;
    }

    for (const pay of staffPays) {
      const mk = toMonthKey(pay.payDate) || toMonthKey(pay.payMonth);
      if (mk !== monthKey) continue;
      const amt = pay.amount ?? 0;
      salTotal += amt;
      if (isGpay(pay.payMode)) salGpay += amt;
      else                      salCash += amt;
    }

    setData({
      fees: feeTotal, feeGpay, feeCash,
      expenses: expTotal,
      salary: salTotal, salGpay, salCash,
    });
    setLoading(false);
  }, [monthKey]);

  useFocusEffect(
    useCallback(() => { loadData(); }, [loadData]),
  );

  const net = data.fees - data.expenses - data.salary;
  const netColor = net >= 0 ? '#2E7D32' : '#C62828';

  const rows: { label: string; value: string; valueColor?: string }[] = [
    { label: 'Fees',       value: fmt(data.fees) },
    { label: 'Exps:',      value: fmt(data.expenses) },
    { label: 'Salary',     value: fmt(data.salary) },
    { label: 'Fee(Gpay)',  value: fmt(data.feeGpay) },
    { label: 'Fee Cash',   value: fmt(data.feeCash) },
    { label: 'Sal(GPay)',  value: fmt(data.salGpay) },
    { label: 'Sal(Cash)',  value: fmt(data.salCash) },
    { label: 'Net Amnt:',  value: fmt(net), valueColor: netColor },
  ];

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
        <Text style={KStyles.headerTitle}>{monthLabel}</Text>
        <View style={{ width: 32 }} />
      </View>

      {loading ? (
        <View style={KStyles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.container}>
          {rows.map((row, idx) => (
            <View
              key={row.label}
              style={[
                styles.row,
                idx === rows.length - 1 && styles.netRow,
              ]}
            >
              <Text style={styles.label}>{row.label}</Text>
              <Text
                style={[
                  styles.value,
                  row.valueColor ? { color: row.valueColor } : undefined,
                  idx === rows.length - 1 && styles.netValue,
                ]}
              >
                {row.value}
              </Text>
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  row: {
    backgroundColor: '#fff',
    borderRadius:    8,
    paddingHorizontal: 16,
    paddingVertical:   16,
    marginBottom:    12,
    borderWidth:     0.5,
    borderColor:     Colors.border,
  },
  netRow: {
    backgroundColor: '#F1F8E9',
    borderColor:     '#A5D6A7',
    borderWidth:     1,
    marginTop:       4,
  },
  label: {
    fontSize:   13,
    color:      Colors.muted,
    marginBottom: 4,
  },
  value: {
    fontSize:   22,
    fontWeight: '600',
    color:      '#1A1A1A',
  },
  netValue: {
    fontSize:   24,
    fontWeight: '700',
  },
});
