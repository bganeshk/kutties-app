import React, { memo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ParentNoteModel, ParentNoteStatus } from '../../db/models/parentnote.model';
import { Colors, KStyles } from '../../styles/kutties-styles';
import { formatDisplayDate } from '../../utils/dateUtils';

const PRIMARY = Colors.primary;

interface Props {
  item: ParentNoteModel;
  onPress: (item: ParentNoteModel) => void;
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  Absence:   { bg: '#FFF3E0', text: '#E65100' },
  Health:    { bg: '#E8F5E9', text: '#2E7D32' },
  Behaviour: { bg: '#FFF8E1', text: '#F57F17' },
  Academic:  { bg: '#E3F2FD', text: '#1565C0' },
  General:   { bg: '#FCE4EC', text: PRIMARY },
};

const STATUS_CONFIG: Record<ParentNoteStatus, { label: string; bg: string; text: string; icon: string }> = {
  pending:      { label: 'Pending',      bg: '#FFF3E0', text: '#E65100', icon: 'time-outline' },
  acknowledged: { label: 'Acknowledged', bg: '#E8F5E9', text: '#2E7D32', icon: 'checkmark-circle-outline' },
  replied:      { label: 'Replied',      bg: '#E3F2FD', text: '#1565C0', icon: 'chatbubble-ellipses-outline' },
};

const ParentNoteRow = memo(({ item, onPress }: Props) => {
  const catStyle = (item.category ? CATEGORY_COLORS[item.category] : null) ?? { bg: '#F5F5F5', text: '#757575' };
  const status   = item.status ?? 'pending';
  const statusCfg = STATUS_CONFIG[status];

  return (
    <Pressable
      onPress={() => onPress(item)}
      android_ripple={{ color: `${PRIMARY}1A` }}
      style={({ pressed }) => [KStyles.rowContainer, pressed && KStyles.rowPressed]}
    >
      {/* Avatar */}
      <View style={styles.avatar}>
        <Ionicons name="chatbubble-ellipses" size={20} color="#fff" />
      </View>

      <View style={styles.grid}>
        {/* Row 1: date + category badge */}
        <View style={styles.gridRow}>
          <View style={styles.leftCol}>
            {item.noteDate ? (
              <Text style={styles.dateLabel}>{formatDisplayDate(item.noteDate)}</Text>
            ) : null}
          </View>
          <View style={styles.rightCol}>
            {item.category ? (
              <View style={[styles.badge, { backgroundColor: catStyle.bg }]}>
                <Text style={[styles.badgeText, { color: catStyle.text }]}>{item.category}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Row 2: note snippet */}
        {item.noteText ? (
          <Text style={styles.noteText} numberOfLines={2}>{item.noteText}</Text>
        ) : null}

        {/* Row 3: parent name + status badge */}
        <View style={styles.gridRow}>
          <View style={styles.leftCol}>
            {item.parentName ? (
              <View style={styles.metaCell}>
                <Ionicons name="person-outline" size={11} color={Colors.muted} />
                <Text style={styles.metaText} numberOfLines={1}>{item.parentName}</Text>
              </View>
            ) : null}
          </View>
          <View style={[styles.badge, { backgroundColor: statusCfg.bg }]}>
            <Ionicons name={statusCfg.icon as any} size={10} color={statusCfg.text} style={{ marginRight: 3 }} />
            <Text style={[styles.badgeText, { color: statusCfg.text }]}>{statusCfg.label}</Text>
          </View>
        </View>

        {/* Row 4: teacher reply preview */}
        {item.teacherReply ? (
          <View style={styles.metaCell}>
            <Ionicons name="school-outline" size={11} color={PRIMARY} />
            <Text style={[styles.metaText, { color: PRIMARY, flex: 1 }]} numberOfLines={1}>
              {item.teacherReply}
            </Text>
          </View>
        ) : null}
      </View>

      <Ionicons name="chevron-forward" size={16} color="#ccc" style={{ marginLeft: 8, flexShrink: 0 }} />
    </Pressable>
  );
});

export default ParentNoteRow;

const styles = StyleSheet.create({
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: PRIMARY,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 12, marginTop: 2, flexShrink: 0,
  },
  grid:     { flex: 1, gap: 4 },
  gridRow:  { flexDirection: 'row', alignItems: 'center' },
  leftCol:  { flex: 1, paddingRight: 6 },
  rightCol: { alignItems: 'flex-end' },
  dateLabel: { fontSize: 11, color: Colors.muted },
  noteText:  { fontSize: 13, color: '#333', lineHeight: 18 },
  badge: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: 10,
  },
  badgeText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.2 },
  metaCell:  { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaText:  { fontSize: 11, color: Colors.muted, fontWeight: '500', flexShrink: 1 },
});
