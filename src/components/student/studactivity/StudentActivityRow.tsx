import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../styles/kutties-styles';
import { formatDisplayDate } from '../../../utils/dateUtils';
import type { StudentActivityModel, ActivityType, ActivityStatus } from '../../../db/models/studentactivity.model';

interface Props {
  item: StudentActivityModel;
  onPress: () => void;
  selectedReviewer?: string | null;
  onReviewerPress?: (reviewer: string) => void;
  selectedStatus?: string | null;
  onStatusPress?: (status: string) => void;
  selectedType?: string | null;
  onTypePress?: (type: string) => void;
}

// ── Badge helpers ─────────────────────────────────────────────────────────────
const TYPE_COLORS: Record<ActivityType, { bg: string; text: string }> = {
  Assignment:   { bg: '#E3F2FD', text: '#1565C0' },
  Task:         { bg: '#F3E5F5', text: '#6A1B9A' },
  Notification: { bg: '#FFF8E1', text: '#F57F17' },
};

const STATUS_COLORS: Record<ActivityStatus, { bg: string; text: string }> = {
  'open':        { bg: '#F1F8E9', text: '#2E7D32' },
  'in-progress': { bg: '#E3F2FD', text: '#1565C0' },
  'in-review':   { bg: '#FFF3E0', text: '#E65100' },
  'closed':      { bg: '#F5F5F5', text: '#616161' },
};

const TYPE_ICONS: Record<ActivityType, keyof typeof Ionicons.glyphMap> = {
  Assignment:   'document-text-outline',
  Task:         'checkmark-circle-outline',
  Notification: 'notifications-outline',
};

export default function StudentActivityRow({
  item, onPress,
  selectedReviewer, onReviewerPress,
  selectedStatus, onStatusPress,
  selectedType, onTypePress,
}: Props) {
  const typeStyle   = item.activityType ? (TYPE_COLORS[item.activityType] ?? null) : null;
  const statusStyle = item.status       ? (STATUS_COLORS[item.status]     ?? null) : null;
  const icon        = item.activityType ? TYPE_ICONS[item.activityType]   : 'document-outline';

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.75}
    >
      {/* Avatar */}
      <View style={[styles.avatar, typeStyle && { backgroundColor: typeStyle.bg }]}>
        <Ionicons
          name={icon as any}
          size={22}
          color={typeStyle?.text ?? Colors.primary}
        />
      </View>

      {/* Body */}
      <View style={styles.body}>
        {/* Row 1: title + end date (top-right) + overdue flag */}
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={1}>
            {item.title ?? '—'}
          </Text>
          {item.endDate ? (
            <Text style={[styles.endDate, item.isOverdue && styles.endDateOverdue]} numberOfLines={1}>
              {item.isOverdue && <Ionicons name="flag" size={10} color="#C62828" />}
              {' '}{formatDisplayDate(item.endDate)}
            </Text>
          ) : item.isOverdue ? (
            <View style={styles.overdueBadge}>
              <Ionicons name="flag" size={10} color="#C62828" style={{ marginRight: 2 }} />
              <Text style={styles.overdueText}>Overdue</Text>
            </View>
          ) : null}
        </View>

        {/* Row 2: creator · reviewer */}
        <View style={styles.metaRow}>
          {item.assignor ? (
            <Text style={styles.metaChip} numberOfLines={1}>
              <Ionicons name="person-circle-outline" size={11} color={Colors.muted} /> {item.assignor}
            </Text>
          ) : null}
          {item.reviewer ? (
            <TouchableOpacity
              style={[
                styles.reviewerChip,
                selectedReviewer === item.reviewer && styles.reviewerChipActive,
              ]}
              onPress={() => onReviewerPress?.(item.reviewer!)}
              activeOpacity={0.75}
            >
              <Ionicons
                name="glasses-outline"
                size={11}
                color={selectedReviewer === item.reviewer ? '#fff' : Colors.muted}
                style={{ marginRight: 3 }}
              />
              <Text
                style={[
                  styles.reviewerChipText,
                  selectedReviewer === item.reviewer && styles.reviewerChipTextActive,
                ]}
                numberOfLines={1}
              >
                {item.reviewer}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Row 3: type badge + status chip */}
        <View style={styles.badgeRow}>
          {typeStyle && item.activityType ? (
            <TouchableOpacity
              style={[
                styles.typeBadge,
                { backgroundColor: selectedType === item.activityType ? typeStyle.text : typeStyle.bg },
              ]}
              onPress={() => onTypePress?.(item.activityType!)}
              activeOpacity={0.75}
            >
              <Text style={[
                styles.typeBadgeText,
                { color: selectedType === item.activityType ? '#fff' : typeStyle.text },
              ]}>
                {item.activityType}
              </Text>
            </TouchableOpacity>
          ) : null}
          {statusStyle && item.status ? (
            <TouchableOpacity
              style={[
                styles.statusChip,
                { backgroundColor: selectedStatus === item.status ? statusStyle.text : statusStyle.bg },
              ]}
              onPress={() => onStatusPress?.(item.status!)}
              activeOpacity={0.75}
            >
              <Text style={[
                styles.statusText,
                { color: selectedStatus === item.status ? '#fff' : statusStyle.text },
              ]}>
                {item.status}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <Ionicons name="chevron-forward" size={16} color="#CCC" style={styles.chevron} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
  },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.lightPink,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 12, marginTop: 2,
  },
  body:     { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
  title:    { flex: 1, fontSize: 14, fontWeight: '700', color: '#1A1A1A' },
  endDate:        { fontSize: 11, color: Colors.muted, flexShrink: 0 },
  endDateOverdue: { color: '#C62828', fontWeight: '700' },
  metaRow:  { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 6 },
  metaChip: { fontSize: 11, color: Colors.muted },
  reviewerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.muted,
    borderRadius: 20,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  reviewerChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  reviewerChipText:       { fontSize: 11, color: Colors.muted },
  reviewerChipTextActive: { color: '#fff', fontWeight: '600' },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },

  typeBadge:     { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  typeBadgeText: { fontSize: 11, fontWeight: '700' },
  statusChip:    { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  statusText:    { fontSize: 11, fontWeight: '600' },

  overdueBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFEBEE',
    paddingHorizontal: 6, paddingVertical: 1, borderRadius: 5,
  },
  overdueText: { fontSize: 10, fontWeight: '700', color: '#C62828' },
  chevron:     { marginTop: 4, marginLeft: 4 },
});
