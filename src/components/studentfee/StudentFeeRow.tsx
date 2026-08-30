import React, { memo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { StudentFeeModel } from '../../db/models/studentfee.model';
import { Colors, KStyles } from '../../styles/kutties-styles';

const PRIMARY = Colors.primary;

const STATUS_STYLE: Record<string, { bg: string; text: string }> = {
  paid:    { bg: '#E8F5E9', text: '#2E7D32' },
  partial: { bg: '#FFF8E1', text: '#F57F17' },
  pending: { bg: '#FFEBEE', text: '#C62828' },
};

interface Props {
  item: StudentFeeModel;
  studentName?: string;
  hideStudentName?: boolean;
  onPress: (item: StudentFeeModel) => void;
}

const StudentFeeRow = memo(({ item, studentName, hideStudentName, onPress }: Props) => {
  const displayName = hideStudentName ? null : (studentName ?? item.regNumber ?? '—');
  const statusKey   = (item.status ?? '').trim().toLowerCase();
  const statusStyle = STATUS_STYLE[statusKey] ?? { bg: '#F5F5F5', text: '#757575' };
  const statusLabel = item.status
    ? item.status.charAt(0).toUpperCase() + item.status.slice(1)
    : null;

  return (
    <Pressable
      onPress={() => onPress(item)}
      android_ripple={{ color: 'rgba(194,24,91,0.1)' }}
      style={({ pressed }) => [KStyles.rowContainer, pressed && KStyles.rowPressed]}
    >
      {/* Avatar */}
      <View style={styles.avatar}>
        <Ionicons name="cash-outline" size={20} color="#fff" />
      </View>

      <View style={KStyles.rowInfo}>
        <View style={KStyles.rowTwoCol}>
          <View style={KStyles.rowLeftCol}>
            {displayName != null ? (
              <Text style={KStyles.rowName} numberOfLines={1}>{displayName}</Text>
            ) : null}
            {item.feeType ? (
              <Text style={[displayName == null ? KStyles.rowName : styles.subLabel]} numberOfLines={1}>
                {item.feeType}
              </Text>
            ) : null}
            {item.dueDate ? (
              <Text style={styles.dateLabel}>Due: {item.dueDate}</Text>
            ) : null}
          </View>

          <View style={KStyles.rowRightCol}>
            {statusLabel ? (
              <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                <Text style={[styles.statusText, { color: statusStyle.text }]}>{statusLabel}</Text>
              </View>
            ) : null}
            {item.amount != null ? (
              <Text style={styles.amount}>₹{item.amount.toLocaleString('en-IN')}</Text>
            ) : null}
          </View>
        </View>

        {/* Quick stats row */}
        <View style={styles.statsRow}>
          {item.recptNo ? (
            <View style={styles.statChip}>
              <Ionicons name="receipt-outline" size={10} color={PRIMARY} />
              <Text style={styles.statMode}>{item.recptNo}</Text>
            </View>
          ) : null}
          {item.paymentMode ? (
            <View style={styles.statChip}>
              <Ionicons name="card-outline" size={10} color={PRIMARY} />
              <Text style={styles.statMode}>{item.paymentMode}</Text>
            </View>
          ) : null}
          {item.paidDate ? (
            <View style={styles.statChip}>
              <Ionicons name="checkmark-circle-outline" size={10} color="#2E7D32" />
              <Text style={styles.statPaid}>Paid {item.paidDate}</Text>
            </View>
          ) : null}
        </View>
      </View>

      <Ionicons name="chevron-forward" size={16} color="#ccc" style={{ marginLeft: 8, flexShrink: 0 }} />
    </Pressable>
  );
});

export default StudentFeeRow;

const styles = StyleSheet.create({
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1565C0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
    flexShrink: 0,
  },
  subLabel:    { fontSize: 12, color: Colors.muted, marginTop: 2 },
  dateLabel:   { fontSize: 11, color: Colors.muted, marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  statusText:  { fontSize: 11, fontWeight: '700', letterSpacing: 0.4 },
  amount:      { fontSize: 13, fontWeight: '700', color: '#1A1A1A', marginTop: 2 },
  statsRow:    { flexDirection: 'row', gap: 8, marginTop: 5, flexWrap: 'wrap' },
  statChip:    { flexDirection: 'row', alignItems: 'center', gap: 3 },
  statPaid:    { fontSize: 11, color: '#2E7D32', fontWeight: '600' },
  statMode:    { fontSize: 11, color: PRIMARY, fontWeight: '600' },
});
