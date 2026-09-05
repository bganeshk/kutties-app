import React, { memo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import type { HolidayModel, TeachersHoliday } from '../../db/models/holiday.model';
import { KStyles } from '../../styles/kutties-styles';
import type { ColKey } from './cols';

export const DOT_GREEN  = '#4CAF50';
export const DOT_YELLOW = '#FFC107';

// ── Dot helpers ───────────────────────────────────────────────────────────────

function BoolDot({ val, flex }: { val: boolean; flex: number }) {
  return (
    <View style={{ flex, alignItems: 'center' }}>
      {val && <View style={[styles.dot, { backgroundColor: DOT_GREEN }]} />}
    </View>
  );
}

function TeachersDot({ val, flex }: { val: TeachersHoliday; flex: number }) {
  const color = val === 'yes' ? DOT_GREEN : val === 'opt' ? DOT_YELLOW : null;
  return (
    <View style={{ flex, alignItems: 'center' }}>
      {color && <View style={[styles.dot, { backgroundColor: color }]} />}
    </View>
  );
}

// ── Date helpers ──────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}

function formatDay(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-IN', { weekday: 'short' });
}

// ── Component ─────────────────────────────────────────────────────────────────

export interface HolidayRowProps {
  item:        HolidayModel;
  index:       number;
  visibleCols: Set<ColKey>;
  onPress:     (item: HolidayModel) => void;
}

const HolidayRow = memo(({ item, index, visibleCols, onPress }: HolidayRowProps) => (
  <Pressable
    onPress={() => onPress(item)}
    android_ripple={{ color: 'rgba(194,24,91,0.1)' }}
    style={({ pressed }) => [
      styles.row,
      index % 2 === 0 ? styles.rowEven : styles.rowOdd,
      pressed && KStyles.rowPressed,
    ]}
  >
    {/* Date — always shown */}
    <Text style={[styles.cell, styles.dateCell]}>{formatDate(item.date)}</Text>

    {visibleCols.has('kg')          && <BoolDot     val={item.kg}       flex={2} />}
    {visibleCols.has('daycare')     && <BoolDot     val={item.daycare}  flex={2} />}
    {visibleCols.has('tuition')     && <BoolDot     val={item.tuition}  flex={2} />}
    {visibleCols.has('teachers')    && <TeachersDot val={item.teachers} flex={2} />}
    {visibleCols.has('day')         && (
      <Text style={[styles.cell, styles.dayCell]}>{formatDay(item.date)}</Text>
    )}
    {visibleCols.has('description') && (
      <Text style={[styles.cell, styles.descCell]} numberOfLines={1}>
        {item.description || '—'}
      </Text>
    )}
  </Pressable>
));

export default HolidayRow;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
  },
  rowEven:  { backgroundColor: '#fff' },
  rowOdd:   { backgroundColor: '#fafbfc' },
  cell:     { fontSize: 13, color: '#1A1A1A' },
  dateCell: { flex: 3, fontWeight: '500' },
  dayCell:  { flex: 1.5, textAlign: 'center', fontSize: 13, color: '#666' },
  descCell: { flex: 4, fontSize: 13, color: '#1A1A1A' },
  dot:      { width: 12, height: 12, borderRadius: 6 },
});
