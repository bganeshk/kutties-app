import React, { memo, useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Pressable, Linking, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { EmployeeModel } from '../../db/models/employee.model';
import { Colors, KStyles } from '../../styles/kutties-styles';

const PRIMARY = Colors.primary;

export type { EmployeeModel as Employee } from '../../db/models/employee.model';

interface EmployeeRowProps {
  item: EmployeeModel;
  selected?: boolean;
  activeDept?: string;
  activeDesig?: string;
  onPress: (item: EmployeeModel) => void;
  onLongPress: (item: EmployeeModel) => void;
  onDeptPress?: (dept: string) => void;
  onDesigPress?: (desig: string) => void;
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

function DeptChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const [tooltipVisible, setTooltipVisible] = useState(false);

  useEffect(() => {
    if (!tooltipVisible) return;
    const t = setTimeout(() => setTooltipVisible(false), 1500);
    return () => clearTimeout(t);
  }, [tooltipVisible]);

  return (
    <Pressable
      onPress={onPress}
      onLongPress={() => setTooltipVisible(true)}
      onHoverIn={() => setTooltipVisible(true)}
      onHoverOut={() => setTooltipVisible(false)}
      style={[styles.deptChip, active && styles.deptChipActive]}
    >
      {tooltipVisible && (
        <View style={styles.deptTooltip}>
          <Text style={KStyles.rowTooltipText}>Dept:</Text>
        </View>
      )}
      {active && (
        <Ionicons name="funnel" size={9} color="#fff" style={{ marginRight: 3 }} />
      )}
      <Text style={[styles.deptChipText, active && styles.deptChipTextActive]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

function DesigChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.desigChip, active && styles.desigChipActive]}
    >
      {active && (
        <Ionicons name="funnel" size={9} color="#fff" style={{ marginRight: 3 }} />
      )}
      <Text style={[styles.desigChipText, active && styles.desigChipTextActive]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const EmployeeRow = memo(({ item, selected, activeDept, activeDesig, onPress, onLongPress, onDeptPress, onDesigPress }: EmployeeRowProps) => {
  const name = item.name ?? String(item.id);

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

      {/* Info — two-column layout: left (name/designation) | right (department + email) */}
      <View style={KStyles.rowInfo}>
        <View style={KStyles.rowTwoCol}>

          {/* Left column */}
          <View style={KStyles.rowLeftCol}>
            <Text style={KStyles.rowName} numberOfLines={1}>{name}</Text>
            {item.designation ? (
              <DesigChip
                label={String(item.designation)}
                active={activeDesig === item.designation}
                onPress={() => onDesigPress?.(String(item.designation))}
              />
            ) : null}
          </View>

          {/* Right column — department chip + email */}
          {(item.department || item.email) ? (
            <View style={KStyles.rowRightCol}>
              {item.department ? (
                <DeptChip
                  label={String(item.department)}
                  active={activeDept === item.department}
                  onPress={() => onDeptPress?.(String(item.department))}
                />
              ) : null}
              {item.email ? (
                <View style={styles.metaChip}>
                  <Ionicons name="mail-outline" size={11} color="#555" style={styles.metaChipIcon} />
                  <Text style={styles.metaChipText} numberOfLines={1}>{String(item.email)}</Text>
                </View>
              ) : null}
            </View>
          ) : null}

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

export default EmployeeRow;

const styles = StyleSheet.create({
  designation: { fontSize: 12, color: PRIMARY, fontWeight: '600', marginTop: 1 },
  deptChip: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#EDE7F6', borderRadius: 10,
    paddingHorizontal: 7, paddingVertical: 2,
  },
  deptChipActive:     { backgroundColor: '#4527A0' },
  deptTooltip: {
    position: 'absolute',
    bottom: '100%',
    right: 0,
    backgroundColor: 'rgba(33,33,33,0.88)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    zIndex: 99,
    alignItems: 'center',
    marginBottom: 4,
  },
  deptChipText:       { fontSize: 10, color: '#4527A0', fontWeight: '600' },
  deptChipTextActive: { color: '#fff' },
  desigChip: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.lightPink, borderRadius: 10,
    paddingHorizontal: 7, paddingVertical: 2, marginTop: 2,
  },
  desigChipActive:     { backgroundColor: PRIMARY },
  desigChipText:       { fontSize: 11, color: PRIMARY, fontWeight: '600' },
  desigChipTextActive: { color: '#fff' },
  metaChip: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F5F5F5', borderRadius: 8,
    paddingHorizontal: 7, paddingVertical: 3,
  },
  metaChipIcon: { marginRight: 3 },
  metaChipText: { fontSize: 11, color: '#555', flexShrink: 1 },
});
