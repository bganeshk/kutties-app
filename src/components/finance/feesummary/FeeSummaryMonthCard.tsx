import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../styles/kutties-styles';

export interface MonthSummary {
  monthKey: string;    // YYYY-MM
  monthLabel: string;  // e.g. "June 2025"
  collected: number;
  pending: number;
  recordCount: number;
}

interface Props {
  item: MonthSummary;
  onPress: (item: MonthSummary) => void;
}

function fmt(val: number): string {
  return `₹${val.toLocaleString('en-IN', { minimumFractionDigits: 0 })}`;
}

export default function FeeSummaryMonthCard({ item, onPress }: Props) {
  const total = item.collected + item.pending;
  const ratio = total > 0 ? item.collected / total : 0;

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.82}
      onPress={() => onPress(item)}
    >
      {/* Top row — month label + chevron */}
      <View style={styles.topRow}>
        <View>
          <Text style={styles.monthLabel}>{item.monthLabel}</Text>
          <Text style={styles.recordCount}>{item.recordCount} record{item.recordCount !== 1 ? 's' : ''}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={Colors.muted} />
      </View>

      {/* Amounts row */}
      <View style={styles.amountsRow}>
        <View>
          <Text style={styles.amountLabel}>Collected</Text>
          <Text style={styles.collectedAmt}>{fmt(item.collected)}</Text>
        </View>
        {item.pending > 0 && (
          <View style={styles.pendingBlock}>
            <Text style={styles.amountLabel}>Pending</Text>
            <Text style={styles.pendingAmt}>{fmt(item.pending)}</Text>
          </View>
        )}
      </View>

      {/* Progress bar */}
      {total > 0 && (
        <View style={styles.barTrack}>
          <View style={[styles.barFill, { flex: ratio }]} />
          <View style={{ flex: 1 - ratio }} />
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginHorizontal: 14,
    marginVertical: 5,
    padding: 14,
    elevation: 2,
    borderWidth: 0.5,
    borderColor: '#E0E0E0',
  },
  topRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  monthLabel:  { fontSize: 15, fontWeight: '700', color: '#1A1A1A' },
  recordCount: { fontSize: 12, color: Colors.muted, marginTop: 2 },
  amountsRow:  { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  amountLabel: { fontSize: 11, color: Colors.muted, fontWeight: '600', marginBottom: 2 },
  collectedAmt:{ fontSize: 16, fontWeight: '700', color: '#2E7D32' },
  pendingBlock:{ alignItems: 'flex-end' },
  pendingAmt:  { fontSize: 16, fontWeight: '700', color: '#C62828' },
  barTrack:    { flexDirection: 'row', height: 5, borderRadius: 3, overflow: 'hidden', backgroundColor: '#FFCDD2' },
  barFill:     { backgroundColor: '#4CAF50', borderRadius: 3 },
});
