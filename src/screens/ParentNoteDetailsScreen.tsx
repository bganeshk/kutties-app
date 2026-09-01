import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '../navigation/HomeStack';
import { Colors, KStyles } from '../styles/kutties-styles';
import { SHEETS } from '../utils/constants';
import { formatDisplayDate } from '../utils/dateUtils';
import { parentNoteRepository, studentRepository } from '../db/repositories';
import type { ParentNoteModel, ParentNoteStatus } from '../db/models/parentnote.model';
import type { StudentModel } from '../db/models/student.model';
import { syncSheet } from '../sync/sync.service';
import ConfirmDialog from '../components/shared/ConfirmDialog';
import InfoRow from '../components/shared/InfoRow';

const PRIMARY = Colors.primary;
type Props = NativeStackScreenProps<HomeStackParamList, 'ParentNoteDetails'>;

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

function Section({ title }: { title: string }) {
  return <Text style={KStyles.detailsSection}>{title}</Text>;
}

export default function ParentNoteDetailsScreen({ navigation, route }: Props) {
  const [item, setItem]               = useState<ParentNoteModel>(route.params.item);
  const [deleteVisible, setDeleteVisible] = useState(false);
  const [studentRecord, setStudentRecord] = useState<StudentModel | undefined>(undefined);

  useFocusEffect(
    useCallback(() => {
      parentNoteRepository.findById(route.params.item.id).then((fresh) => {
        if (fresh) setItem(fresh);
      });
    }, [route.params.item.id]),
  );

  React.useEffect(() => {
    if (!item.regNumber) return;
    studentRepository.findAll().then((students) => {
      const match = students.find((s) => s.regNumber === item.regNumber);
      setStudentRecord(match ?? undefined);
    });
  }, [item.regNumber]);

  const studentName = studentRecord?.fullName ?? studentRecord?.regNumber;
  const status      = item.status ?? 'pending';
  const statusCfg   = STATUS_CONFIG[status];
  const catStyle    = (item.category ? CATEGORY_COLORS[item.category] : null) ?? null;

  const handleDelete = useCallback(() => {
    parentNoteRepository.delete(item.id).then(() => {
      syncSheet(SHEETS.PARENT_NOTE).catch(() => {});
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
        <Text style={KStyles.headerTitle} numberOfLines={1}>Parent Note</Text>
        <View style={KStyles.headerActions}>
          {/* Teachers can only acknowledge/reply — separate action */}
          <TouchableOpacity
            style={KStyles.headerIcon}
            onPress={() => navigation.navigate('ParentNoteForm', { mode: 'acknowledge', item })}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="chatbubble-ellipses-outline" size={22} color="#fff" />
          </TouchableOpacity>
          {/* Edit (parent re-edits original note) */}
          <TouchableOpacity
            style={KStyles.headerIcon}
            onPress={() => navigation.navigate('ParentNoteForm', { mode: 'edit', item })}
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
          <View style={styles.heroAvatar}>
            <Ionicons name="chatbubble-ellipses" size={36} color={PRIMARY} />
          </View>
          <TouchableOpacity
            disabled={!studentRecord}
            onPress={studentRecord ? () => navigation.navigate('StudentDetails', { item: studentRecord! }) : undefined}
            activeOpacity={0.7}
          >
            <Text style={[KStyles.detailsHeroName, studentRecord && styles.heroNameLink]}>
              {studentName ?? item.regNumber ?? '—'}
            </Text>
          </TouchableOpacity>
          {studentName && item.regNumber ? (
            <Text style={KStyles.detailsHeroDesignation}>{item.regNumber}</Text>
          ) : null}
          {item.noteDate ? (
            <Text style={KStyles.detailsHeroDesignation}>{formatDisplayDate(item.noteDate)}</Text>
          ) : null}

          <View style={styles.badgeRow}>
            {catStyle && item.category ? (
              <View style={[styles.badge, { backgroundColor: catStyle.bg }]}>
                <Text style={[styles.badgeText, { color: catStyle.text }]}>{item.category}</Text>
              </View>
            ) : null}
            <View style={[styles.badge, { backgroundColor: statusCfg.bg, flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
              <Ionicons name={statusCfg.icon as any} size={12} color={statusCfg.text} />
              <Text style={[styles.badgeText, { color: statusCfg.text }]}>{statusCfg.label}</Text>
            </View>
          </View>
        </View>

        {/* ── Note ───────────────────────────────────────────────────────── */}
        <Section title="Parent Note" />
        <View style={KStyles.detailsCard}>
          <InfoRow icon="person-outline"     label="Student"     value={studentName ?? item.regNumber} iconBg={PRIMARY}
            onPress={studentRecord ? () => navigation.navigate('StudentDetails', { item: studentRecord! }) : undefined} />
          <InfoRow icon="calendar-outline"   label="Date"        value={formatDisplayDate(item.noteDate)} iconBg={PRIMARY} />
          <InfoRow icon="pricetag-outline"   label="Category"    value={item.category} />
          <InfoRow icon="people-outline"     label="Parent"      value={item.parentName} />
        </View>

        {/* ── Note text ──────────────────────────────────────────────────── */}
        {item.noteText ? (
          <>
            <Section title="Note" />
            <View style={[KStyles.detailsCard, styles.textCard]}>
              <Text style={styles.contentText}>{item.noteText}</Text>
            </View>
          </>
        ) : null}

        {/* ── Teacher response ────────────────────────────────────────────── */}
        {(item.acknowledgedBy || item.teacherReply) ? (
          <>
            <Section title="Teacher Response" />
            <View style={KStyles.detailsCard}>
              {item.acknowledgedBy ? (
                <InfoRow icon="school-outline"    label="Acknowledged By" value={item.acknowledgedBy} iconBg={PRIMARY} />
              ) : null}
              {item.acknowledgedAt ? (
                <InfoRow icon="calendar-outline"  label="Acknowledged On" value={formatDisplayDate(item.acknowledgedAt)} />
              ) : null}
              {item.teacherReply ? (
                <View style={styles.replyBlock}>
                  <Ionicons name="chatbubble-ellipses-outline" size={16} color={PRIMARY} style={{ marginRight: 8, marginTop: 2 }} />
                  <Text style={styles.replyText}>{item.teacherReply}</Text>
                </View>
              ) : null}
            </View>
          </>
        ) : (
          // Prompt teacher to acknowledge if still pending
          status === 'pending' ? (
            <>
              <Section title="Teacher Response" />
              <TouchableOpacity
                style={styles.acknowledgePrompt}
                activeOpacity={0.85}
                onPress={() => navigation.navigate('ParentNoteForm', { mode: 'acknowledge', item })}
              >
                <Ionicons name="checkmark-circle-outline" size={20} color={PRIMARY} style={{ marginRight: 10 }} />
                <Text style={styles.acknowledgePromptText}>Tap to acknowledge this note</Text>
                <Ionicons name="chevron-forward" size={16} color={PRIMARY} />
              </TouchableOpacity>
            </>
          ) : null
        )}

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

      {/* FAB — acknowledge shortcut */}
      <TouchableOpacity
        style={KStyles.fab}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('ParentNoteForm', { mode: 'acknowledge', item })}
      >
        <Ionicons name="chatbubble-ellipses" size={24} color="#fff" />
      </TouchableOpacity>

      <ConfirmDialog
        visible={deleteVisible}
        title="Delete Note"
        message="Are you sure you want to delete this parent note? This cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={() => { setDeleteVisible(false); handleDelete(); }}
        onCancel={() => setDeleteVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  heroAvatar: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#FCE4EC',
    justifyContent: 'center', alignItems: 'center', marginBottom: 12,
  },
  heroNameLink: { color: Colors.primary, textDecorationLine: 'underline' },
  badgeRow:  { flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap', justifyContent: 'center' },
  badge:     { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 13, fontWeight: '700', letterSpacing: 0.4 },
  textCard:  { padding: 14 },
  contentText:  { fontSize: 14, color: '#333', lineHeight: 22 },
  replyBlock:   { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 14, paddingVertical: 12 },
  replyText:    { fontSize: 14, color: PRIMARY, lineHeight: 20, flex: 1 },
  acknowledgePrompt: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface, borderRadius: 12,
    borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 14, paddingVertical: 14, marginBottom: 4,
  },
  acknowledgePromptText: { flex: 1, fontSize: 14, color: PRIMARY, fontWeight: '600' },
});
