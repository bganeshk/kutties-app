import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View, TextInput, FlatList, StyleSheet, Text,
  SafeAreaView, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useSheet } from '../../../hooks/useSheet';
import {
  studentObservationTrackRepository,
  studentRepository,
  courseRepository,
} from '../../../db/repositories';
import type { StudentObservationTrackModel } from '../../../db/models/studentobservationtrack.model';
import type { StudentModel } from '../../../db/models/student.model';
import { Colors, KStyles } from '../../../styles/kutties-styles';
import { SHEETS } from '../../../utils/constants';

const PRIMARY = Colors.primary;

interface Props {
  navigation: any;
  route?: {
    params?: {
      studentRegNumber?: string;
      studentName?: string;
      headerTitle?: string;
    };
  };
}

// ── Flat-list entry types ──────────────────────────────────────────────────
type CourseHeader   = { type: 'course';   course: string };
type StudentHeader  = { type: 'student';  name: string; reg: string; count: number };
type SessionRow     = { type: 'session';  regNumber: string; obsDate: string; records: StudentObservationTrackModel[] };

type ListEntry = CourseHeader | StudentHeader | SessionRow;

// ── Session summary helpers ────────────────────────────────────────────────
function sessionSummary(records: StudentObservationTrackModel[]): string {
  const answered = records.filter((r) => r.answer === 'Yes' || r.answer === 'No').length;
  const remarked = records.filter((r) => (r.remark ?? '').trim().length > 0).length;
  const by = records[0]?.recordedBy;
  const parts: string[] = [];
  if (answered > 0) parts.push(`${answered} answer${answered !== 1 ? 's' : ''}`);
  if (remarked > 0) parts.push(`${remarked} remark${remarked !== 1 ? 's' : ''}`);
  if (by) parts.push(`Recorded by: ${by}`);
  return parts.join(' · ');
}

export default function StudentObservationList({ navigation, route }: Props) {
  const filterRegNumber = route?.params?.studentRegNumber?.trim();
  const filterName      = route?.params?.studentName?.trim();
  const { syncing, sync } = useSheet(SHEETS.STUDENT_OBSERVATION_TRACK);
  const [search, setSearch]             = useState('');
  const [records, setRecords]           = useState<StudentObservationTrackModel[]>([]);
  const [regToStudent, setRegToStudent] = useState<Record<string, StudentModel>>({});
  const [courseOrder, setCourseOrder]   = useState<string[]>([]);

  // ── Collapse state ────────────────────────────────────────────────────────
  const [expandedCourses,   setExpandedCourses]   = useState<Set<string>>(new Set());
  const [expandedStudents,  setExpandedStudents]  = useState<Set<string>>(new Set());

  const toggleCourse = useCallback((course: string) => {
    setExpandedCourses((prev) => {
      const next = new Set(prev);
      next.has(course) ? next.delete(course) : next.add(course);
      return next;
    });
  }, []);

  const toggleStudent = useCallback((reg: string) => {
    setExpandedStudents((prev) => {
      const next = new Set(prev);
      next.has(reg) ? next.delete(reg) : next.add(reg);
      return next;
    });
  }, []);

  // ── Load ──────────────────────────────────────────────────────────────────
  const loadItems = useCallback(async () => {
    const [allRecords, students, courses] = await Promise.all([
      filterRegNumber
        ? studentObservationTrackRepository.findByStudent(filterRegNumber)
        : studentObservationTrackRepository.findAll(),
      studentRepository.findAll(),
      courseRepository.findAll(),
    ]);

    const map: Record<string, StudentModel> = {};
    students.forEach((s) => {
      if (s.regNumber) map[s.regNumber.trim().toLowerCase()] = s;
    });

    const seen = new Set<string>();
    const names: string[] = [];
    for (const c of courses) {
      const name = c.courseName?.trim() ?? '';
      const div  = c.division?.trim()   ?? '';
      if (!name) continue;
      const key = div ? `${name}: ${div}` : name;
      if (!seen.has(key)) { seen.add(key); names.push(key); }
    }

    let base = allRecords;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      base = base.filter((r) => {
        const sName = map[(r.regNumber ?? '').trim().toLowerCase()]?.fullName ?? '';
        return [r.regNumber, r.obsDate, r.recordedBy, r.remark, sName]
          .some((v) => String(v ?? '').toLowerCase().includes(q));
      });
    }

    setRegToStudent(map);
    setCourseOrder(names);
    setRecords(base);
  }, [filterRegNumber, search]);

  useFocusEffect(useCallback(() => {
    sync().then(() => loadItems());
  }, [sync, loadItems]));

  useEffect(() => { loadItems(); }, [loadItems]);

  const canGoBack = navigation.canGoBack();

  const resolvedFilterName = filterName
    ?? (filterRegNumber ? (regToStudent[filterRegNumber.toLowerCase()]?.fullName ?? filterRegNumber) : undefined)
    ?? '';

  const headerTitle = resolvedFilterName
    ? `${resolvedFilterName}'s Observations`
    : (route?.params?.headerTitle ?? 'Student Observations');

  // ── Sessions keyed by regNumber + obsDate ─────────────────────────────────
  const sessionMap = useMemo(() => {
    const m = new Map<string, StudentObservationTrackModel[]>();
    for (const r of records) {
      const key = `${(r.regNumber ?? '').toLowerCase()}__${r.obsDate ?? ''}`;
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(r);
    }
    return m;
  }, [records]);

  // ── FlatList entries ──────────────────────────────────────────────────────
  const sections = useMemo<ListEntry[]>(() => {
    if (filterRegNumber) {
      // Single-student: group by date descending
      const byDate = new Map<string, StudentObservationTrackModel[]>();
      for (const r of records) {
        const key = r.obsDate ?? 'No Date';
        if (!byDate.has(key)) byDate.set(key, []);
        byDate.get(key)!.push(r);
      }
      return [...byDate.entries()]
        .sort(([a], [b]) => b.localeCompare(a))
        .map(([obsDate, recs]) => ({
          type: 'session' as const,
          regNumber: filterRegNumber,
          obsDate,
          records: recs,
        }));
    }

    // Multi-student: group by course → student
    const byReg = new Map<string, StudentObservationTrackModel[]>();
    for (const r of records) {
      const key = (r.regNumber ?? '').trim().toLowerCase();
      if (!key) continue;
      if (!byReg.has(key)) byReg.set(key, []);
      byReg.get(key)!.push(r);
    }

    const byCourse = new Map<string, StudentModel[]>();
    for (const [reg] of byReg) {
      const student = regToStudent[reg];
      if (!student) continue;
      const course = student.course?.trim() || 'Unassigned';
      if (!byCourse.has(course)) byCourse.set(course, []);
      if (!byCourse.get(course)!.some((s) => (s.regNumber ?? '').trim().toLowerCase() === reg)) {
        byCourse.get(course)!.push(student);
      }
    }

    const sheetCourses = courseOrder.filter((c) => byCourse.has(c));
    const extraCourses = [...byCourse.keys()]
      .filter((c) => !courseOrder.includes(c))
      .sort((a, b) => a.localeCompare(b));
    const sortedCourses = [...sheetCourses, ...extraCourses];

    const entries: ListEntry[] = [];
    for (const course of sortedCourses) {
      entries.push({ type: 'course', course });
      if (!expandedCourses.has(course)) continue;

      const studentsInCourse = byCourse.get(course)!.sort((a, b) =>
        (a.fullName ?? a.regNumber ?? '').localeCompare(b.fullName ?? b.regNumber ?? ''),
      );
      for (const student of studentsInCourse) {
        const reg    = student.regNumber ?? '';
        const regKey = reg.trim().toLowerCase();
        const studentRows = byReg.get(regKey) ?? [];

        // Count distinct sessions for this student
        const sessionDates = [...new Set(studentRows.map((r) => r.obsDate ?? ''))];
        entries.push({ type: 'student', name: student.fullName ?? reg, reg, count: sessionDates.length });

        if (!expandedStudents.has(reg)) continue;

        // One row per session, sorted date descending
        for (const obsDate of sessionDates.sort((a, b) => b.localeCompare(a))) {
          entries.push({
            type: 'session',
            regNumber: reg,
            obsDate,
            records: studentRows.filter((r) => r.obsDate === obsDate),
          });
        }
      }
    }
    return entries;
  }, [records, filterRegNumber, regToStudent, courseOrder, expandedCourses, expandedStudents]);

  const isEmpty = records.length === 0;

  const renderEntry = useCallback(({ item: entry }: { item: ListEntry }) => {
    switch (entry.type) {
      case 'course': {
        const expanded = expandedCourses.has(entry.course);
        return (
          <TouchableOpacity
            style={styles.courseHeader}
            onPress={() => toggleCourse(entry.course)}
            activeOpacity={0.85}
          >
            <Ionicons name="school-outline" size={14} color="#fff" style={{ marginRight: 6 }} />
            <Text style={styles.courseHeaderText}>{entry.course}</Text>
            <Ionicons
              name={expanded ? 'chevron-down' : 'chevron-forward'}
              size={14} color="#fff"
              style={{ marginLeft: 'auto' }}
            />
          </TouchableOpacity>
        );
      }

      case 'student': {
        const expanded = expandedStudents.has(entry.reg);
        return (
          <TouchableOpacity
            style={styles.studentHeader}
            onPress={() => toggleStudent(entry.reg)}
            activeOpacity={0.85}
          >
            <View style={styles.studentAvatar}>
              <Ionicons name="person-outline" size={13} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.studentHeaderName} numberOfLines={1}>{entry.name}</Text>
              {entry.name !== entry.reg ? (
                <Text style={styles.studentHeaderReg} numberOfLines={1}>{entry.reg}</Text>
              ) : null}
            </View>
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{entry.count}</Text>
            </View>
            <Ionicons
              name={expanded ? 'chevron-down' : 'chevron-forward'}
              size={14} color={Colors.muted}
              style={{ marginLeft: 8 }}
            />
          </TouchableOpacity>
        );
      }

      case 'session': {
        const summary = sessionSummary(entry.records);
        return (
          <TouchableOpacity
            style={styles.sessionRow}
            activeOpacity={0.85}
            onPress={() =>
              navigation.navigate('StudentObservationForm', {
                mode: 'view',
                sessionRecords: entry.records,
                prefilledRegNumber: entry.regNumber,
              })
            }
          >
            <View style={styles.sessionAvatar}>
              <Ionicons name="eye-outline" size={18} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sessionDate}>{entry.obsDate || 'No Date'}</Text>
              {summary ? (
                <Text style={styles.sessionMeta} numberOfLines={1}>{summary}</Text>
              ) : null}
            </View>
            <Ionicons name="chevron-forward" size={16} color="#ccc" style={{ marginLeft: 8 }} />
          </TouchableOpacity>
        );
      }
    }
  }, [navigation, expandedCourses, expandedStudents, toggleCourse, toggleStudent]);

  return (
    <SafeAreaView style={KStyles.listRoot}>
      {/* Header */}
      <View style={KStyles.header}>
        {canGoBack ? (
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
        ) : (
          <Ionicons name="eye" size={24} color="#fff" />
        )}
        <Text style={KStyles.headerTitle} numberOfLines={1}>{headerTitle}</Text>
        <TouchableOpacity onPress={() => sync().then(() => loadItems())} style={KStyles.headerIcon}>
          {syncing
            ? <ActivityIndicator size="small" color="#fff" />
            : <Ionicons name="refresh" size={22} color="#fff" />}
        </TouchableOpacity>
      </View>

      {/* Search bar */}
      <View style={KStyles.searchRow}>
        <Ionicons name="search" size={18} color="#999" style={KStyles.searchIcon} />
        <TextInput
          style={KStyles.searchInput}
          placeholder="Search by student, date, teacher…"
          placeholderTextColor="#bbb"
          value={search}
          onChangeText={setSearch}
          clearButtonMode="while-editing"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color="#bbb" />
          </TouchableOpacity>
        )}
      </View>

      {isEmpty && syncing ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={PRIMARY} />
        </View>
      ) : isEmpty ? (
        <View style={styles.center}>
          <Ionicons name="eye-off-outline" size={48} color="#ccc" />
          <Text style={KStyles.emptyText}>No observations recorded yet</Text>
        </View>
      ) : (
        <FlatList
          data={sections}
          keyExtractor={(entry, i) => {
            if (entry.type === 'course')   return `c-${entry.course}`;
            if (entry.type === 'student')  return `s-${entry.reg}`;
            return `sess-${entry.regNumber}-${entry.obsDate ?? i}`;
          }}
          renderItem={renderEntry}
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={KStyles.fab}
        activeOpacity={0.85}
        onPress={() =>
          navigation.navigate('StudentObservationForm', {
            mode: 'add',
            ...(filterRegNumber && { prefilledRegNumber: filterRegNumber }),
          })
        }
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  center: { ...KStyles.center, gap: 12, paddingTop: 80 },

  courseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginTop: 4,
  },
  courseHeaderText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },

  studentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.lightPink,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  studentAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  studentHeaderName: { fontSize: 13, fontWeight: '700', color: '#333' },
  studentHeaderReg:  { fontSize: 11, color: Colors.muted, marginTop: 1 },
  countBadge: {
    backgroundColor: PRIMARY,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  countText: { fontSize: 11, fontWeight: '700', color: '#fff' },

  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  sessionAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#00796B',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    flexShrink: 0,
  },
  sessionDate: { fontSize: 13, fontWeight: '700', color: '#333' },
  sessionMeta: { fontSize: 11, color: Colors.muted, marginTop: 2 },
});
