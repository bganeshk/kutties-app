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
import { studentMarkSheetRepository, studentRepository, teacherRepository } from '../db/repositories';
import type { StudentMarkSheetModel } from '../db/models/studentmarksheet.model';
import type { StudentModel } from '../db/models/student.model';
import { syncSheet } from '../sync/sync.service';
import ConfirmDialog from '../components/shared/ConfirmDialog';
import InfoRow from '../components/shared/InfoRow';

const PRIMARY = Colors.primary;

type Props = NativeStackScreenProps<HomeStackParamList, 'StudentMarkSheetDetails'>;

const GRADE_COLORS: Record<string, { bg: string; text: string }> = {
  'A+': { bg: '#E8F5E9', text: '#1B5E20' },
  'A':  { bg: '#F1F8E9', text: '#2E7D32' },
  'B':  { bg: '#E3F2FD', text: '#1565C0' },
  'C':  { bg: '#FFF8E1', text: '#F57F17' },
  'D':  { bg: '#FFF3E0', text: '#E65100' },
  'F':  { bg: '#FFEBEE', text: '#C62828' },
};

function Section({ title }: { title: string }) {
  return <Text style={KStyles.detailsSection}>{title}</Text>;
}

export default function StudentMarkSheetDetailsScreen({ navigation, route }: Props) {
  const [item,              setItem]              = useState<StudentMarkSheetModel>(route.params.item);
  const [deleteVisible,     setDeleteVisible]     = useState(false);
  const [student,           setStudent]           = useState<StudentModel | undefined>(undefined);
  const [emailToTeacherName, setEmailToTeacherName] = useState<Record<string, string>>({});

  useFocusEffect(
    useCallback(() => {
      studentMarkSheetRepository.findById(route.params.item.id).then((fresh) => {
        if (fresh) setItem(fresh);
      });
    }, [route.params.item.id]),
  );

  React.useEffect(() => {
    if (!item.regNumber) return;
    studentRepository.findAll().then((students) => {
      const match = students.find(
        (s) => s.regNumber?.toLowerCase() === item.regNumber?.toLowerCase(),
      );
      setStudent(match ?? undefined);
    });
  }, [item.regNumber]);

  React.useEffect(() => {
    teacherRepository.findAll().then((teachers) => {
      const map: Record<string, string> = {};
      for (const t of teachers) {
        if (t.email) map[t.email.trim().toLowerCase()] = t.name ?? t.email;
      }
      setEmailToTeacherName(map);
    });
  }, []);

  const studentName = student?.fullName ?? student?.regNumber;
  const gradeStyle  = (item.grade ? GRADE_COLORS[item.grade] : null) ?? null;
  const pct = item.maxMarks && item.maxMarks > 0 && item.marksObtained != null
    ? Math.round((item.marksObtained / item.maxMarks) * 100)
    : null;

  const handleDelete = useCallback(() => {
    studentMarkSheetRepository.delete(item.id).then(() => {
      syncSheet(SHEETS.STUDENT_MARK_SHEET).catch(() => {});
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
        <Text style={KStyles.headerTitle} numberOfLines={1}>Mark Entry</Text>
        <View style={KStyles.headerActions}>
          <TouchableOpacity
            style={KStyles.headerIcon}
            onPress={() => navigation.navigate('StudentMarkSheetForm', { mode: 'edit', item })}
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

        {/* ── Hero card ──────────────────────────────────────────────────────── */}
        <View style={KStyles.detailsHeroCard}>
          <View style={styles.heroAvatar}>
            <Ionicons name="document-text" size={36} color={PRIMARY} />
          </View>

          {/* Subject */}
          <Text style={KStyles.detailsHeroName}>{item.subject ?? '—'}</Text>

          {/* Student name — tappable */}
          <TouchableOpacity
            disabled={!student}
            onPress={student ? () => navigation.navigate('StudentDetails', { item: student }) : undefined}
            activeOpacity={0.7}
          >
            <Text style={[KStyles.detailsHeroDesignation, student && styles.studentLink]}>
              {studentName ?? item.regNumber ?? '—'}
            </Text>
          </TouchableOpacity>

          {/* Exam name */}
          {item.examName ? (
            <Text style={KStyles.detailsHeroDesignation}>{item.examName}</Text>
          ) : null}

          {/* Grade badge */}
          {gradeStyle && item.grade ? (
            <View style={[styles.gradeBadge, { backgroundColor: gradeStyle.bg }]}>
              <Text style={[styles.gradeText, { color: gradeStyle.text }]}>{item.grade}</Text>
            </View>
          ) : null}

          {/* Marks pill */}
          {item.marksObtained != null && item.maxMarks != null ? (
            <View style={styles.marksPill}>
              <Text style={styles.marksValue}>
                {item.marksObtained}/{item.maxMarks}
              </Text>
              {pct != null ? (
                <Text style={styles.marksPct}> ({pct}%)</Text>
              ) : null}
            </View>
          ) : null}
        </View>

        {/* ── Exam details ──────────────────────────────────────────────────── */}
        <Section title="Exam" />
        <View style={KStyles.detailsCard}>
          <InfoRow icon="clipboard-outline"   label="Exam Type"   value={item.examName}                    iconBg={PRIMARY} />
          <InfoRow icon="calendar-outline"    label="Exam Date"   value={formatDisplayDate(item.examDate)} iconBg={PRIMARY} />
          <InfoRow icon="book-outline"        label="Subject"     value={item.subject}                     iconBg={PRIMARY} />
          <InfoRow
            icon="person-outline"
            label="Subj. Teacher"
            value={item.subjTeacher
              ? (emailToTeacherName[item.subjTeacher.trim().toLowerCase()] ?? item.subjTeacher)
              : undefined}
          />
        </View>

        {/* ── Marks ─────────────────────────────────────────────────────────── */}
        <Section title="Marks" />
        <View style={KStyles.detailsCard}>
          <InfoRow icon="trending-up-outline" label="Max Marks"       value={item.maxMarks != null ? String(item.maxMarks) : undefined} />
          <InfoRow icon="checkmark-circle-outline" label="Marks Obtained" value={item.marksObtained != null ? String(item.marksObtained) : undefined} iconBg={PRIMARY} />
          <InfoRow icon="ribbon-outline"      label="Grade"          value={item.grade} />
          {pct != null ? (
            <InfoRow icon="analytics-outline" label="Percentage" value={`${pct}%`} iconBg={PRIMARY} />
          ) : null}
        </View>

        {/* ── Student ───────────────────────────────────────────────────────── */}
        <Section title="Student" />
        <View style={KStyles.detailsCard}>
          <InfoRow
            icon="person-circle-outline"
            label="Student"
            value={studentName ?? item.regNumber}
            iconBg={PRIMARY}
            onPress={student ? () => navigation.navigate('StudentDetails', { item: student }) : undefined}
          />
          <InfoRow
            icon="person-add-outline"
            label="Recorded By"
            value={item.recordedBy
              ? (emailToTeacherName[item.recordedBy.trim().toLowerCase()] ?? item.recordedBy)
              : undefined}
          />
        </View>

        {/* ── Remarks ───────────────────────────────────────────────────────── */}
        {item.remarks ? (
          <>
            <Section title="Remarks" />
            <View style={KStyles.detailsCard}>
              <InfoRow icon="chatbubble-outline" label="Remarks" value={item.remarks} />
            </View>
          </>
        ) : null}

        {/* ── Audit ─────────────────────────────────────────────────────────── */}
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
        onPress={() => navigation.navigate('StudentMarkSheetForm', { mode: 'edit', item })}
      >
        <Ionicons name="create" size={26} color="#fff" />
      </TouchableOpacity>

      <ConfirmDialog
        visible={deleteVisible}
        title="Delete Mark Entry"
        message="Are you sure you want to delete this mark entry? This cannot be undone."
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
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 12,
  },
  studentLink: { color: PRIMARY, textDecorationLine: 'underline' },
  gradeBadge: {
    marginTop: 8, paddingHorizontal: 18, paddingVertical: 5, borderRadius: 14,
  },
  gradeText: { fontSize: 16, fontWeight: '800', letterSpacing: 0.5 },
  marksPill: {
    flexDirection: 'row', alignItems: 'baseline',
    marginTop: 8, backgroundColor: '#F3E5F5',
    paddingHorizontal: 16, paddingVertical: 4, borderRadius: 12,
  },
  marksValue: { fontSize: 18, fontWeight: '800', color: PRIMARY },
  marksPct:   { fontSize: 13, fontWeight: '600', color: Colors.muted },
});
