import React, { memo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { StudentDiaryModel } from '../../db/models/studentdiary.model';
import { Colors, KStyles } from '../../styles/kutties-styles';
import { formatDisplayDate } from '../../utils/dateUtils';

const PRIMARY = Colors.primary;

interface Props {
  item: StudentDiaryModel;
  studentName?: string;   // unused — kept for call-site compat
  hideStudentName?: boolean; // unused — kept for call-site compat
  onPress: (item: StudentDiaryModel) => void;
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  'Homework':    { bg: '#E3F2FD', text: '#1565C0' },
  'Behaviour':   { bg: '#FFF3E0', text: '#E65100' },
  'Achievement': { bg: '#F1F8E9', text: '#2E7D32' },
  'Note':        { bg: '#FCE4EC', text: '#C2185B' },
  'Warning':     { bg: '#FFEBEE', text: '#C62828' },
};

const StudentDiaryRow = memo(({ item, onPress }: Props) => {
  const catStyle = (item.category ? CATEGORY_COLORS[item.category] : null) ?? { bg: '#F5F5F5', text: '#757575' };

  return (
    <Pressable
      onPress={() => onPress(item)}
      android_ripple={{ color: `${PRIMARY}1A` }}
      style={({ pressed }) => [KStyles.rowContainer, pressed && KStyles.rowPressed]}
    >
      {/* Avatar */}
      <View style={styles.avatar}>
        <Ionicons name="book-outline" size={20} color="#fff" />
      </View>

      {/* 2-col × 3-row grid */}
      <View style={styles.grid}>

        {/* Row 1: Created by (left) · Category badge (right) */}
        <View style={styles.gridRow}>
           <View style={styles.leftCol}>
            {item.diaryDate ? (
              <Text style={styles.dateLabel}>{formatDisplayDate(item.diaryDate)}</Text>
            ) : null}
          </View>
          <View style={styles.rightCol}>
            {item.category ? (
              <View style={[styles.categoryBadge, { backgroundColor: catStyle.bg }]}>
                <Text style={[styles.categoryText, { color: catStyle.text }]}>
                  {item.category}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Row 2: Date (left) · Stars (right) */}
        <View style={styles.gridRow}>
         <View style={styles.leftCol}>
            {item.createdBy ? (
              <View style={styles.metaCell}>
                <Ionicons name="person-outline" size={11} color={Colors.muted} />
                <Text style={styles.metaText} numberOfLines={1}>{item.createdBy}</Text>
              </View>
            ) : null}
          </View>
          <View style={styles.rightCol}>
            {item.rating != null && item.rating > 0 ? (
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((s) => (
                  <Ionicons
                    key={s}
                    name={s <= item.rating! ? 'star' : 'star-outline'}
                    size={11}
                    color={s <= item.rating! ? '#FBC02D' : '#BDBDBD'}
                  />
                ))}
              </View>
            ) : null}
          </View>
        </View>

        {/* Row 3: Teacher note spanning full width */}
        {item.teacherNote ? (
          <View style={styles.metaCell}>
            <Ionicons name="chatbubble-ellipses-outline" size={11} color={PRIMARY} />
            <Text style={[styles.metaText, { color: PRIMARY, flex: 1 }]} numberOfLines={2}>{item.teacherNote}</Text>
          </View>
        ) : null}

      </View>

      <Ionicons name="chevron-forward" size={16} color="#ccc" style={{ marginLeft: 8, flexShrink: 0 }} />
    </Pressable>
  );
});

export default StudentDiaryRow;

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
  grid:     { flex: 1, gap: 4 },
  gridRow:  { flexDirection: 'row', alignItems: 'center' },
  leftCol:  { flex: 1, paddingRight: 6 },
  rightCol: { alignItems: 'flex-end', justifyContent: 'center' },
  dateLabel:    { fontSize: 11, color: Colors.muted },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  categoryText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },
  starsRow:     { flexDirection: 'row', gap: 1 },
  metaCell:     { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaText:     { fontSize: 11, color: Colors.muted, fontWeight: '500', flexShrink: 1 },
});
