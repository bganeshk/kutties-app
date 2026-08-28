import React, { memo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { CourseModel } from '../../db/models/course.model';
import { Colors, KStyles } from '../../styles/kutties-styles';

const PRIMARY = Colors.primary;

export type { CourseModel as Course } from '../../db/models/course.model';

interface CourseRowProps {
  item: CourseModel;
  selected?: boolean;
  onPress: (item: CourseModel) => void;
  onLongPress: (item: CourseModel) => void;
}

function FeeChip({ label, amount }: { label: string; amount?: number }) {
  if (!amount) return null;
  return (
    <View style={styles.feeChip}>
      <Text style={styles.feeChipLabel}>{label}</Text>
      <Text style={styles.feeChipAmount}>₹{amount.toLocaleString()}</Text>
    </View>
  );
}

const CourseRow = memo(({ item, selected, onPress, onLongPress }: CourseRowProps) => {
  const name     = item.courseName ?? String(item.id);
  const subjects = item.subjectList;

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
      {/* Avatar / icon */}
      <View style={styles.avatar}>
        <Ionicons name="school" size={22} color="#fff" />
      </View>

      {/* Info */}
      <View style={KStyles.rowInfo}>
        <View style={KStyles.rowTwoCol}>

          {/* Left column */}
          <View style={KStyles.rowLeftCol}>
            <Text style={KStyles.rowName} numberOfLines={1}>{name} - {item.division}</Text>
            {item.classTeacher ? (
              <View style={styles.teacherRow}>
                <Ionicons name="person-outline" size={11} color={PRIMARY} style={{ marginRight: 3 }} />
                <Text style={[styles.teacherText, {color:PRIMARY,fontWeight:'600'}]} numberOfLines={1}>{item.classTeacher}</Text>
              </View>
            ) : null}
          </View>

          {/* Right column — fee chips */}
          <View style={[KStyles.rowRightCol, { gap: 4 }]}>
            <FeeChip label="Admission" amount={item.admissionFee} />
            <FeeChip label="Course" amount={item.courseFee} />
            {item.bookFee ? <FeeChip label="Book" amount={parseFloat(item.bookFee)} /> : null}
          </View>

        </View>

        {/* Subject tags */}
        <View style={styles.subjectRow}>
          {subjects.slice(0, 5).map((s, i) => (
            <View key={i} style={styles.subjectChip}>
              <Text style={styles.subjectChipText}>{s}</Text>
            </View>
          ))}
          {subjects.length > 5 && (
            <View style={styles.subjectChip}>
              <Text style={styles.subjectChipText}>+{subjects.length - 5}</Text>
            </View>
          )}
        </View>
  {item.classTeacher ? (
              <View style={styles.teacherRow}>
                <Text style={styles.teacherText} numberOfLines={1}>{item.description}</Text>
              </View>
            ) : null}
      </View>
    </Pressable>
  );
});

export default CourseRow;

const styles = StyleSheet.create({
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: PRIMARY,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 12, marginTop: 2,
  },
  division:    { fontSize: 12, color: PRIMARY, fontWeight: '600', marginTop: 1 },
  teacherRow:  { flexDirection: 'row', alignItems: 'center', marginTop: 3 },
  teacherText: { fontSize: 11, color: '#666', flexShrink: 1 },
  feeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#FFF8E1', borderRadius: 8,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  feeChipLabel:  { fontSize: 10, color: '#795548', fontWeight: '600' },
  feeChipAmount: { fontSize: 10, color: '#4E342E', fontWeight: '700' },
  subjectRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 },
  subjectChip: {
    backgroundColor: '#E8F5E9', borderRadius: 10,
    paddingHorizontal: 7, paddingVertical: 2,
  },
  subjectChipText: { fontSize: 10, color: '#2E7D32', fontWeight: '600' },
});
