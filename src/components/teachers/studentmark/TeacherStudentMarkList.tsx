import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  TextInput, SafeAreaView, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '../../../navigation/HomeStack';
import { Colors, KStyles } from '../../../styles/kutties-styles';
import { useTeacherStudentMarks, type TeacherMarkRow } from './useTeacherStudentMarks';
import { GRADE_SCORE } from '../../../db/models/studentmarksheet.model';
import { teacherRepository } from '../../../db/repositories';

const PRIMARY = Colors.primary;

type Props = NativeStackScreenProps<HomeStackParamList, 'TeacherStudentMarkList'>;

// ── Helpers ───────────────────────────────────────────────────────────────────

// Grade-score sorted descending: [['A+',7],['A',6], ...]
const GRADE_ENTRIES = Object.entries(GRADE_SCORE).sort(([, a], [, b]) => b - a);

/** Convert an average numeric grade-score to the nearest grade label. */
function avgGradeLabel(rows: TeacherMarkRow[]): string | null {
  const scores = rows
    .map((r) => GRADE_SCORE[r.mark.grade ?? ''])
    .filter((v): v is number => v != null);
  if (scores.length === 0) return null;
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  // Pick the grade whose score is closest to avg
  let best = GRADE_ENTRIES[0];
  let bestDiff = Math.abs(best[1] - avg);
  for (const entry of GRADE_ENTRIES) {
    const diff = Math.abs(entry[1] - avg);
    if (diff < bestDiff) { bestDiff = diff; best = entry; }
  }
  return best[0];
}

function matchesSearch(row: TeacherMarkRow, q: string): boolean {
  if (!q) return true;
  const ql = q.toLowerCase();
  return (
    row.studentName.toLowerCase().includes(ql) ||
    (row.mark.regNumber   ?? '').toLowerCase().includes(ql) ||
    (row.mark.subject     ?? '').toLowerCase().includes(ql) ||
    (row.mark.examName    ?? '').toLowerCase().includes(ql) ||
    (row.mark.grade       ?? '').toLowerCase().includes(ql) ||
    (row.mark.subjTeacher ?? '').toLowerCase().includes(ql)
  );
}

// ── Mark row (level 3) ────────────────────────────────────────────────────────

function MarkRowByStudent({ row }: { row: TeacherMarkRow }) {
  const { mark } = row;
  return (
    <View style={styles.markRow}>
      <Text style={[styles.markCell, { flex: 2 }]} numberOfLines={1}>
        {mark.subject ?? '—'}
      </Text>
      <Text style={styles.markCell}>
        {mark.marksObtained ?? '—'}/{mark.maxMarks ?? '—'}
      </Text>
      <Text style={[styles.markCell, styles.gradeBadge]}>{mark.grade ?? '—'}</Text>
      <Text style={[styles.markCell, { flex: 2 }]} numberOfLines={1}>
        {mark.examName ?? '—'}
      </Text>
    </View>
  );
}

function MarkRowBySubject({ row }: { row: TeacherMarkRow }) {
  const { mark } = row;
  return (
    <View style={styles.markRow}>
      <Text style={[styles.markCell, { flex: 2 }]} numberOfLines={1}>
        {mark.examName ?? '—'}
      </Text>
      <Text style={styles.markCell}>
        {mark.marksObtained ?? '—'}/{mark.maxMarks ?? '—'}
      </Text>
      <Text style={[styles.markCell, styles.gradeBadge]}>{mark.grade ?? '—'}</Text>
    </View>
  );
}

// ── Student sub-header (level 2) ──────────────────────────────────────────────

function StudentHeader({
  studentName,
  regNumber,
  courseDivision,
  count,
  expanded,
  onPress,
  onNavigate,
  showCourse,
  avgGrade,
}: {
  studentName: string;
  regNumber: string;
  courseDivision: string;
  count: number;
  expanded: boolean;
  onPress: () => void;
  onNavigate?: () => void;
  showCourse: boolean;
  avgGrade?: string;
}) {
  return (
    <View style={styles.studentHeader}>
      <TouchableOpacity onPress={onPress} activeOpacity={0.75} style={styles.studentChevronArea}>
        <Ionicons
          name={expanded ? 'chevron-down' : 'chevron-forward'}
          size={14}
          color="#555"
        />
      </TouchableOpacity>
      <TouchableOpacity
        style={{ flex: 1 }}
        onPress={onNavigate ?? onPress}
        activeOpacity={0.75}
      >
        <Text style={styles.studentHeaderName} numberOfLines={1}>
          {studentName} <Text style={styles.studentHeaderReg}>({regNumber})</Text>
        </Text>
        {showCourse && courseDivision ? (
          <Text style={styles.studentHeaderCourse}>{courseDivision}</Text>
        ) : null}
      </TouchableOpacity>
      {avgGrade != null && (
        <View style={styles.avgGradeBadge}>
          <Text style={styles.avgGradeBadgeText}>{avgGrade}</Text>
        </View>
      )}
      {onNavigate != null && (
        <Ionicons name="chevron-forward-circle-outline" size={16} color={Colors.muted} style={{ marginHorizontal: 6 }} />
      )}
      <View style={styles.countBadge}>
        <Text style={styles.countBadgeText}>{count}</Text>
      </View>
    </View>
  );
}

// ── Teacher section header (level 1) ─────────────────────────────────────────

function TeacherHeader({
  teacher,
  count,
  expanded,
  onPress,
  avgRating,
}: {
  teacher: string;
  count: number;
  expanded: boolean;
  onPress: () => void;
  avgRating: number | null;
}) {
  return (
    <TouchableOpacity style={styles.teacherHeader} onPress={onPress} activeOpacity={0.75}>
      <Ionicons
        name={expanded ? 'chevron-down' : 'chevron-forward'}
        size={16}
        color={PRIMARY}
        style={{ marginRight: 8 }}
      />
      <Ionicons name="person-outline" size={14} color={PRIMARY} style={{ marginRight: 6 }} />
      <Text style={styles.teacherHeaderTitle} numberOfLines={1}>{teacher || 'Unknown'}</Text>
      {avgRating != null && (
        <Text style={styles.teacherAvgRating}>★ {avgRating.toFixed(1)}</Text>
      )}
      <View style={styles.teacherCountBadge}>
        <Text style={styles.teacherCountText}>{count}</Text>
      </View>
    </TouchableOpacity>
  );
}

// ── Table headers ─────────────────────────────────────────────────────────────

function TableHeaderByStudent() {
  return (
    <View style={styles.tableHeader}>
      <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Subject</Text>
      <Text style={styles.tableHeaderCell}>Marks</Text>
      <Text style={styles.tableHeaderCell}>Grade</Text>
      <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Exam Type</Text>
    </View>
  );
}

function TableHeaderBySubject() {
  return (
    <View style={styles.tableHeader}>
      <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Exam Type</Text>
      <Text style={styles.tableHeaderCell}>Marks</Text>
      <Text style={styles.tableHeaderCell}>Grade</Text>
    </View>
  );
}

// ── List item types ───────────────────────────────────────────────────────────

type ListItem =
  | { type: 'teacher';   key: string; teacher: string; teacherLabel: string; count: number; teacherKey: string; avgRating: number | null }
  | { type: 'student';   key: string; studentName: string; regNumber: string; courseDivision: string; count: number; studentKey: string; teacherKey: string; avgGrade?: string }
  | { type: 'tableHead'; key: string; mode: 'student' | 'subject' }
  | { type: 'markRow';   key: string; row: TeacherMarkRow; mode: 'student' | 'subject' };

// ── Main screen ───────────────────────────────────────────────────────────────

export default function TeacherStudentMarkList({ navigation, route }: Props) {
  const { headerTitle } = route.params;

  const {
    rows, loading,
    sync, syncing,
  } = useTeacherStudentMarks();

  const [mode, setMode]         = useState<'student' | 'subject'>('student');
  const [search, setSearch]     = useState('');
  const [expandedTeachers, setExpandedTeachers] = useState<Set<string>>(new Set());
  const [expandedStudents, setExpandedStudents] = useState<Set<string>>(new Set());
  // email → display name for resolving subjTeacher
  const [emailToTeacherName, setEmailToTeacherName] = useState<Record<string, string>>({});

  useEffect(() => {
    teacherRepository.findAll().then((teachers) => {
      const map: Record<string, string> = {};
      for (const t of teachers) {
        if (t.email) map[t.email.trim().toLowerCase()] = t.name ?? t.email;
      }
      setEmailToTeacherName(map);
    });
  }, []);

  const title = headerTitle ?? 'Student Marks';
  const searchActive = search.trim().length > 0;

  // ── Filter ────────────────────────────────────────────────────────────────
  const filteredRows = useMemo(
    () => rows.filter((r) => matchesSearch(r, search)),
    [rows, search],
  );

  // ── Toggle helpers ────────────────────────────────────────────────────────
  const toggleTeacher = useCallback((key: string) => {
    setExpandedTeachers((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }, []);

  const toggleStudent = useCallback((key: string) => {
    setExpandedStudents((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }, []);

  // ── Build flat list for "By Student" ─────────────────────────────────────
  // teacher (email) → student → marks
  const byStudentList = useMemo<ListItem[]>(() => {
    const teacherMap = new Map<string, Map<string, TeacherMarkRow[]>>();
    for (const row of filteredRows) {
      const teacher = row.mark.subjTeacher ?? 'Unknown';
      const reg     = row.mark.regNumber ?? '';
      if (!teacherMap.has(teacher)) teacherMap.set(teacher, new Map());
      const studMap = teacherMap.get(teacher)!;
      if (!studMap.has(reg)) studMap.set(reg, []);
      studMap.get(reg)!.push(row);
    }

    const items: ListItem[] = [];
    for (const [teacher, studMap] of Array.from(teacherMap.entries()).sort(([a], [b]) => a.localeCompare(b))) {
      const teacherKey  = `teacher::${teacher}`;
      const teacherLabel = emailToTeacherName[teacher.toLowerCase()] ?? teacher;
      const allTeacherRows = Array.from(studMap.values()).flat();
      const teacherCount  = allTeacherRows.length;
      const ratingVals    = allTeacherRows.map((r) => r.mark.norm_rating).filter((v): v is number => v != null);
      const avgRating     = ratingVals.length > 0 ? ratingVals.reduce((a, b) => a + b, 0) / ratingVals.length : null;
      items.push({ type: 'teacher', key: teacherKey, teacher, teacherLabel, count: teacherCount, teacherKey, avgRating });

      const isTeacherOpen = searchActive || expandedTeachers.has(teacherKey);
      if (!isTeacherOpen) continue;

      for (const [reg, markRows] of Array.from(studMap.entries()).sort(([a], [b]) => a.localeCompare(b))) {
        const studentKey    = `${teacherKey}::${reg}`;
        const studentName   = markRows[0]?.studentName ?? reg;
        const courseDivision = markRows[0]?.courseDivision ?? '';
        items.push({
          type: 'student', key: studentKey,
          studentName, regNumber: reg, courseDivision,
          count: markRows.length, studentKey, teacherKey,
        });

        const isStudentOpen = searchActive || expandedStudents.has(studentKey);
        if (!isStudentOpen) continue;

        items.push({ type: 'tableHead', key: `${studentKey}::header`, mode: 'student' });
        for (const row of markRows) {
          items.push({ type: 'markRow', key: `${studentKey}::${row.mark.id}`, row, mode: 'student' });
        }
      }
    }
    return items;
  }, [filteredRows, expandedTeachers, expandedStudents, searchActive, emailToTeacherName]);

  // ── Build flat list for "By Subject" ─────────────────────────────────────
  // teacher (email) → subject → course → student → marks
  const bySubjectList = useMemo<ListItem[]>(() => {
    // Group: teacher → subject → course → student
    const teacherMap = new Map<string, Map<string, Map<string, Map<string, TeacherMarkRow[]>>>>();
    for (const row of filteredRows) {
      const teacher = row.mark.subjTeacher ?? 'Unknown';
      const subject = row.mark.subject ?? 'Unknown';
      const course  = row.courseDivision || 'Unknown';
      const reg     = row.mark.regNumber ?? '';
      if (!teacherMap.has(teacher)) teacherMap.set(teacher, new Map());
      const subjMap = teacherMap.get(teacher)!;
      if (!subjMap.has(subject)) subjMap.set(subject, new Map());
      const courseMap = subjMap.get(subject)!;
      if (!courseMap.has(course)) courseMap.set(course, new Map());
      const studMap = courseMap.get(course)!;
      if (!studMap.has(reg)) studMap.set(reg, []);
      studMap.get(reg)!.push(row);
    }

    const items: ListItem[] = [];
    for (const [teacher, subjMap] of Array.from(teacherMap.entries()).sort(([a], [b]) => a.localeCompare(b))) {
      const teacherKey     = `teacher::${teacher}`;
      const teacherLabel   = emailToTeacherName[teacher.toLowerCase()] ?? teacher;
      const allTeacherRows = Array.from(subjMap.values()).flatMap((sm) =>
        Array.from(sm.values()).flatMap((cm) => Array.from(cm.values()).flat()),
      );
      const teacherCount   = allTeacherRows.length;
      const ratingVals     = allTeacherRows.map((r) => r.mark.norm_rating).filter((v): v is number => v != null);
      const avgRating      = ratingVals.length > 0 ? ratingVals.reduce((a, b) => a + b, 0) / ratingVals.length : null;
      items.push({ type: 'teacher', key: teacherKey, teacher, teacherLabel, count: teacherCount, teacherKey, avgRating });

      const isTeacherOpen = searchActive || expandedTeachers.has(teacherKey);
      if (!isTeacherOpen) continue;

      for (const [subject, courseMap] of Array.from(subjMap.entries()).sort(([a], [b]) => a.localeCompare(b))) {
        const subjectKey  = `${teacherKey}::subject::${subject}`;
        const allSubjectRows = Array.from(courseMap.values()).flatMap((cm) => Array.from(cm.values()).flat());
        const subjectCount = allSubjectRows.length;
        const subjectAvgGrade = avgGradeLabel(allSubjectRows) ?? undefined;
        items.push({
          type: 'student', key: subjectKey,
          studentName: subject, regNumber: '', courseDivision: '',
          count: subjectCount, studentKey: subjectKey, teacherKey,
          avgGrade: subjectAvgGrade,
        });

        const isSubjectOpen = searchActive || expandedStudents.has(subjectKey);
        if (!isSubjectOpen) continue;

        for (const [course, studMap] of Array.from(courseMap.entries()).sort(([a], [b]) => a.localeCompare(b))) {
          const courseKey  = `${subjectKey}::course::${course}`;
          const courseCount = Array.from(studMap.values()).reduce((s, a) => s + a.length, 0);
          items.push({
            type: 'student', key: courseKey,
            studentName: `  ${course}`, regNumber: '', courseDivision: '',
            count: courseCount, studentKey: courseKey, teacherKey,
          });

          const isCourseOpen = searchActive || expandedStudents.has(courseKey);
          if (!isCourseOpen) continue;

          for (const [reg, markRows] of Array.from(studMap.entries()).sort(([a], [b]) => a.localeCompare(b))) {
            const studentKey    = `${courseKey}::${reg}`;
            const studentName   = markRows[0]?.studentName ?? reg;
            const courseDivision = markRows[0]?.courseDivision ?? '';
            items.push({
              type: 'student', key: studentKey,
              studentName: `    ${studentName}`, regNumber: reg, courseDivision,
              count: markRows.length, studentKey, teacherKey,
            });

            const isStudentOpen = searchActive || expandedStudents.has(studentKey);
            if (!isStudentOpen) continue;

            items.push({ type: 'tableHead', key: `${studentKey}::header`, mode: 'subject' });
            for (const row of markRows) {
              items.push({ type: 'markRow', key: `${studentKey}::${row.mark.id}`, row, mode: 'subject' });
            }
          }
        }
      }
    }
    return items;
  }, [filteredRows, expandedTeachers, expandedStudents, searchActive, emailToTeacherName]);

  const listData = mode === 'student' ? byStudentList : bySubjectList;

  const renderItem = useCallback(({ item }: { item: ListItem }) => {
    if (item.type === 'teacher') {
      return (
        <TeacherHeader
          teacher={item.teacherLabel}
          count={item.count}
          expanded={searchActive || expandedTeachers.has(item.teacherKey)}
          onPress={() => toggleTeacher(item.teacherKey)}
          avgRating={item.avgRating}
        />
      );
    }
    if (item.type === 'student') {
      const isRealStudent = item.regNumber !== '';
      return (
        <StudentHeader
          studentName={item.studentName}
          regNumber={item.regNumber}
          courseDivision={item.courseDivision}
          count={item.count}
          expanded={searchActive || expandedStudents.has(item.studentKey)}
          onPress={() => toggleStudent(item.studentKey)}
          onNavigate={isRealStudent ? () => navigation.navigate('TeacherStudentMarkDetails', {
            teacherEmail: '',
            regNumber: item.regNumber,
            studentName: item.studentName.trim(),
          }) : undefined}
          showCourse={true}
          avgGrade={item.avgGrade}
        />
      );
    }
    if (item.type === 'tableHead') {
      return item.mode === 'student' ? <TableHeaderByStudent /> : <TableHeaderBySubject />;
    }
    if (item.type === 'markRow') {
      return item.mode === 'student'
        ? <MarkRowByStudent row={item.row} />
        : <MarkRowBySubject row={item.row} />;
    }
    return null;
  }, [expandedTeachers, expandedStudents, searchActive, toggleTeacher, toggleStudent, mode]);

  const keyExtractor = useCallback((item: ListItem) => item.key, []);

  return (
    <SafeAreaView style={KStyles.listRoot}>
      {/* Header */}
      <View style={KStyles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={KStyles.headerTitle} numberOfLines={1}>{title}</Text>
        <TouchableOpacity
          onPress={sync}
          disabled={syncing}
          style={KStyles.headerIcon}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          {syncing
            ? <ActivityIndicator size={18} color="#fff" />
            : <Ionicons name="sync-outline" size={22} color="#fff" />
          }
        </TouchableOpacity>
      </View>

      {/* Segment control */}
      <View style={styles.segmentRow}>
        <TouchableOpacity
          style={[styles.segmentBtn, mode === 'student' && styles.segmentBtnActive]}
          onPress={() => setMode('student')}
          activeOpacity={0.8}
        >
          <Text style={[styles.segmentBtnText, mode === 'student' && styles.segmentBtnTextActive]}>
            By Student
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segmentBtn, mode === 'subject' && styles.segmentBtnActive]}
          onPress={() => setMode('subject')}
          activeOpacity={0.8}
        >
          <Text style={[styles.segmentBtnText, mode === 'subject' && styles.segmentBtnTextActive]}>
            By Subject
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={KStyles.searchRow}>
        <Ionicons name="search-outline" size={16} color={Colors.muted} style={KStyles.searchIcon} />
        <TextInput
          style={KStyles.searchInput}
          placeholder="Search teacher, student, subject, exam, grade…"
          placeholderTextColor={Colors.muted}
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={16} color={Colors.muted} />
          </TouchableOpacity>
        )}
      </View>

      {/* List */}
      {loading ? (
        <View style={KStyles.center}>
          <ActivityIndicator size="large" color={PRIMARY} />
        </View>
      ) : listData.length === 0 ? (
        <View style={KStyles.center}>
          <Ionicons name="stats-chart-outline" size={48} color="#ccc" />
          <Text style={{ marginTop: 12, color: Colors.muted, textAlign: 'center' }}>
            No mark records found.
          </Text>
        </View>
      ) : (
        <FlatList
          data={listData}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 24 }}
          removeClippedSubviews={false}
        />
      )}
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Segment
  segmentRow: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  segmentBtnActive:     { borderBottomColor: PRIMARY },
  segmentBtnText:       { fontSize: 14, fontWeight: '600', color: Colors.muted },
  segmentBtnTextActive: { color: PRIMARY },

  // Level-1 teacher header
  teacherHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3E5F5',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: '#CE93D8',
  },
  teacherHeaderTitle: { flex: 1, fontSize: 14, fontWeight: '700', color: '#4A148C' },
  teacherAvgRating:   { fontSize: 12, fontWeight: '600', color: '#7B1FA2', marginRight: 8 },
  teacherCountBadge: {
    backgroundColor: PRIMARY,
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
    marginLeft: 6,
  },
  teacherCountText: { fontSize: 11, color: '#fff', fontWeight: '700' },

  // Level-2 student sub-header
  studentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E1',
    paddingHorizontal: 20,
    paddingVertical: 9,
    borderBottomWidth: 0.5,
    borderBottomColor: '#FFE082',
  },
  studentChevronArea:  { paddingRight: 8, justifyContent: 'center' },
  studentHeaderName:   { fontSize: 13, fontWeight: '700', color: '#333' },
  studentHeaderReg:    { fontSize: 11, color: Colors.muted, fontWeight: '400' },
  studentHeaderCourse: { fontSize: 11, color: Colors.muted, marginTop: 1 },
  avgGradeBadge: {
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A5D6A7',
    paddingHorizontal: 7,
    paddingVertical: 2,
    marginRight: 6,
  },
  avgGradeBadgeText: { fontSize: 11, fontWeight: '700', color: '#2E7D32' },
  countBadge: {
    backgroundColor: '#FFF3E0',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFE082',
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 8,
  },
  countBadgeText: { fontSize: 11, color: '#E65100', fontWeight: '700' },

  // Level-3 table header
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 28,
    paddingVertical: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
  },
  tableHeaderCell: {
    flex: 1,
    fontSize: 10,
    fontWeight: '700',
    color: Colors.muted,
    textTransform: 'uppercase',
  },

  // Level-3 mark row
  markRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingVertical: 8,
    backgroundColor: Colors.surface,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
  },
  markCell:   { flex: 1, fontSize: 13, color: '#222' },
  gradeBadge: { fontWeight: '700', color: PRIMARY },
});
