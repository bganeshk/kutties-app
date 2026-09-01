import React, { memo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { StudentMarkSheetModel } from '../../db/models/studentmarksheet.model';
import { Colors, KStyles } from '../../styles/kutties-styles';
import { formatDisplayDate } from '../../utils/dateUtils';

const PRIMARY = Colors.primary;

interface Props {
  item: StudentMarkSheetModel;
  onPress: (item: StudentMarkSheetModel) => void;
}

// Grade → colour mapping
const GRADE_COLORS: Record<string, { bg: string; text: string }> = {
  'A+': { bg: '#E8F5E9', text: '#1B5E20' },
  'A':  { bg: '#F1F8E9', text: '#2E7D32' },
  'B':  { bg: '#E3F2FD', text: '#1565C0' },
  'C':  { bg: '#FFF8E1', text: '#F57F17' },
  'D':  { bg: '#FFF3E0', text: '#E65100' },
  'F':  { bg: '#FFEBEE', text: '#C62828' },
};

const StudentMarkSheetRow = memo(({ item, onPress }: Props) => {
  const gradeStyle = (item.grade ? GRADE_COLORS[item.grade] : null) ?? { bg: '#F5F5F5', text: '#757575' };
  const pct = item.maxMarks && item.maxMarks > 0 && item.marksObtained != null
    ? Math.round((item.marksObtained / item.maxMarks) * 100)
    : null;

  return (
    <Pressable
      onPress={() => onPress(item)}
      android_ripple={{ color: `${PRIMARY}1A` }}
      style={({ pressed }) => [KStyles.rowContainer, pressed && KStyles.rowPressed]}
    >
      {/* Avatar */}
      <View style={styles.avatar}>
        <Ionicons name="document-text-outline" size={20} color="#fff" />
      </View>

      {/* Content grid */}
      <View style={styles.grid}>

        {/* Row 1: subject (left) · grade badge (right) */}
        <View style={styles.gridRow}>
          <Text style={styles.subject} numberOfLines={1}>
            {item.subject ?? '—'}
          </Text>
          {item.grade ? (
            <View style={[styles.gradeBadge, { backgroundColor: gradeStyle.bg }]}>
              <Text style={[styles.gradeText, { color: gradeStyle.text }]}>
                {item.grade}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Row 2: exam name (left) · marks / max (right) */}
        <View style={styles.gridRow}>
          <View style={styles.metaCell}>
            <Ionicons name="clipboard-outline" size={11} color={Colors.muted} />
            <Text style={styles.metaText} numberOfLines={1}>
              {item.examName ?? '—'}
            </Text>
          </View>
          {item.marksObtained != null && item.maxMarks != null ? (
            <Text style={styles.marksText}>
              {item.marksObtained}/{item.maxMarks}
              {pct != null ? ` (${pct}%)` : ''}
            </Text>
          ) : null}
        </View>

        {/* Row 3: exam date · subj teacher */}
        <View style={styles.gridRow}>
          {item.examDate ? (
            <View style={styles.metaCell}>
              <Ionicons name="calendar-outline" size={11} color={Colors.muted} />
              <Text style={styles.metaText}>{formatDisplayDate(item.examDate)}</Text>
            </View>
          ) : null}
          {item.subjTeacher ? (
            <View style={styles.metaCell}>
              <Ionicons name="person-outline" size={11} color={Colors.muted} />
              <Text style={styles.metaText} numberOfLines={1}>{item.subjTeacher}</Text>
            </View>
          ) : null}
        </View>

      </View>

      <Ionicons name="chevron-forward" size={16} color="#ccc" style={{ marginLeft: 8, flexShrink: 0 }} />
    </Pressable>
  );
});

export default StudentMarkSheetRow;

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
  grid:    { flex: 1, gap: 4 },
  gridRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  subject: { fontSize: 14, fontWeight: '700', color: '#222', flex: 1, paddingRight: 6 },
  gradeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  gradeText:  { fontSize: 12, fontWeight: '800', letterSpacing: 0.4 },
  marksText:  { fontSize: 12, fontWeight: '600', color: PRIMARY },
  metaCell:   { flexDirection: 'row', alignItems: 'center', gap: 3, flex: 1 },
  metaText:   { fontSize: 11, color: Colors.muted, fontWeight: '500', flexShrink: 1 },
});
