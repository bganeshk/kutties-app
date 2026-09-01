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
import { studentDiaryRepository, studentRepository } from '../db/repositories';
import type { StudentDiaryModel } from '../db/models/studentdiary.model';
import type { StudentModel } from '../db/models/student.model';
import { syncSheet } from '../sync/sync.service';
import ConfirmDialog from '../components/shared/ConfirmDialog';
import InfoRow from '../components/shared/InfoRow';

const PRIMARY = Colors.primary;

type Props = NativeStackScreenProps<HomeStackParamList, 'StudentDiaryDetails'>;

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  'Homework':    { bg: '#E3F2FD', text: '#1565C0' },
  'Behaviour':   { bg: '#FFF3E0', text: '#E65100' },
  'Achievement': { bg: '#F1F8E9', text: '#2E7D32' },
  'Note':        { bg: '#FCE4EC', text: PRIMARY },
  'Warning':     { bg: '#FFEBEE', text: '#C62828' },
};

function Section({ title }: { title: string }) {
  return <Text style={KStyles.detailsSection}>{title}</Text>;
}

export default function StudentDiaryDetailsScreen({ navigation, route }: Props) {
  const [item, setItem] = useState<StudentDiaryModel>(route.params.item);
  const [deleteVisible, setDeleteVisible] = useState(false);
  const [studentRecord, setStudentRecord] = useState<StudentModel | undefined>(undefined);

  useFocusEffect(
    useCallback(() => {
      studentDiaryRepository.findById(route.params.item.id).then((fresh) => {
        if (fresh) setItem(fresh);
      });
    }, [route.params.item.id]),
  );

  // Resolve student record from regNumber
  React.useEffect(() => {
    if (!item.regNumber) return;
    studentRepository.findAll().then((students) => {
      const match = students.find((s) => s.regNumber === item.regNumber);
      setStudentRecord(match ?? undefined);
    });
  }, [item.regNumber]);

  const studentName = studentRecord?.fullName ?? studentRecord?.regNumber;
  const catStyle = (item.category ? CATEGORY_COLORS[item.category] : null) ?? null;

  const handleDelete = useCallback(() => {
    studentDiaryRepository.delete(item.id).then(() => {
      syncSheet(SHEETS.STUDENT_DIARY).catch(() => {});
      navigation.goBack();
    });
  }, [item.id, navigation]);

  return (
    <SafeAreaView style={KStyles.detailsRoot}>
      {/* Header */}
      <View style={KStyles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={KStyles.headerTitle} numberOfLines={1}>Diary Entry</Text>
        <View style={KStyles.headerActions}>
          <TouchableOpacity
            style={KStyles.headerIcon}
            onPress={() => navigation.navigate('StudentDiaryForm', { mode: 'edit', item })}
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
            <Ionicons name="book" size={36} color={PRIMARY} />
          </View>
          <TouchableOpacity
            disabled={!studentRecord}
            onPress={studentRecord ? () => navigation.navigate('StudentDetails', { item: studentRecord }) : undefined}
            activeOpacity={0.7}
          >
            <Text style={[KStyles.detailsHeroName, studentRecord && styles.heroNameLink]}>
              {studentName ?? item.regNumber ?? '—'}
            </Text>
          </TouchableOpacity>
          {studentName && item.regNumber ? (
            <Text style={KStyles.detailsHeroDesignation}>{item.regNumber}</Text>
          ) : null}
          {item.diaryDate ? (
            <Text style={KStyles.detailsHeroDesignation}>{formatDisplayDate(item.diaryDate)}</Text>
          ) : null}
          {catStyle && item.category ? (
            <View style={[styles.categoryBadge, { backgroundColor: catStyle.bg }]}>
              <Text style={[styles.categoryText, { color: catStyle.text }]}>
                {item.category}
              </Text>
            </View>
          ) : null}
        </View>

        {/* ── Entry ──────────────────────────────────────────────────────── */}
        <Section title="Entry" />
        <View style={KStyles.detailsCard}>
          <InfoRow
            icon="person-outline"
            label="Student"
            value={studentName ?? item.regNumber}
            iconBg={PRIMARY}
            onPress={studentRecord ? () => navigation.navigate('StudentDetails', { item: studentRecord }) : undefined}
          />
          <InfoRow icon="calendar-outline"  label="Date"       value={formatDisplayDate(item.diaryDate)} iconBg={PRIMARY} />
          <InfoRow icon="pricetag-outline"  label="Category"   value={item.category} />
          <InfoRow icon="text-outline"      label="Subject"    value={item.subject} />
          <InfoRow icon="person-circle-outline" label="Created By" value={item.createdBy} />
        </View>

        {/* ── Response ───────────────────────────────────────────────────── */}
        {item.response ? (
          <>
            <Section title="Response" />
            <View style={KStyles.detailsCard}>
              <Text style={styles.contentText}>{item.response}</Text>
            </View>
          </>
        ) : null}

        {/* ── Teacher Note ───────────────────────────────────────────────── */}
        {item.teacherNote ? (
          <>
            <Section title="Teacher Note" />
            <View style={KStyles.detailsCard}>
              <View style={styles.teacherNoteBlock}>
                <Ionicons name="chatbubble-ellipses-outline" size={16} color={PRIMARY} style={{ marginRight: 8, marginTop: 1 }} />
                <Text style={styles.teacherNoteText}>{item.teacherNote}</Text>
              </View>
            </View>
          </>
        ) : null}

        {/* ── Remarks ────────────────────────────────────────────────────── */}
        {item.remarks ? (
          <>
            <Section title="Remarks" />
            <View style={KStyles.detailsCard}>
              <InfoRow icon="chatbubble-outline" label="Remarks" value={item.remarks} />
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

      <TouchableOpacity
        style={KStyles.fab}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('StudentDiaryForm', { mode: 'edit', item })}
      >
        <Ionicons name="create" size={26} color="#fff" />
      </TouchableOpacity>

      <ConfirmDialog
        visible={deleteVisible}
        title="Delete Diary Entry"
        message="Are you sure you want to delete this diary entry? This cannot be undone."
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
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FCE4EC',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  heroNameLink: { color: Colors.primary, textDecorationLine: 'underline' },
  categoryBadge: {
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 5,
    borderRadius: 14,
  },
  categoryText: { fontSize: 14, fontWeight: '700', letterSpacing: 0.5 },
  contentText:  { fontSize: 14, color: '#333', lineHeight: 22 },
  teacherNoteBlock: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 4 },
  teacherNoteText:  { fontSize: 14, color: PRIMARY, lineHeight: 20, flex: 1 },
});
