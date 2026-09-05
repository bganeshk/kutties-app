/**
 * FeeSummaryChart — horizontal bar chart showing fee collected per month.
 * Built with pure React Native Views; no external library required.
 *
 * Props:
 *   months  — array of MonthSummary sorted newest-first (reversed for display)
 *   maxBars — cap how many months to show (default 6, oldest-to-newest left→right)
 */
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Colors } from '../../../styles/kutties-styles';
import type { MonthSummary } from './FeeSummaryMonthCard';

interface Props {
  months: MonthSummary[];
  maxBars?: number;
}

const BAR_WIDTH   = 38;
const BAR_GAP     = 10;
const CHART_H     = 140;   // px height of the bar area
const LABEL_H     = 36;    // px below bars for month label + amount

function fmt(val: number): string {
  if (val >= 100_000) return `₹${(val / 100_000).toFixed(1)}L`;
  if (val >= 1_000)   return `₹${(val / 1_000).toFixed(1)}K`;
  return `₹${val}`;
}

export default function FeeSummaryChart({ months, maxBars = 6 }: Props) {
  // Take the last `maxBars` months in chronological order (oldest → newest)
  const bars = useMemo(() => {
    const slice = months.slice(0, maxBars);   // months is newest-first
    return [...slice].reverse();              // flip to oldest-first for L→R display
  }, [months, maxBars]);

  if (bars.length === 0) return null;

  const max = Math.max(...bars.map((b) => b.collected), 1);

  return (
    <View style={styles.wrapper}>
      <Text style={styles.title}>Monthly Collection</Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {bars.map((bar) => {
          const ratio     = bar.collected / max;
          const barHeight = Math.max(Math.round(ratio * CHART_H), 3);
          const isEmpty   = bar.collected === 0;

          // Short 3-char month label: "Jun 25"
          const parts  = bar.monthLabel.split(' ');
          const abbr   = (parts[0] ?? '').substring(0, 3);
          const yr     = (parts[1] ?? '').substring(2);   // "2025" → "25"
          const label  = `${abbr} ${yr}`;

          return (
            <View key={bar.monthKey} style={[styles.col, { width: BAR_WIDTH + BAR_GAP }]}>
              {/* Amount label above bar */}
              <Text style={styles.amtLabel} numberOfLines={1}>
                {isEmpty ? '' : fmt(bar.collected)}
              </Text>

              {/* Bar area: fixed height container, bar grows from bottom */}
              <View style={[styles.barTrack, { height: CHART_H }]}>
                <View
                  style={[
                    styles.bar,
                    { height: barHeight, width: BAR_WIDTH },
                    isEmpty && styles.barEmpty,
                  ]}
                />
              </View>

              {/* Month label + pending dot */}
              <View style={styles.labelRow}>
                <Text style={styles.monthLabel}>{label}</Text>
                {bar.pending > 0 && <View style={styles.pendingDot} />}
              </View>
              {bar.pending > 0 && (
                <Text style={styles.pendingLabel}>{fmt(bar.pending)}</Text>
              )}
            </View>
          );
        })}
      </ScrollView>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: Colors.primary }]} />
          <Text style={styles.legendText}>Collected</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#FFCDD2' }]} />
          <Text style={styles.legendText}>Has pending</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: '#fff',
    marginHorizontal: 12,
    marginTop: 10,
    marginBottom: 4,
    borderRadius: 12,
    paddingTop: 12,
    paddingBottom: 10,
    paddingHorizontal: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  title: {
    fontSize: 12,
    fontWeight: '600',
    color: '#888',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 10,
    marginLeft: 6,
  },
  scroll: {
    paddingHorizontal: 6,
    alignItems: 'flex-end',   // bars grow up from bottom
  },
  col: {
    alignItems: 'center',
  },
  amtLabel: {
    fontSize: 9,
    color: Colors.primary,
    fontWeight: '600',
    marginBottom: 2,
    minHeight: 12,
  },
  barTrack: {
    justifyContent: 'flex-end',   // bar grows from the bottom
    alignItems: 'center',
  },
  bar: {
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  barEmpty: {
    backgroundColor: '#E0E0E0',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 3,
  },
  monthLabel: {
    fontSize: 10,
    color: '#555',
    textAlign: 'center',
  },
  pendingDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#EF5350',
  },
  pendingLabel: {
    fontSize: 9,
    color: '#EF5350',
    textAlign: 'center',
    marginTop: 1,
  },
  legend: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 10,
    marginLeft: 6,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 10,
    color: '#888',
  },
});
