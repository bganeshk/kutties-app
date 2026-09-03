import React, { memo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { StudentHealthModel } from '../../../db/models/studenthealth.model';
import { Colors, KStyles } from '../../../styles/kutties-styles';
import { formatDisplayDate } from '../../../utils/dateUtils';

const PRIMARY = Colors.primary;

interface Props {
  item: StudentHealthModel;
  studentName?: string;
  hideStudentName?: boolean;
  onPress: (item: StudentHealthModel) => void;
}

const BLOOD_COLORS: Record<string, { bg: string; text: string }> = {
  'A+':  { bg: '#FFEBEE', text: '#C62828' },
  'A-':  { bg: '#FFEBEE', text: '#C62828' },
  'B+':  { bg: '#E3F2FD', text: '#1565C0' },
  'B-':  { bg: '#E3F2FD', text: '#1565C0' },
  'O+':  { bg: '#F1F8E9', text: '#2E7D32' },
  'O-':  { bg: '#F1F8E9', text: '#2E7D32' },
  'AB+': { bg: '#FFF3E0', text: '#E65100' },
  'AB-': { bg: '#FFF3E0', text: '#E65100' },
};

const StudentHealthRow = memo(({ item, studentName, hideStudentName, onPress }: Props) => {
  const displayName = hideStudentName ? null : (studentName ?? item.regNumber ?? '—');
  const bloodStyle: { bg: string; text: string } = (item.bloodGroup ? BLOOD_COLORS[item.bloodGroup] : null) ?? { bg: '#F5F5F5', text: '#757575' };

  return (
    <Pressable
      onPress={() => onPress(item)}
      android_ripple={{ color: 'rgba(194,24,91,0.1)' }}
      style={({ pressed }) => [KStyles.rowContainer, pressed && KStyles.rowPressed]}
    >
      {/* Avatar */}
      <View style={styles.avatar}>
        <Ionicons name="medkit-outline" size={20} color="#fff" />
      </View>

      <View style={KStyles.rowInfo}>
        <View style={KStyles.rowTwoCol}>
          <View style={KStyles.rowLeftCol}>
            {displayName != null ? (
              <Text style={KStyles.rowName} numberOfLines={1}>{displayName}</Text>
            ) : null}
            {item.checkupDate ? (
              <Text style={displayName == null ? KStyles.rowName : styles.dateLabel}>
                {formatDisplayDate(item.checkupDate)}
              </Text>
            ) : null}
          </View>
          <View style={KStyles.rowRightCol}>
            {item.bloodGroup ? (
              <View style={[styles.bloodBadge, { backgroundColor: bloodStyle.bg }]}>
                <Text style={[styles.bloodText, { color: bloodStyle.text }]}>
                  {item.bloodGroup}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Quick stats row */}
        <View style={styles.statsRow}>
          {item.height != null ? (
            <View style={styles.statChip}>
              <Ionicons name="resize-outline" size={10} color={PRIMARY} />
              <Text style={styles.statText}>{item.height} cm</Text>
            </View>
          ) : null}
          {item.weight != null ? (
            <View style={styles.statChip}>
              <Ionicons name="barbell-outline" size={10} color={PRIMARY} />
              <Text style={styles.statText}>{item.weight} kg</Text>
            </View>
          ) : null}
          {item.allergies ? (
            <View style={styles.alertChip}>
              <Ionicons name="warning-outline" size={10} color="#F57F17" />
              <Text style={styles.alertText} numberOfLines={1}>Allergies</Text>
            </View>
          ) : null}
        </View>

        {item.medicalConditions ? (
          <Text style={styles.conditions} numberOfLines={1}>{item.medicalConditions}</Text>
        ) : null}
      </View>

      <Ionicons name="chevron-forward" size={16} color="#ccc" style={{ marginLeft: 8, flexShrink: 0 }} />
    </Pressable>
  );
});

export default StudentHealthRow;

const styles = StyleSheet.create({
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#00796B',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
    flexShrink: 0,
  },
  emailLabel: { fontSize: 11, color: Colors.muted, marginTop: 1 },
  dateLabel:  { fontSize: 12, color: Colors.muted, marginTop: 2 },
  bloodBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    alignSelf: 'flex-end',
  },
  bloodText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.4 },
  statsRow:  { flexDirection: 'row', gap: 6, marginTop: 5, flexWrap: 'wrap' },
  statChip:  { flexDirection: 'row', alignItems: 'center', gap: 3 },
  statText:  { fontSize: 11, color: PRIMARY, fontWeight: '600' },
  alertChip: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  alertText: { fontSize: 11, color: '#F57F17', fontWeight: '600' },
  conditions:{ fontSize: 12, color: Colors.muted, marginTop: 3 },
});
