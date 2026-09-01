import React, { memo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { StudentAttendanceLogModel } from '../../db/models/studentattendancelog.model';
import { Colors, KStyles } from '../../styles/kutties-styles';
import { formatDisplayDate } from '../../utils/dateUtils';

const PRIMARY = Colors.primary;

const LEAVE_OPTION_COLORS: Record<string, { bg: string; text: string }> = {
  Present:    { bg: '#F1F8E9', text: '#2E7D32' },
  'Half Day': { bg: '#FFF8E1', text: '#F57F17' },
  'Full Day': { bg: '#FFEBEE', text: '#C62828' },
};
const DEFAULT_LEAVE_COLOR = LEAVE_OPTION_COLORS.Present;

interface Props {
  item: StudentAttendanceLogModel;
  /** Resolved full name for item.regNumber */
  studentName?: string;
  onPress: (item: StudentAttendanceLogModel) => void;
}

const StudentAttendanceLogRow = memo(({ item, studentName, onPress }: Props) => {
  const leaveOpt   = item.leaveOption ?? 'Present';
  const leaveStyle = LEAVE_OPTION_COLORS[leaveOpt] ?? DEFAULT_LEAVE_COLOR;
  const isApproved = String(item.approved ?? '').toLowerCase() === 'true' || item.approved === '1';

  const displayName = studentName ?? item.regNumber ?? '—';
  const showReg     = studentName && item.regNumber;

  const initials = displayName
    .split(/[\s]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <Pressable
      onPress={() => onPress(item)}
      android_ripple={{ color: 'rgba(106,27,154,0.1)' }}
      style={({ pressed }) => [KStyles.rowContainer, pressed && KStyles.rowPressed]}
    >
      {/* Avatar */}
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initials || 'S'}</Text>
      </View>

      <View style={KStyles.rowInfo}>
        <View style={KStyles.rowTwoCol}>
          <View style={KStyles.rowLeftCol}>
            <Text style={KStyles.rowName} numberOfLines={1}>{displayName}</Text>
            {showReg ? (
              <Text style={styles.regLabel} numberOfLines={1}>{item.regNumber}</Text>
            ) : null}
            {item.attendanceDate ? (
              <Text style={styles.dateLabel}>{formatDisplayDate(item.attendanceDate)}</Text>
            ) : null}
          </View>

          <View style={KStyles.rowRightCol}>
            {/* Leave badge */}
            <View style={[styles.statusBadge, { backgroundColor: leaveStyle.bg }]}>
              <Text style={[styles.statusText, { color: leaveStyle.text }]}>
                {leaveOpt.toUpperCase()}
              </Text>
            </View>
            {/* Approved indicator */}
            {isApproved ? (
              <View style={styles.approvedChip}>
                <Ionicons name="checkmark-circle" size={11} color="#2E7D32" />
                <Text style={styles.approvedText}>Approved</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Check-in / Check-out */}
        {(item.checkIn || item.checkOut) ? (
          <View style={styles.timeRow}>
            {item.checkIn ? (
              <View style={styles.timeChip}>
                <Ionicons name="log-in-outline" size={11} color={PRIMARY} />
                <Text style={styles.timeText}>{item.checkIn}</Text>
              </View>
            ) : null}
            {item.checkOut ? (
              <View style={styles.timeChip}>
                <Ionicons name="log-out-outline" size={11} color="#757575" />
                <Text style={[styles.timeText, { color: '#757575' }]}>{item.checkOut}</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {item.leaveType ? (
          <Text style={styles.leaveTypeLabel}>Leave type: {item.leaveType}</Text>
        ) : null}
        {item.remarks ? (
          <Text style={styles.remarks} numberOfLines={1}>{item.remarks}</Text>
        ) : null}
      </View>

      <Ionicons name="chevron-forward" size={16} color="#ccc" style={{ marginLeft: 8, flexShrink: 0 }} />
    </Pressable>
  );
});

export default StudentAttendanceLogRow;

const styles = StyleSheet.create({
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
    flexShrink: 0,
  },
  avatarText:    { fontSize: 16, fontWeight: '700', color: '#fff' },
  regLabel:      { fontSize: 11, color: PRIMARY, fontWeight: '600', marginTop: 1 },
  dateLabel:     { fontSize: 12, color: Colors.muted, marginTop: 2 },
  statusBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 10,
    alignSelf: 'flex-end',
  },
  statusText:    { fontSize: 10, fontWeight: '700', letterSpacing: 0.4 },
  approvedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 2,
    alignSelf: 'flex-end',
  },
  approvedText:  { fontSize: 10, color: '#2E7D32', fontWeight: '600' },
  timeRow:       { flexDirection: 'row', gap: 8, marginTop: 5, flexWrap: 'wrap' },
  timeChip:      { flexDirection: 'row', alignItems: 'center', gap: 3 },
  timeText:      { fontSize: 11, color: PRIMARY, fontWeight: '600' },
  leaveTypeLabel:{ fontSize: 12, color: Colors.muted, marginTop: 3 },
  remarks:       { fontSize: 12, color: Colors.muted, marginTop: 2 },
});
