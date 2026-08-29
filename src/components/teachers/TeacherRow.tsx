import React, { memo, useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Pressable, Linking, Image,
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
  onSchedulePress?: (item: TeacherModel) => void;
  activeSubject?: string;
  onSubjectPress?: (subject: string) => void;
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

const TeacherRow = memo(({ item, selected, onPress, onLongPress, onQrPress, onSchedulePress, activeSubject, onSubjectPress }: TeacherRowProps) => {
  const name = item.name ?? String(item.id);
  const subjectList = item.subjectList ?? [];

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
      <Avatar name={String(name)} photo={item.idphoto} />

      {/* Info — two-column layout: left (name/designation) | right (email + subjects) */}
      <View style={KStyles.rowInfo}>
        <View style={KStyles.rowTwoCol}>

          {/* Left column */}
          <View style={KStyles.rowLeftCol}>
            <Text style={KStyles.rowName} numberOfLines={1}>{name}</Text>
            {item.designation ? (
              <Text style={styles.designation} numberOfLines={1}>{String(item.designation)}</Text>
            ) : null}
          </View>

          {/* Right column — email + all subjects stacked */}
          {(item.email || subjectList.length > 0) ? (
            <View style={KStyles.rowRightCol}>
              {item.email ? (
                <View style={styles.metaChip}>
                  <Ionicons name="mail-outline" size={11} color="#555" style={styles.metaChipIcon} />
                  <Text style={styles.metaChipText} numberOfLines={1}>{String(item.email)}</Text>
                </View>
              ) : null}
              {subjectList.length > 0 && (
                <View style={styles.subjectRow}>
                  {subjectList.map((s, i) => {
                    const isActive = activeSubject === s;
                    return (
                      <Pressable
                        key={i}
                        onPress={() => onSubjectPress?.(s)}
                        style={[styles.subjectChip, isActive && styles.subjectChipActive]}
                      >
                        {isActive && (
                          <Ionicons name="filter" size={9} color="#1565C0" style={{ marginRight: 2 }} />
                        )}
                        <Text style={styles.subjectChipText}>{s}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>
          ) : null}

        </View>

        {/* Action buttons — stopPropagation prevents the outer Pressable from swallowing the tap */}
        <View style={KStyles.rowActions} onTouchEnd={(e) => e.stopPropagation()}>
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
              icon="qr-code"
              color="#6A1B9A"
              label="QR Code"
              onPress={() => onQrPress?.(item)}
            />
          )}
          {item.status === 'active' && (
            <ActionButton
              icon="calendar"
              color="#E65100"
              label="Schedule"
              onPress={() => onSchedulePress?.(item)}
            />
          )}
          {item.status === 'active' && (
            <ActionButton
              icon="checkmark-circle"
              color={PRIMARY}
              label="Attendance"
            />
          )}
        </View>
      </View>
    </Pressable>
  );
});

export default TeacherRow;

const styles = StyleSheet.create({
  designation: { fontSize: 12, color: PRIMARY, fontWeight: '600', marginTop: 1 },
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
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#E3F2FD', borderRadius: 10,
    paddingHorizontal: 7, paddingVertical: 2,
  },
  subjectChipActive: {
    backgroundColor: '#BBDEFB',
    borderWidth: 1, borderColor: '#1565C0',
  },
  subjectChipText: { fontSize: 10, color: '#1565C0', fontWeight: '600' },
});
