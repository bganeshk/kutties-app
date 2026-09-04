import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '../navigation/HomeStack';
import { Colors, KStyles } from '../styles/kutties-styles';
import { SHEETS } from '../utils/constants';
import { formatDisplayDate } from '../utils/dateUtils';
import { teacherActivityRepository, teacherRepository } from '../db/repositories';
import type { TeacherActivityModel } from '../db/models/teacheractivity.model';
import type { TeacherModel } from '../db/models/teacher.model';
import type { ActivityType, ActivityStatus } from '../db/models/studentactivity.model';
import { syncSheet } from '../sync/sync.service';
import ConfirmDialog from '../components/shared/ConfirmDialog';
import InfoRow from '../components/shared/InfoRow';

const PRIMARY = Colors.primary;

type Props = NativeStackScreenProps<HomeStackParamList, 'TeacherActivityDetails'>;

// ── Visual maps ───────────────────────────────────────────────────────────────
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

function Section({ title }: { title: string }) {
  return <Text style={KStyles.detailsSection}>{title}</Text>;
}

function TypeBadge({ type }: { type?: ActivityType }) {
  if (!type) return null;
  const c = TYPE_COLORS[type];
  return (
    <View style={[styles.typeBadge, { backgroundColor: c.bg }]}>
      <Text style={[styles.typeBadgeText, { color: c.text }]}>{type}</Text>
    </View>
  );
}

function StatusChip({ status }: { status?: ActivityStatus }) {
  if (!status) return null;
  const c = STATUS_COLORS[status];
  return (
    <View style={[styles.statusChip, { backgroundColor: c.bg }]}>
      <Text style={[styles.statusText, { color: c.text }]}>{status}</Text>
    </View>
  );
}

function StarRow({ rating }: { rating?: number }) {
  if (rating == null) return null;
  if (rating === -1) {
    return (
      <View style={styles.starRow}>
        <Ionicons name="warning-outline" size={18} color="#C62828" />
        <Text style={[styles.ratingLabel, { color: '#C62828' }]}>  Negative (overdue)</Text>
      </View>
    );
  }
  return (
    <View style={styles.starRow}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Ionicons
          key={s}
          name={s <= rating ? 'star' : 'star-outline'}
          size={20}
          color="#FDD835"
        />
      ))}
      <Text style={styles.ratingLabel}> {rating}/5</Text>
    </View>
  );
}

export default function TeacherActivityDetailsScreen({ navigation, route }: Props) {
  const [item,          setItem]          = useState<TeacherActivityModel>(route.params.item);
  const [deleteVisible, setDeleteVisible] = useState(false);
  const [assigneeTeacher, setAssigneeTeacher] = useState<TeacherModel | undefined>();
  const [assignorTeacher, setAssignorTeacher] = useState<TeacherModel | undefined>();

  // ── Refresh on focus ───────────────────────────────────────────────────────
  useFocusEffect(
    useCallback(() => {
      teacherActivityRepository.findById(route.params.item.id).then((fresh) => {
        if (fresh) setItem(fresh);
      });
    }, [route.params.item.id]),
  );

  // ── Resolve assignee teacher ──────────────────────────────────────────────
  React.useEffect(() => {
    if (!item.assignee) return;
    teacherRepository.findAll().then((rows) => {
      const match = rows.find((t) => (t.email ?? '').toLowerCase() === item.assignee?.toLowerCase());
      setAssigneeTeacher(match);
    });
  }, [item.assignee]);

  // ── Resolve assignor teacher ──────────────────────────────────────────────
  React.useEffect(() => {
    if (!item.assignor) return;
    teacherRepository.findAll().then((rows) => {
      const match = rows.find((t) => (t.email ?? t.name ?? '').toLowerCase() === item.assignor?.toLowerCase());
      setAssignorTeacher(match);
    });
  }, [item.assignor]);

  const typeStyle      = item.activityType ? TYPE_COLORS[item.activityType] : null;
  const isAssignment   = item.activityType === 'Assignment';
  const isNotification = item.activityType === 'Notification';
  const canSubmit      = item.status === 'in-progress' && isAssignment;
  const canReview      = item.status === 'in-review';

  const handleDelete = useCallback(() => {
    teacherActivityRepository.delete(item.id).then(() => {
      syncSheet(SHEETS.TEACHER_ACTIVITY).catch(() => {});
      navigation.goBack();
    });
  }, [item.id, navigation]);

  return (
    <SafeAreaView style={KStyles.detailsRoot}>
      {/* Header */}
      <View style={KStyles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={KStyles.headerTitle} numberOfLines={1}>Activity</Text>
        <View style={KStyles.headerActions}>
          <TouchableOpacity
            style={KStyles.headerIcon}
            onPress={() => navigation.navigate('TeacherActivityForm', { mode: 'edit', item })}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="create-outline" size={22} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            style={KStyles.headerIcon}
            onPress={() => setDeleteVisible(true)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="trash-outline" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={KStyles.detailsScroll}>

        {/* ── Hero card ──────────────────────────────────────────────────── */}
        <View style={KStyles.detailsHeroCard}>
          <View style={[styles.heroAvatar, typeStyle && { backgroundColor: typeStyle.bg }]}>
            <Ionicons
              name={
                isAssignment   ? 'document-text'  :
                isNotification ? 'notifications'  : 'checkmark-circle'
              }
              size={36}
              color={typeStyle?.text ?? PRIMARY}
            />
          </View>
          <Text style={KStyles.detailsHeroName}>{item.title ?? '—'}</Text>
          <View style={styles.heroChips}>
            <TypeBadge type={item.activityType} />
            <StatusChip status={item.status} />
            {item.isOverdue && (
              <View style={styles.overdueBadge}>
                <Text style={styles.overdueText}>Overdue</Text>
              </View>
            )}
          </View>
        </View>

        {/* ── Activity ───────────────────────────────────────────────────── */}
        <Section title="Activity" />
        <View style={KStyles.detailsCard}>
          <InfoRow icon="pricetag-outline"       label="Category"   value={item.category}                        iconBg={PRIMARY} />
          <InfoRow icon="school-outline"         label="Course"     value={item.course}                          iconBg={PRIMARY} />
          <InfoRow icon="calendar-outline"       label="Start Date" value={formatDisplayDate(item.startDate)}     iconBg={PRIMARY} />
          <InfoRow icon="calendar-clear-outline" label="End Date"   value={formatDisplayDate(item.endDate)}       iconBg={PRIMARY} />
        </View>

        {/* Description */}
        {item.description ? (
          <>
            <Section title="Description" />
            <View style={KStyles.detailsCard}>
              <InfoRow icon="reader-outline" label="Description" value={item.description} />
            </View>
          </>
        ) : null}

        {/* ── People ─────────────────────────────────────────────────────── */}
        <Section title="People" />
        <View style={KStyles.detailsCard}>
          <InfoRow
            icon="person-circle-outline"
            label="Assignor"
            value={assignorTeacher?.name ?? item.assignor}
            iconBg={PRIMARY}
          />
          <InfoRow
            icon="person-circle-outline"
            label="Assignee"
            value={assigneeTeacher?.name ?? item.assignee}
            iconBg={PRIMARY}
            onPress={assigneeTeacher ? () => navigation.navigate('TeacherDetails', { item: assigneeTeacher }) : undefined}
          />
          {!isNotification && item.reviewer ? (
            <InfoRow icon="glasses-outline" label="Reviewer" value={item.reviewer} />
          ) : null}
        </View>

        {/* ── Submission (Assignment only) ────────────────────────────────── */}
        {isAssignment && (item.submissionAttachments?.length || item.submissionNote) ? (
          <>
            <Section title="Submission" />
            <View style={KStyles.detailsCard}>
              {item.submissionNote ? (
                <InfoRow icon="chatbubble-outline" label="Note" value={item.submissionNote} />
              ) : null}
              {item.submissionAttachments?.map((url, i) => (
                <InfoRow
                  key={i}
                  icon="attach-outline"
                  label={`Attachment ${i + 1}`}
                  value={url}
                  onPress={() => Linking.openURL(url)}
                />
              ))}
            </View>
          </>
        ) : null}

        {/* ── Rating (Assignment, closed) ─────────────────────────────────── */}
        {isAssignment && item.status === 'closed' ? (
          <>
            <Section title="Rating" />
            <View style={KStyles.detailsCard}>
              <View style={[KStyles.detailsInfoRow, { paddingVertical: 14 }]}>
                <View style={KStyles.detailsInfoIconWrap}>
                  <Ionicons name="star-outline" size={18} color={PRIMARY} />
                </View>
                <View style={KStyles.detailsInfoText}>
                  <Text style={KStyles.detailsInfoLabel}>Rating</Text>
                  <StarRow rating={item.rating} />
                </View>
              </View>
            </View>
          </>
        ) : null}

        {/* ── Close info ─────────────────────────────────────────────────── */}
        {item.closedBy ? (
          <>
            <Section title="Close Info" />
            <View style={KStyles.detailsCard}>
              <InfoRow icon="lock-closed-outline" label="Closed By" value={item.closedBy} iconBg={PRIMARY} />
            </View>
          </>
        ) : null}

        {/* ── Audit ──────────────────────────────────────────────────────── */}
        {item.lastmodified ? (
          <>
            <Section title="Audit" />
            <View style={KStyles.detailsCard}>
              <InfoRow icon="time-outline" label="Last Modified" value={item.lastmodified} />
            </View>
          </>
        ) : null}

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Submit / Review action buttons */}
      {(canSubmit || canReview) && (
        <View style={styles.actionRow}>
          {canSubmit && (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#1565C0' }]}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('TeacherActivityForm', { mode: 'submit', item })}
            >
              <Ionicons name="cloud-upload-outline" size={18} color="#fff" style={{ marginRight: 6 }} />
              <Text style={styles.actionBtnText}>Submit</Text>
            </TouchableOpacity>
          )}
          {canReview && (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#2E7D32' }]}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('TeacherActivityForm', { mode: 'review', item })}
            >
              <Ionicons name="star-outline" size={18} color="#fff" style={{ marginRight: 6 }} />
              <Text style={styles.actionBtnText}>Review & Rate</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* FAB — edit */}
      <TouchableOpacity
        style={KStyles.fab}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('TeacherActivityForm', { mode: 'edit', item })}
      >
        <Ionicons name="create" size={26} color="#fff" />
      </TouchableOpacity>

      <ConfirmDialog
        visible={deleteVisible}
        title="Delete Activity"
        message="Are you sure you want to delete this activity? This cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={() => { setDeleteVisible(false); handleDelete(); }}
        onCancel={() => setDeleteVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderTopWidth: 0.5,
    borderTopColor: '#E0E0E0',
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
  },
  actionBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  heroAvatar: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: Colors.lightPink,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 12,
  },
  heroChips:    { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10, justifyContent: 'center' },
  typeBadge:    { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 },
  typeBadgeText:{ fontSize: 12, fontWeight: '700' },
  statusChip:   { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 },
  statusText:   { fontSize: 12, fontWeight: '600' },
  overdueBadge: { backgroundColor: '#FFEBEE', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  overdueText:  { fontSize: 12, fontWeight: '700', color: '#C62828' },
  starRow:      { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  ratingLabel:  { fontSize: 13, color: Colors.muted, fontWeight: '600' },
});
