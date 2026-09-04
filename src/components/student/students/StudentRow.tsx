import React, { memo, useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Pressable, Linking, Image,
} from 'react-native';
// StyleSheet kept for local chip styles only
import { Ionicons } from '@expo/vector-icons';
import type { StudentModel } from '../../../db/models/student.model';
import { Colors, KStyles } from '../../../styles/kutties-styles';

const PRIMARY = Colors.primary;

// ── Birthday helper ───────────────────────────────────────────────────────────
// Returns how many days until the student's next birthday (day+month only).
// Returns null if dob is absent or unparseable.
function daysUntilBirthday(dob: string | undefined | null): number | null {
  if (!dob) return null;
  const d = new Date(dob);
  if (isNaN(d.getTime())) return null;

  const today = new Date();
  const thisYear = today.getFullYear();

  // Next occurrence of the birthday (day+month) this year or next
  let next = new Date(thisYear, d.getMonth(), d.getDate());
  if (next < today) next = new Date(thisYear + 1, d.getMonth(), d.getDate());

  const diffMs = next.getTime() - today.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

interface StudentRowProps {
  item: StudentModel;
  selected?: boolean;
  onPress: (item: StudentModel) => void;
  onLongPress: (item: StudentModel) => void;
  activeCourse?: string;
  onCoursePress?: (course: string) => void;
}

interface ActionButtonProps {
  icon: string;
  color: string;
  label: string;
  onPress?: () => void;
}

function ActionButton({ icon, color, label, onPress }: ActionButtonProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => setVisible(false), 1500);
    return () => clearTimeout(t);
  }, [visible]);

  return (
    <Pressable
      style={KStyles.rowActionBtn}
      onPress={onPress}
      onLongPress={() => setVisible(true)}
      onHoverIn={() => setVisible(true)}
      onHoverOut={() => setVisible(false)}
    >
      {visible && (
        <View style={KStyles.rowTooltip}>
          <Text style={KStyles.rowTooltipText}>{label}</Text>
        </View>
      )}
      <Ionicons name={icon as any} size={18} color={color} />
    </Pressable>
  );
}

function Avatar({ name, photo }: { name: string; photo?: string }) {
  if (photo) {
    return <Image source={{ uri: photo }} style={KStyles.rowAvatar} />;
  }
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
  return (
    <View style={KStyles.rowAvatar}>
      <Text style={KStyles.rowAvatarText}>{initials || '?'}</Text>
    </View>
  );
}

const StudentRow = memo(({ item, selected, onPress, onLongPress, activeCourse, onCoursePress }: StudentRowProps) => {
  const name = item.fullName ?? String(item.id);
  const course = item.course;

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
      <Avatar name={String(name)} photo={item.idphoto} />

      <View style={KStyles.rowInfo}>
        <View style={KStyles.rowTwoCol}>

          {/* Left: name + parent + birthday chip */}
          <View style={KStyles.rowLeftCol}>
            <View style={styles.nameRow}>
              <Text style={[KStyles.rowName, styles.nameText]} numberOfLines={1}>{name}</Text>
              {(() => {
                const days = daysUntilBirthday(item.dob);
                if (days === null || days > 3) return null;
                const label = days === 0 ? '🎂 Today!' : `🎂 in ${days}d`;
                return (
                  <View style={styles.bdayChip}>
                    <Text style={styles.bdayChipText}>{label}</Text>
                  </View>
                );
              })()}
            </View>
            {(item.motherName || item.fatherName) ? (
              <Text style={styles.parentName} numberOfLines={1}>
                <Ionicons name="people-outline" size={10} color="#888" />{' '}
                {[item.motherName, item.fatherName].filter(Boolean).join(' / ')}
              </Text>
            ) : null}
          </View>

          {/* Right: reg number + course */}
          <View style={KStyles.rowRightCol}>
            {item.regNumber ? (
              <View style={styles.regChip}>
                <Text style={styles.regChipText}>{String(item.regNumber)}</Text>
              </View>
            ) : null}
            {course ? (
              <Pressable
                onPress={() => onCoursePress?.(course)}
                style={[styles.courseChip, activeCourse === course && styles.courseChipActive]}
              >
                {activeCourse === course && (
                  <Ionicons name="filter" size={9} color="#1565C0" style={{ marginRight: 2 }} />
                )}
                <Text style={styles.courseChipText} numberOfLines={1}>{String(course)}</Text>
              </Pressable>
            ) : null}
          </View>

        </View>

        {/* Action buttons */}
        <View style={KStyles.rowActions}>
          {item.phone ? (
            <>
              <ActionButton
                icon="call"
                color="#1565C0"
                label="Call"
                onPress={() => Linking.openURL(`tel:${item.phone}`)}
              />
              <ActionButton
                icon="logo-whatsapp"
                color="#2E7D32"
                label="WhatsApp"
                onPress={() => Linking.openURL(`whatsapp://send?phone=${item.phone}`)}
              />
            </>
          ) : null}
          {item.status === 'active' && (
            <ActionButton
              icon="person-add"
              color="#6A1B9A"
              label="Attending Today"
            />
          )}
          {item.status === 'active' && (
            <ActionButton
              icon="wallet"
              color={PRIMARY}
              label="Fee Details"
            />
          )}
        </View>
      </View>
    </Pressable>
  );
});

export default StudentRow;

const styles = StyleSheet.create({
  nameRow:       { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  nameText:      { flexShrink: 1 },
  bdayChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: '#FFB74D',
  },
  bdayChipText:  { fontSize: 10, color: '#E65100', fontWeight: '700' },
  parentName: { fontSize: 12, color: '#666', marginTop: 2 },
  regChip: {
    backgroundColor: '#EDE7F6',
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  regChipText: { fontSize: 11, color: '#4A148C', fontWeight: '700' },
  courseChip: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#E3F2FD', borderRadius: 10,
    paddingHorizontal: 7, paddingVertical: 2,
    maxWidth: 155,
  },
  courseChipActive: {
    backgroundColor: '#BBDEFB',
    borderWidth: 1, borderColor: '#1565C0',
  },
  courseChipText: { fontSize: 10, color: '#1565C0', fontWeight: '600', flexShrink: 1 },
});
