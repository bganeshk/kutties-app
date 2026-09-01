import React, { memo } from 'react';
import { View, Text, StyleSheet, Pressable, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { StaffPayModel } from '../../db/models/staffpay.model';
import { Colors, KStyles } from '../../styles/kutties-styles';
import { formatDisplayDate } from '../../utils/dateUtils';

const PRIMARY = Colors.primary;

interface Props {
  item: StaffPayModel;
  /** Resolved display name for item.staff (email) */
  staffName?: string;
  /** Currently active month filter — chip highlights when it matches */
  activeMonth?: string | null;
  onPress: (item: StaffPayModel) => void;
  /** Called when the pay-month chip is tapped — parent toggles activeMonth */
  onMonthPress?: (month: string) => void;
}

const StaffPayRow = memo(({ item, staffName, activeMonth, onPress, onMonthPress }: Props) => {
  // staffName = resolved display name; item.staff = raw email from Excel
  const displayName  = staffName ?? item.staff ?? '—';
  // Only show email on the second line when a separate name was resolved
  const displayEmail = staffName && item.staff ? item.staff : null;

  return (
    <Pressable
      onPress={() => onPress(item)}
      android_ripple={{ color: 'rgba(194,24,91,0.1)' }}
      style={({ pressed }) => [KStyles.rowContainer, pressed && KStyles.rowPressed]}
    >
      {/* Avatar — initials */}
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {displayName.trim().charAt(0).toUpperCase()}
        </Text>
      </View>

      <View style={KStyles.rowInfo}>
        <View style={KStyles.rowTwoCol}>
          <View style={KStyles.rowLeftCol}>
            {/* Staff name */}
            <Text style={KStyles.rowName} numberOfLines={1}>{displayName}</Text>
            {/* Email always on second line */}
            {displayEmail ? (
              <Text style={styles.emailLabel} numberOfLines={1}>{displayEmail}</Text>
            ) : null}
            {/* Pay date */}
            {item.payDate ? (
              <Text style={styles.dateLabel}>Paid: {formatDisplayDate(item.payDate)}</Text>
            ) : null}
          </View>

          <View style={KStyles.rowRightCol}>
            {item.amount != null ? (
              <Text style={styles.amount}>₹{item.amount.toLocaleString('en-IN')}</Text>
            ) : null}
            {item.payMode ? (
              <View style={styles.modeBadge}>
                <Text style={styles.modeText}>{item.payMode}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Bottom chip row */}
        <View style={styles.chipsRow}>
          {/* Pay month — tappable chip */}
          {item.payMonth ? (() => {
            const isActive = activeMonth != null && activeMonth === item.payMonth.trim();
            return (
              <TouchableOpacity
                style={[styles.monthChip, isActive && styles.monthChipActive]}
                onPress={(e) => {
                  e.stopPropagation?.();
                  onMonthPress?.(item.payMonth!);
                }}
                hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                activeOpacity={0.7}
              >
                <Ionicons name="calendar-outline" size={10} color={isActive ? '#fff' : PRIMARY} />
                <Text style={[styles.monthChipText, isActive && styles.monthChipTextActive]}>
                  {item.payMonth}
                </Text>
              </TouchableOpacity>
            );
          })() : null}

          {/* Receipt number */}
          {item.recptNo ? (
            <View style={styles.statChip}>
              <Ionicons name="receipt-outline" size={10} color={Colors.muted} />
              <Text style={styles.statText}>{item.recptNo}</Text>
            </View>
          ) : null}
        </View>
      </View>

      <Ionicons name="chevron-forward" size={16} color="#ccc" style={{ marginLeft: 8, flexShrink: 0 }} />
    </Pressable>
  );
});

export default StaffPayRow;

const styles = StyleSheet.create({
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2E7D32',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
    flexShrink: 0,
  },
  avatarText: { fontSize: 18, fontWeight: '700', color: '#fff' },
  emailLabel: { fontSize: 11, color: Colors.muted, marginTop: 1 },
  dateLabel:  { fontSize: 11, color: Colors.muted, marginTop: 2 },
  amount:     { fontSize: 14, fontWeight: '700', color: '#1A1A1A' },
  modeBadge:  { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, backgroundColor: '#E8F5E9', marginTop: 4 },
  modeText:   { fontSize: 11, fontWeight: '600', color: '#2E7D32' },

  chipsRow:   { flexDirection: 'row', gap: 8, marginTop: 5, flexWrap: 'wrap', alignItems: 'center' },

  monthChip: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#EDE7F6',
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 10,
  },
  monthChipActive:     { backgroundColor: PRIMARY },
  monthChipText:       { fontSize: 11, color: PRIMARY, fontWeight: '700' },
  monthChipTextActive: { color: '#fff' },

  statChip:  { flexDirection: 'row', alignItems: 'center', gap: 3 },
  statText:  { fontSize: 11, color: Colors.muted, fontWeight: '500' },
});
