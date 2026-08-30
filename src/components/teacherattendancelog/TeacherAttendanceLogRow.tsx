import React, { memo } from 'react';
import { View, Text, StyleSheet, Pressable, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { TeacherAttendanceLogModel } from '../../db/models/teacherattendancelog.model';
import { Colors, KStyles } from '../../styles/kutties-styles';

const PRIMARY = Colors.primary;

/**
 * Display the already-normalised time string from normaliseDateTime.
 * Values arrive as "H:MM:SS AM/PM" or "H:MM AM/PM" — pass through as-is.
 */
function fmtTime(val?: string): string | undefined {
  if (!val) return undefined;
  return val;
}

const LEAVE_OPTION_COLORS: Record<string, { bg: string; text: string }> = {
  Present:  { bg: '#F1F8E9', text: '#2E7D32' },
  'Half Day': { bg: '#FFF8E1', text: '#F57F17' },
  'Full Day': { bg: '#FFEBEE', text: '#C62828' },
};
const DEFAULT_LEAVE_COLOR = LEAVE_OPTION_COLORS.Present;

interface Props {
  item: TeacherAttendanceLogModel;
  teacherName?: string;
  activeFilterEmail?: string;
  onPress: (item: TeacherAttendanceLogModel) => void;
  onEmailChipPress?: (email: string) => void;
}

const TeacherAttendanceLogRow = memo(({ item, teacherName, activeFilterEmail, onPress, onEmailChipPress }: Props) => {
  const leaveOpt   = item.leaveOption ?? 'Present';
  const leaveStyle = LEAVE_OPTION_COLORS[leaveOpt] ?? DEFAULT_LEAVE_COLOR;
  const isApproved   = String(item.approved ?? '').toLowerCase() === 'true' || item.approved === '1';
  const checkInTime  = fmtTime(item.checkIn);
  const checkOutTime = fmtTime(item.checkOut);

  const displayName  = teacherName ?? item.teacherEmail ?? '—';
  const displayEmail = item.teacherEmail;
  const showEmail    = teacherName && displayEmail && displayEmail !== teacherName;

  const initials = displayName
    .split(/[@.\s]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <Pressable
      onPress={() => onPress(item)}
      android_ripple={{ color: 'rgba(194,24,91,0.1)' }}
      style={({ pressed }) => [
        KStyles.rowContainer,
        pressed && KStyles.rowPressed,
      ]}
    >
      {/* Avatar */}
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initials || 'T'}</Text>
      </View>

      <View style={KStyles.rowInfo}>
        <View style={KStyles.rowTwoCol}>
          <View style={KStyles.rowLeftCol}>
            <Text style={KStyles.rowName} numberOfLines={1}>
              {displayName}
            </Text>
            {showEmail ? (
              <TouchableOpacity
                onPress={() => onEmailChipPress?.(displayEmail!)}
                hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                activeOpacity={0.7}
                style={[
                  styles.emailChip,
                  activeFilterEmail === displayEmail && styles.emailChipActive,
                ]}
              >
                <Ionicons
                  name="filter"
                  size={10}
                  color={activeFilterEmail === displayEmail ? '#fff' : PRIMARY}
                />
                <Text
                  style={[
                    styles.emailChipText,
                    activeFilterEmail === displayEmail && styles.emailChipTextActive,
                  ]}
                  numberOfLines={1}
                >
                  {displayEmail}
                </Text>
              </TouchableOpacity>
            ) : null}
            {item.attendanceDate ? (
              <Text style={styles.dateLabel}>{item.attendanceDate}</Text>
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
        {(checkInTime || checkOutTime) ? (
          <View style={styles.timeRow}>
            {checkInTime ? (
              <View style={styles.timeChip}>
                <Ionicons name="log-in-outline" size={11} color={PRIMARY} />
                <Text style={styles.timeText}>{checkInTime}</Text>
              </View>
            ) : null}
            {checkOutTime ? (
              <View style={styles.timeChip}>
                <Ionicons name="log-out-outline" size={11} color="#757575" />
                <Text style={[styles.timeText, { color: '#757575' }]}>{checkOutTime}</Text>
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

export default TeacherAttendanceLogRow;

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
  emailChip: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:                3,
    alignSelf:         'flex-start',
    marginTop:          3,
    paddingHorizontal:  7,
    paddingVertical:    2,
    borderRadius:      10,
    borderWidth:        1,
    borderColor:       PRIMARY,
    backgroundColor:   Colors.lightPink,
  },
  emailChipActive: {
    backgroundColor: PRIMARY,
  },
  emailChipText:     { fontSize: 11, color: PRIMARY, fontWeight: '600' },
  emailChipTextActive: { color: '#fff' },
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
