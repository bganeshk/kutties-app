import React, { memo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { CourseTimeTableModel } from '../../../db/models/coursetimetable.model';
import { Colors, KStyles } from '../../../styles/kutties-styles';

const PRIMARY = Colors.primary;

interface CourseTimeTableRowProps {
  item: CourseTimeTableModel;
  selected?: boolean;
  onPress: (item: CourseTimeTableModel) => void;
  onLongPress: (item: CourseTimeTableModel) => void;
}

const CourseTimeTableRow = memo(({ item, selected, onPress, onLongPress }: CourseTimeTableRowProps) => {
  const timeLabel =
    item.startTime && item.endTime
      ? `${item.startTime} – ${item.endTime}`
      : item.startTime ?? item.endTime ?? '';

  return (
    <Pressable
      onPress={() => onPress(item)}
      onLongPress={() => onLongPress(item)}
      android_ripple={{ color: 'rgba(194,24,91,0.1)' }}
      style={({ pressed }) => [
        KStyles.rowContainer,
        selected && KStyles.selected,
        pressed && KStyles.rowPressed,
      ]}
    >
      {/* Avatar */}
      <View style={styles.avatar}>
        <Ionicons name="calendar-outline" size={22} color="#fff" />
      </View>

      {/* Info */}
      <View style={KStyles.rowInfo}>
        <View style={KStyles.rowTwoCol}>

          {/* Left */}
          <View style={KStyles.rowLeftCol}>
            <Text style={KStyles.rowName} numberOfLines={1}>
              {item.subject || '—'}
            </Text>
            <View style={styles.metaRow}>
              <Ionicons name="layers-outline" size={11} color={PRIMARY} style={{ marginRight: 3 }} />
              <Text style={styles.metaText} numberOfLines={1}>{item.courseDivision || '—'}</Text>
            </View>
            {item.teacher ? (
              <View style={styles.metaRow}>
                <Ionicons name="person-outline" size={11} color="#888" style={{ marginRight: 3 }} />
                <Text style={styles.metaTextMuted} numberOfLines={1}>{item.teacher}</Text>
              </View>
            ) : null}
          </View>

          {/* Right — day + time */}
          <View style={[KStyles.rowRightCol, { gap: 4, alignItems: 'flex-end' }]}>
            <View style={styles.dayChip}>
              <Text style={styles.dayChipText}>{item.day || '—'}</Text>
            </View>
            {timeLabel ? (
              <View style={styles.timeChip}>
                <Ionicons name="time-outline" size={10} color="#1565C0" style={{ marginRight: 2 }} />
                <Text style={styles.timeChipText}>{timeLabel}</Text>
              </View>
            ) : null}
          </View>

        </View>

        {/* Notes */}
        {item.notes ? (
          <Text style={styles.notesText} numberOfLines={1}>{item.notes}</Text>
        ) : null}
      </View>
    </Pressable>
  );
});

export default CourseTimeTableRow;

const styles = StyleSheet.create({
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: PRIMARY,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 12, marginTop: 2,
  },
  metaRow:  { flexDirection: 'row', alignItems: 'center', marginTop: 3 },
  metaText: { fontSize: 11, color: PRIMARY, fontWeight: '600', flexShrink: 1 },
  metaTextMuted: { fontSize: 11, color: '#888', flexShrink: 1 },
  dayChip: {
    backgroundColor: '#FCE4EC', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  dayChipText: { fontSize: 11, color: PRIMARY, fontWeight: '700' },
  timeChip: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#E3F2FD', borderRadius: 8,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  timeChipText: { fontSize: 10, color: '#1565C0', fontWeight: '600' },
  notesText: { fontSize: 11, color: '#888', marginTop: 5 },
});
