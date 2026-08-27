import React, { memo, useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Pressable, Linking, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { StudentModel } from '../../db/models/student.model';
import { Colors, KStyles } from '../../styles/kutties-styles';

const PRIMARY = Colors.primary;

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
      style={styles.actionBtn}
      onPress={onPress}
      onLongPress={() => setVisible(true)}
      onHoverIn={() => setVisible(true)}
      onHoverOut={() => setVisible(false)}
    >
      {visible && (
        <View style={styles.tooltip}>
          <Text style={styles.tooltipText}>{label}</Text>
        </View>
      )}
      <Ionicons name={icon as any} size={18} color={color} />
    </Pressable>
  );
}

function Avatar({ name, photo }: { name: string; photo?: string }) {
  if (photo) {
    return <Image source={{ uri: photo }} style={styles.avatar} />;
  }
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
  return (
    <View style={styles.avatar}>
      <Text style={styles.avatarText}>{initials || '?'}</Text>
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
        styles.container,
        selected && styles.selected,
        pressed && styles.pressed,
      ]}
    >
      <Avatar name={String(name)} photo={item.idphoto} />

      <View style={styles.info}>
        <View style={styles.twoCol}>

          {/* Left: name + parent */}
          <View style={styles.leftCol}>
            <Text style={styles.name} numberOfLines={1}>{name}</Text>
            {(item.motherName || item.fatherName) ? (
              <Text style={styles.parentName} numberOfLines={1}>
                <Ionicons name="people-outline" size={10} color="#888" />{' '}
                {[item.motherName, item.fatherName].filter(Boolean).join(' / ')}
              </Text>
            ) : null}
          </View>

          {/* Right: reg number + course */}
          <View style={styles.rightCol}>
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
        <View style={styles.actions}>
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
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
  },
  selected: KStyles.selected,
  pressed:  { backgroundColor: '#F5F5F5' },
  avatar: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: PRIMARY,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 12, marginTop: 2,
  },
  avatarText: { fontSize: 18, fontWeight: '700', color: '#fff' },
  info: { flex: 1 },
  twoCol: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 2 },
  leftCol: { flex: 1, paddingRight: 8 },
  rightCol: { width: 155, alignItems: 'flex-end', gap: 4 },
  name: { fontSize: 15, fontWeight: '700', color: '#1A1A1A' },
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
  actions: { flexDirection: 'row', marginTop: 6, gap: 4 },
  actionBtn: { padding: 7, borderRadius: 20, backgroundColor: '#F5F5F5' },
  tooltip: {
    position: 'absolute',
    bottom: '100%',
    left: '50%',
    transform: [{ translateX: -28 }],
    backgroundColor: 'rgba(33,33,33,0.88)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    zIndex: 99,
    minWidth: 56,
    alignItems: 'center',
    marginBottom: 4,
  },
  tooltipText: { fontSize: 11, color: '#fff', fontWeight: '500' },
});
