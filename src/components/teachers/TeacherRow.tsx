import React, { memo, useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Pressable, Linking, Dimensions, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { TeacherModel } from '../../db/models/teacher.model';
import { Colors, KStyles } from '../../styles/kutties-styles';

const PRIMARY = Colors.primary;

export type { TeacherModel as Teacher } from '../../db/models/teacher.model';

interface TeacherRowProps {
  item: TeacherModel;
  selected?: boolean;
  onPress: (item: TeacherModel) => void;
  onLongPress: (item: TeacherModel) => void;
  onQrPress?: (item: TeacherModel) => void;
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
      // pointer devices (web / desktop)
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

const TeacherRow = memo(({ item, selected, onPress, onLongPress, onQrPress }: TeacherRowProps) => {
  const name = item.name ?? String(item.id);
  const subjectList = item.subjectList ?? [];

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
      {/* Avatar */}
      <Avatar name={String(name)} photo={item.idphoto} />

      {/* Info — two-column layout: left (name/designation) | right (email + subjects) */}
      <View style={styles.info}>
        <View style={styles.twoCol}>

          {/* Left column */}
          <View style={styles.leftCol}>
            <Text style={styles.name} numberOfLines={1}>{name}</Text>
            {item.designation ? (
              <Text style={styles.designation} numberOfLines={1}>{String(item.designation)}</Text>
            ) : null}
          </View>

          {/* Right column — email + all subjects stacked */}
          {(item.email || subjectList.length > 0) ? (
            <View style={styles.rightCol}>
              {item.email ? (
                <View style={styles.metaChip}>
                  <Ionicons name="mail-outline" size={11} color="#555" style={styles.metaChipIcon} />
                  <Text style={styles.metaChipText} numberOfLines={1}>{String(item.email)}</Text>
                </View>
              ) : null}
              {subjectList.length > 0 && (
                <View style={styles.subjectRow}>
                  {subjectList.map((s, i) => (
                    <View key={i} style={styles.subjectChip}>
                      <Text style={styles.subjectChipText}>{s}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ) : null}

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
          <ActionButton
            icon="qr-code"
            color="#6A1B9A"
            label="QR Code"
            onPress={() => onQrPress?.(item)}
          />
          <ActionButton
            icon="checkmark-circle"
            color={PRIMARY}
            label="Attendance"
          />
        </View>
      </View>
    </Pressable>
  );
});

export default TeacherRow;

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
  designation: { fontSize: 12, color: PRIMARY, fontWeight: '600', marginTop: 1 },
  meta: { fontSize: 12, color: '#666' },
  metaChip: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F5F5F5', borderRadius: 8,
    paddingHorizontal: 7, paddingVertical: 3,
  },
  metaChipIcon: { marginRight: 3 },
  metaChipText: { fontSize: 11, color: '#555', flexShrink: 1 },
  subjectRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 3,
    justifyContent: 'flex-end', width: 155,
  },
  subjectChip: {
    backgroundColor: '#E3F2FD', borderRadius: 10,
    paddingHorizontal: 7, paddingVertical: 2,
  },
  subjectChipText: { fontSize: 10, color: '#1565C0', fontWeight: '600' },
  actions: { flexDirection: 'row', marginTop: 6, gap: 4 },
  actionBtn: {
    padding: 7, borderRadius: 20,
    backgroundColor: '#F5F5F5',
  },
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
