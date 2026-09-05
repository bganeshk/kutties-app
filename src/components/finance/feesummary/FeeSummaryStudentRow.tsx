import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '../../../styles/kutties-styles';
import type { StudentFeeModel } from '../../../db/models/studentfee.model';

interface Props {
  item: StudentFeeModel;
  studentName?: string;
  onPress: (item: StudentFeeModel) => void;
}

const STATUS_STYLE: Record<string, { bg: string; text: string; border: string }> = {
  paid:    { bg: '#E8F5E9', text: '#2E7D32', border: '#A5D6A7' },
  partial: { bg: '#FFF8E1', text: '#F57F17', border: '#FFE082' },
  pending: { bg: '#FFEBEE', text: '#C62828', border: '#EF9A9A' },
};

function fmt(val: number | undefined): string {
  if (val == null) return '—';
  return `₹${val.toLocaleString('en-IN', { minimumFractionDigits: 0 })}`;
}

function initials(name: string | undefined, fallback: string | undefined): string {
  if (name) {
    const parts = name.trim().split(/\s+/);
    return parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : (parts[0][0] ?? '?').toUpperCase();
  }
  return (fallback?.[0] ?? '?').toUpperCase();
}

export default function FeeSummaryStudentRow({ item, studentName, onPress }: Props) {
  const statusKey   = (item.status ?? '').trim().toLowerCase();
  const statusStyle = STATUS_STYLE[statusKey] ?? { bg: '#F5F5F5', text: '#757575', border: '#BDBDBD' };
  const statusLabel = item.status
    ? item.status.charAt(0).toUpperCase() + item.status.slice(1)
    : null;

  const displayName = studentName ?? item.regNumber ?? '—';
  const avText = initials(studentName, item.regNumber);

  return (
    <TouchableOpacity
      style={styles.row}
      activeOpacity={0.78}
      onPress={() => onPress(item)}
    >
      {/* Avatar */}
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{avText}</Text>
      </View>

      {/* Left info */}
      <View style={styles.left}>
        <Text style={styles.name} numberOfLines={1}>{displayName}</Text>
        {studentName && item.regNumber ? (
          <Text style={styles.muted}>{item.regNumber}</Text>
        ) : null}
        {item.feeType ? (
          <Text style={styles.muted}>{item.feeType}</Text>
        ) : null}
      </View>

      {/* Right info */}
      <View style={styles.right}>
        <Text style={styles.amount}>{fmt(item.amount)}</Text>
        {statusLabel ? (
          <View style={[styles.badge, { backgroundColor: statusStyle.bg, borderColor: statusStyle.border }]}>
            <Text style={[styles.badgeText, { color: statusStyle.text }]}>{statusLabel}</Text>
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E0E0E0',
  },
  avatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.primary,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 10,
  },
  avatarText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  left:   { flex: 1, paddingRight: 8 },
  name:   { fontSize: 14, fontWeight: '700', color: '#1A1A1A' },
  muted:  { fontSize: 12, color: Colors.muted, marginTop: 1 },
  right:  { alignItems: 'flex-end', gap: 4 },
  amount: { fontSize: 14, fontWeight: '700', color: '#1A1A1A' },
  badge:  { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, borderWidth: 1 },
  badgeText: { fontSize: 11, fontWeight: '700' },
});
