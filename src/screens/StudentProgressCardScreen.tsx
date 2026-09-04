import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '../navigation/HomeStack';
import { Colors, KStyles } from '../styles/kutties-styles';
import { SHEETS } from '../utils/constants';
import { formatDisplayDate } from '../utils/dateUtils';
import { studentMarkSheetRepository, teacherRepository } from '../db/repositories';
import type { StudentMarkSheetModel } from '../db/models/studentmarksheet.model';
import { syncSheet } from '../sync/sync.service';

const PRIMARY   = Colors.primary;
const ACCENT_BG = '#F3E5F5';

type Props = NativeStackScreenProps<HomeStackParamList, 'StudentProgressCard'>;

// ── Grade colour map ──────────────────────────────────────────────────────────
const GRADE_COLORS: Record<string, { bg: string; text: string }> = {
  'A+': { bg: '#E8F5E9', text: '#1B5E20' },
  'A':  { bg: '#F1F8E9', text: '#2E7D32' },
  'B':  { bg: '#E3F2FD', text: '#1565C0' },
  'C':  { bg: '#FFF8E1', text: '#F57F17' },
  'D':  { bg: '#FFF3E0', text: '#E65100' },
  'F':  { bg: '#FFEBEE', text: '#C62828' },
};

// ── Per-exam summary ──────────────────────────────────────────────────────────
interface ExamSummary {
  examName:  string;
  examDate?: string;
  rows:      StudentMarkSheetModel[];
  totalObtained: number;
  totalMax:      number;
  percentage:    number;
  overallGrade:  string;
}

function deriveGrade(pct: number): string {
  if (pct >= 90) return 'A+';
  if (pct >= 75) return 'A';
  if (pct >= 60) return 'B';
  if (pct >= 45) return 'C';
  if (pct >= 35) return 'D';
  return 'F';
}

function buildExamSummaries(marks: StudentMarkSheetModel[]): ExamSummary[] {
  const byExam = new Map<string, StudentMarkSheetModel[]>();
  for (const m of marks) {
    const key = m.examName ?? 'No Exam';
    if (!byExam.has(key)) byExam.set(key, []);
    byExam.get(key)!.push(m);
  }

  return [...byExam.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([examName, rows]) => {
      const scored = rows.filter((r) => r.maxMarks != null && r.marksObtained != null);
      const totalObtained = scored.reduce((s, r) => s + (r.marksObtained ?? 0), 0);
      const totalMax      = scored.reduce((s, r) => s + (r.maxMarks      ?? 0), 0);
      const percentage    = totalMax > 0 ? Math.round((totalObtained / totalMax) * 100) : 0;
      const overallGrade  = totalMax > 0 ? deriveGrade(percentage) : '—';
      const examDate      = rows.find((r) => r.examDate)?.examDate;
      return {
        examName, examDate,
        rows: rows.sort((a, b) => (a.subject ?? '').localeCompare(b.subject ?? '')),
        totalObtained, totalMax, percentage, overallGrade,
      };
    });
}

// ── Small components ──────────────────────────────────────────────────────────
function GradeBadge({ grade }: { grade: string }) {
  const style = GRADE_COLORS[grade] ?? { bg: '#F5F5F5', text: '#757575' };
  return (
    <View style={[styles.gradeBadge, { backgroundColor: style.bg }]}>
      <Text style={[styles.gradeText, { color: style.text }]}>{grade}</Text>
    </View>
  );
}

function ProgressBar({ pct }: { pct: number }) {
  const color = pct >= 75 ? '#2E7D32' : pct >= 45 ? '#F57F17' : '#C62828';
  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width: `${Math.min(pct, 100)}%` as any, backgroundColor: color }]} />
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────
export default function StudentProgressCardScreen({ navigation, route }: Props) {
  const { regNumber, studentName } = route.params;
  const [marks,    setMarks]   = useState<StudentMarkSheetModel[]>([]);
  const [loading,  setLoading] = useState(true);
  const [syncing,  setSyncing] = useState(false);
  const [activeExam, setActiveExam] = useState<string | null>(null);
  const [emailToTeacherName, setEmailToTeacherName] = useState<Record<string, string>>({});

  React.useEffect(() => {
    teacherRepository.findAll().then((teachers) => {
      const map: Record<string, string> = {};
      for (const t of teachers) {
        if (t.email) map[t.email.trim().toLowerCase()] = t.name ?? t.email;
      }
      setEmailToTeacherName(map);
    });
  }, []);

  const loadData = useCallback(async () => {
    const data = await studentMarkSheetRepository.findByStudent(regNumber);
    setMarks(data);
    setLoading(false);
  }, [regNumber]);

  const handleSync = useCallback(async () => {
    setSyncing(true);
    try {
      await syncSheet(SHEETS.STUDENT_MARK_SHEET);
      await loadData();
    } finally {
      setSyncing(false);
    }
  }, [loadData]);

  useFocusEffect(useCallback(() => {
    setLoading(true);
    handleSync();
  }, [handleSync]));

  const summaries = useMemo(() => buildExamSummaries(marks), [marks]);

  // Overall across all exams
  const overall = useMemo(() => {
    const totalObt = summaries.reduce((s, e) => s + e.totalObtained, 0);
    const totalMax = summaries.reduce((s, e) => s + e.totalMax, 0);
    const pct      = totalMax > 0 ? Math.round((totalObt / totalMax) * 100) : 0;
    return { totalObt, totalMax, pct, grade: totalMax > 0 ? deriveGrade(pct) : '—' };
  }, [summaries]);

  const headerTitle = studentName ? `${studentName}'s Progress` : 'Progress Card';

  return (
    <SafeAreaView style={KStyles.detailsRoot}>
      {/* Header */}
      <View style={KStyles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={KStyles.headerTitle} numberOfLines={1}>{headerTitle}</Text>
        <TouchableOpacity onPress={handleSync} style={KStyles.headerIcon}>
          {syncing
            ? <ActivityIndicator size="small" color="#fff" />
            : <Ionicons name="refresh" size={22} color="#fff" />}
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={KStyles.center}>
          <ActivityIndicator size="large" color={PRIMARY} />
        </View>
      ) : marks.length === 0 ? (
        <View style={[KStyles.center, { gap: 12, paddingTop: 80 }]}>
          <Ionicons name="document-text-outline" size={56} color="#ccc" />
          <Text style={KStyles.emptyText}>No marks recorded for this student</Text>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => navigation.navigate('StudentMarkSheetForm', {
              mode: 'add', prefilledRegNumber: regNumber,
            })}
            activeOpacity={0.85}
          >
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={styles.addBtnText}>Add First Entry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={KStyles.detailsScroll}>

          {/* ── Overall summary card ─────────────────────────────────────── */}
          <View style={styles.overallCard}>
            <View style={styles.overallRow}>
              <View>
                <Text style={styles.overallLabel}>Overall Performance</Text>
                <Text style={styles.overallSub}>{summaries.length} exam{summaries.length !== 1 ? 's' : ''}</Text>
              </View>
              <GradeBadge grade={overall.grade} />
            </View>
            <ProgressBar pct={overall.pct} />
            <View style={styles.overallStats}>
              <View style={styles.statCell}>
                <Text style={styles.statValue}>{overall.totalObt}</Text>
                <Text style={styles.statLabel}>Obtained</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statCell}>
                <Text style={styles.statValue}>{overall.totalMax}</Text>
                <Text style={styles.statLabel}>Total Max</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statCell}>
                <Text style={[styles.statValue, { color: PRIMARY }]}>{overall.pct}%</Text>
                <Text style={styles.statLabel}>Percentage</Text>
              </View>
            </View>
          </View>

          {/* ── Per-exam cards ────────────────────────────────────────────── */}
          {summaries.map((exam) => {
            const expanded = activeExam === exam.examName || summaries.length === 1;
            const gs = GRADE_COLORS[exam.overallGrade] ?? { bg: '#F5F5F5', text: '#757575' };

            return (
              <View key={exam.examName} style={styles.examCard}>
                {/* Exam header — tap to expand/collapse */}
                <TouchableOpacity
                  style={styles.examCardHeader}
                  onPress={() => setActiveExam(expanded && summaries.length > 1 ? null : exam.examName)}
                  activeOpacity={0.8}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.examName}>{exam.examName}</Text>
                    {exam.examDate ? (
                      <Text style={styles.examDate}>{formatDisplayDate(exam.examDate)}</Text>
                    ) : null}
                  </View>

                  <View style={styles.examHeaderRight}>
                    <Text style={styles.examPct}>{exam.percentage}%</Text>
                    <GradeBadge grade={exam.overallGrade} />
                    {summaries.length > 1 ? (
                      <Ionicons
                        name={expanded ? 'chevron-down' : 'chevron-forward'}
                        size={16} color={Colors.muted} style={{ marginLeft: 6 }}
                      />
                    ) : null}
                  </View>
                </TouchableOpacity>

                {/* Progress bar under header */}
                <View style={{ paddingHorizontal: 14, paddingBottom: 8 }}>
                  <ProgressBar pct={exam.percentage} />
                  <Text style={styles.examTotals}>
                    {exam.totalObtained}/{exam.totalMax} marks
                  </Text>
                </View>

                {/* Subject rows — shown when expanded */}
                {expanded && (
                  <View style={styles.subjectTable}>
                    {/* Table header */}
                    <View style={[styles.subjectRow, styles.subjectHeader]}>
                      <Text style={[styles.subjectCell, styles.subjectColWide, styles.subjectHeaderText]}>Subject</Text>
                      <Text style={[styles.subjectCell, styles.subjectColNarrow, styles.subjectHeaderText]}>Max</Text>
                      <Text style={[styles.subjectCell, styles.subjectColNarrow, styles.subjectHeaderText]}>Score</Text>
                      <Text style={[styles.subjectCell, styles.subjectColNarrow, styles.subjectHeaderText]}>Grade</Text>
                    </View>

                    {exam.rows.map((r) => {
                      const rgs = r.grade ? GRADE_COLORS[r.grade] : null;
                      const isPassing = !r.grade || r.grade !== 'F';
                      return (
                        <TouchableOpacity
                          key={r.id}
                          style={styles.subjectRow}
                          onPress={() => navigation.navigate('StudentMarkSheetDetails', { item: r })}
                          activeOpacity={0.75}
                        >
                          <View style={[styles.subjectCell, styles.subjectColWide]}>
                            <Text style={styles.subjectName} numberOfLines={1}>{r.subject ?? '—'}</Text>
                            {r.subjTeacher ? (
                              <Text style={styles.subjectTeacher} numberOfLines={1}>
                                {emailToTeacherName[r.subjTeacher.trim().toLowerCase()] ?? r.subjTeacher}
                              </Text>
                            ) : null}
                          </View>
                          <Text style={[styles.subjectCell, styles.subjectColNarrow, styles.subjectValue]}>
                            {r.maxMarks ?? '—'}
                          </Text>
                          <Text style={[
                            styles.subjectCell, styles.subjectColNarrow, styles.subjectValue,
                            !isPassing && styles.failScore,
                          ]}>
                            {r.marksObtained ?? '—'}
                          </Text>
                          <View style={[styles.subjectCell, styles.subjectColNarrow, { alignItems: 'center' }]}>
                            {r.grade ? (
                              <View style={[styles.miniGradeBadge, rgs ? { backgroundColor: rgs.bg } : {}]}>
                                <Text style={[styles.miniGradeText, rgs ? { color: rgs.text } : {}]}>
                                  {r.grade}
                                </Text>
                              </View>
                            ) : (
                              <Text style={styles.subjectValue}>—</Text>
                            )}
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>
            );
          })}

          <View style={{ height: 32 }} />
        </ScrollView>
      )}

      {/* FAB — add mark entry */}
      <TouchableOpacity
        style={KStyles.fab}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('StudentMarkSheetForm', {
          mode: 'add', prefilledRegNumber: regNumber,
        })}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // ── Overall card ──
  overallCard: {
    backgroundColor: Colors.surface,
    margin: 12,
    borderRadius: 12,
    padding: 16,
    elevation: 3,
    boxShadow: '0px 2px 6px rgba(0,0,0,0.1)',
  },
  overallRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  overallLabel: { fontSize: 15, fontWeight: '700', color: '#222' },
  overallSub:   { fontSize: 12, color: Colors.muted, marginTop: 2 },
  overallStats: { flexDirection: 'row', marginTop: 12 },
  statCell:     { flex: 1, alignItems: 'center' },
  statDivider:  { width: 1, backgroundColor: Colors.border, marginVertical: 4 },
  statValue:    { fontSize: 20, fontWeight: '800', color: '#333' },
  statLabel:    { fontSize: 11, color: Colors.muted, marginTop: 2 },

  // ── Progress bar ──
  progressTrack: { height: 6, backgroundColor: '#E0E0E0', borderRadius: 3, overflow: 'hidden', marginVertical: 4 },
  progressFill:  { height: '100%', borderRadius: 3 },

  // ── Exam card ──
  examCard: {
    backgroundColor: Colors.surface,
    marginHorizontal: 12,
    marginBottom: 10,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    boxShadow: '0px 1px 4px rgba(0,0,0,0.08)',
  },
  examCardHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingTop: 12, paddingBottom: 6,
  },
  examHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  examName:  { fontSize: 14, fontWeight: '700', color: '#222' },
  examDate:  { fontSize: 11, color: Colors.muted, marginTop: 1 },
  examPct:   { fontSize: 14, fontWeight: '700', color: PRIMARY },
  examTotals:{ fontSize: 11, color: Colors.muted, marginTop: 2, textAlign: 'right' },

  // ── Grade badge ──
  gradeBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10 },
  gradeText:  { fontSize: 13, fontWeight: '800', letterSpacing: 0.3 },

  // ── Subject table ──
  subjectTable: { borderTopWidth: 1, borderTopColor: Colors.border },
  subjectRow:   { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  subjectHeader:{ backgroundColor: '#FAFAFA' },
  subjectHeaderText: { fontSize: 11, fontWeight: '700', color: Colors.muted, textTransform: 'uppercase', letterSpacing: 0.4 },
  subjectCell:  { justifyContent: 'center' },
  subjectColWide:   { flex: 3, paddingRight: 6 },
  subjectColNarrow: { flex: 1, alignItems: 'center' as any },
  subjectName:    { fontSize: 13, fontWeight: '600', color: '#333' },
  subjectTeacher: { fontSize: 10, color: Colors.muted, marginTop: 1 },
  subjectValue:   { fontSize: 13, color: '#444', textAlign: 'center' },
  failScore:      { color: '#C62828', fontWeight: '700' },
  miniGradeBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, backgroundColor: '#F5F5F5' },
  miniGradeText:  { fontSize: 11, fontWeight: '700' },

  // ── Empty state ──
  addBtn:     { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: PRIMARY, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, marginTop: 8 },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
