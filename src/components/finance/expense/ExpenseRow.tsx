import React, { memo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ExpenseModel } from '../../../db/models/expense.model';
import { Colors, KStyles } from '../../../styles/kutties-styles';
import { formatDisplayDate } from '../../../utils/dateUtils';

interface Props {
  item:    ExpenseModel;
  onPress: (item: ExpenseModel) => void;
}

const ExpenseRow = memo(({ item, onPress }: Props) => {
  const avatarLetter = (item.expenseType ?? '?').trim().charAt(0).toUpperCase();

  return (
    <Pressable
      onPress={() => onPress(item)}
      android_ripple={{ color: `${Colors.primary}1A` }}
      style={({ pressed }) => [KStyles.rowContainer, pressed && KStyles.rowPressed]}
    >
      {/* Avatar — first letter of expense type */}
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{avatarLetter}</Text>
      </View>

      <View style={KStyles.rowInfo}>
        <View style={KStyles.rowTwoCol}>
          {/* Left column */}
          <View style={KStyles.rowLeftCol}>
            <Text style={KStyles.rowName} numberOfLines={1}>
              {item.expenseType ?? '—'}
            </Text>
            {item.paidTo ? (
              <Text style={styles.subLabel} numberOfLines={1}>{item.paidTo}</Text>
            ) : null}
            {item.expenseDate ? (
              <Text style={styles.dateLabel}>{formatDisplayDate(item.expenseDate)}</Text>
            ) : null}
          </View>

          {/* Right column */}
          <View style={KStyles.rowRightCol}>
            {item.amount != null ? (
              <Text style={styles.amount}>₹{item.amount.toLocaleString('en-IN')}</Text>
            ) : null}
            {item.paymentMode ? (
              <View style={styles.modeBadge}>
                <Text style={styles.modeText}>{item.paymentMode}</Text>
              </View>
            ) : null}
            {item.recptNo ? (
              <View style={styles.rcptChip}>
                <Ionicons name="receipt-outline" size={10} color={Colors.muted} />
                <Text style={styles.rcptText}>{item.recptNo}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>

      <Ionicons name="chevron-forward" size={16} color="#ccc" style={{ marginLeft: 8, flexShrink: 0 }} />
    </Pressable>
  );
});

export default ExpenseRow;

const styles = StyleSheet.create({
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.primary,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 12, marginTop: 2, flexShrink: 0,
  },
  avatarText: { fontSize: 18, fontWeight: '700', color: '#fff' },
  subLabel:   { fontSize: 11, color: Colors.muted, marginTop: 1 },
  dateLabel:  { fontSize: 11, color: Colors.muted, marginTop: 2 },
  amount:     { fontSize: 14, fontWeight: '700', color: '#1A1A1A' },
  modeBadge:  {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10,
    backgroundColor: '#FCE4EC', marginTop: 4,
  },
  modeText: { fontSize: 11, fontWeight: '600', color: Colors.primary },
  rcptChip: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 4 },
  rcptText: { fontSize: 11, color: Colors.muted, fontWeight: '500' },
});
