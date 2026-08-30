import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  View, TextInput, FlatList, StyleSheet, Text,
  SafeAreaView, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useSheet } from '../../hooks/useSheet';
import {
  studentHealthRepository,
  studentRepository,
  courseRepository,
} from '../../db/repositories';
import type { StudentHealthModel } from '../../db/models/studenthealth.model';
import type { StudentModel } from '../../db/models/student.model';
import StudentHealthRow from './StudentHealthRow';
import { Colors, KStyles } from '../../styles/kutties-styles';
import { SHEETS } from '../../utils/constants';

const PRIMARY = Colors.primary;

interface Props {
  navigation: any;
  route?: { params?: { studentRegNumber?: string; studentName?: string; headerTitle?: string } };
}

// ── Flat-list entry types ──────────────────────────────────────────────────
type CourseHeader  = { type: 'course';   course: string };
type StudentHeader = { type: 'student';  name: string; email: string; count: number };
type HealthRow     = { type: 'row';      item: StudentHealthModel };
// When filtered to a single student, use date-header grouping
type DateHeader    = { type: 'date';     date: string };

type ListEntry = CourseHeader | StudentHeader | HealthRow | DateHeader;

export default function StudentHealthList({ navigation, route }: Props) {
  const filterRegNumber = route?.params?.studentRegNumber?.trim();
  const filterName      = route?.params?.studentName?.trim();
  const { syncing, sync } = useSheet(SHEETS.STUDENT_HEALTH);
  const synced = useRef(false);
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<StudentHealthModel[]>([]);
  const [regToStudent, setRegToStudent] = useState<Record<string, StudentModel>>({});
  const [courseOrder, setCourseOrder] = useState<string[]>([]);

  // ── Collapse state (opt-in expand — everything starts collapsed) ───────────
  const [expandedCourses, setExpandedCourses] = useState<Set<string>>(new Set());
  const [expandedStudents, setExpandedStudents] = useState<Set<string>>(new Set());

  const toggleCourse = useCallback((course: string) => {
    setExpandedCourses((prev) => {
      const next = new Set(prev);
      if (next.has(course)) { next.delete(course); } else { next.add(course); }
      return next;
    });
  }, []);

  const toggleStudent = useCallback((reg: string) => {
    setExpandedStudents((prev) => {
      const next = new Set(prev);
      if (next.has(reg)) { next.delete(reg); } else { next.add(reg); }
      return next;
    });
  }, []);

  const loadItems = useCallback(async () => {
    let base: StudentHealthModel[];
    if (filterRegNumber) {
      base = await studentHealthRepository.findByStudent(filterRegNumber);
    } else {
      base = await studentHealthRepository.findAll();
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      base = base.filter((r) => {
        const studentName = regToStudent[(r.regNumber ?? '').trim().toLowerCase()]?.fullName ?? '';
        return [r.regNumber, r.bloodGroup, r.allergies, r.medicalConditions, r.remarks, r.checkupDate, studentName]
          .some((v) => String(v ?? '').toLowerCase().includes(q));
      });
    }

    setItems(base);
  }, [filterRegNumber, search, regToStudent]);

  // Build regNumber→student map and course ordering from the courses sheet
  useEffect(() => {
    Promise.all([
      studentRepository.findAll(),
      courseRepository.findAll(),
    ]).then(([students, courses]) => {
      const map: Record<string, StudentModel> = {};
      students.forEach((s) => {
        if (s.regNumber) map[s.regNumber.trim().toLowerCase()] = s;
      });
      setRegToStudent(map);

      // Ordered course keys in "CourseName: Division" format, matching student.course
      const seen = new Set<string>();
      const names: string[] = [];
      for (const c of courses) {
        const name = c.courseName?.trim() ?? '';
        const div  = c.division?.trim()   ?? '';
        if (!name) continue;
        const key = div ? `${name}: ${div}` : name;
        if (!seen.has(key)) { seen.add(key); names.push(key); }
      }
      setCourseOrder(names);
    });
  }, []);

  useEffect(() => { loadItems(); }, [loadItems]);
  useFocusEffect(useCallback(() => { loadItems(); }, [loadItems]));

  useEffect(() => {
    if (!synced.current) {
      synced.current = true;
      sync().then(() => loadItems());
    }
  }, []);

  const canGoBack = navigation.canGoBack();

  const resolvedFilterName = filterName
    ?? (filterRegNumber ? (regToStudent[filterRegNumber]?.fullName ?? filterRegNumber) : undefined)
    ?? '';

  const headerTitle = resolvedFilterName
    ? `${resolvedFilterName}'s Health`
    : (route?.params?.headerTitle ?? 'Student Health');

  // ── Sections ──────────────────────────────────────────────────────────────
  const sections = useMemo<ListEntry[]>(() => {
    if (filterRegNumber) {
      // Single-student view: group by date (descending)
      const map = new Map<string, StudentHealthModel[]>();
      for (const item of items) {
        const key = item.checkupDate ?? 'No Date';
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(item);
      }
      return [...map.entries()]
        .sort(([a], [b]) => b.localeCompare(a))
        .flatMap(([date, rows]) => [
          { type: 'date' as const, date },
          ...rows.map((r) => ({ type: 'row' as const, item: r })),
        ]);
    }

    // Multi-student view: group by course → student
    // Build: regNumber → list of health records
    const byReg = new Map<string, StudentHealthModel[]>();
    for (const item of items) {
      const key = (item.regNumber ?? '').trim().toLowerCase();
      if (!key) continue;
      if (!byReg.has(key)) byReg.set(key, []);
      byReg.get(key)!.push(item);
    }

    // Build: course → students (only those with health records)
    const byCourse = new Map<string, StudentModel[]>();
    for (const [reg] of byReg) {
      const student = regToStudent[reg];
      // Skip if student record hasn't loaded yet — sections re-memos once it loads
      if (!student) continue;
      const course = student.course?.trim() || 'Unassigned';
      if (!byCourse.has(course)) byCourse.set(course, []);
      if (!byCourse.get(course)!.some((s) => (s.regNumber ?? '').trim().toLowerCase() === reg)) {
        byCourse.get(course)!.push(student);
      }
    }

    // Courses are ordered exactly as they appear in the courses sheet;
    // any course not in the sheet (e.g. 'Unassigned') goes to the bottom alphabetically.
    const sheetCourses  = courseOrder.filter((c) => byCourse.has(c));
    const extraCourses  = [...byCourse.keys()]
      .filter((c) => !courseOrder.includes(c))
      .sort((a, b) => a.localeCompare(b));
    const sortedCourses = [...sheetCourses, ...extraCourses];

    const entries: ListEntry[] = [];
    for (const course of sortedCourses) {
      const courseExpanded = expandedCourses.has(course);
      const students = byCourse.get(course)!.sort((a, b) =>
        (a.fullName ?? a.regNumber ?? '').localeCompare(b.fullName ?? b.regNumber ?? ''),
      );
      entries.push({ type: 'course', course });

      if (courseExpanded) {
        for (const student of students) {
          const reg = student.regNumber ?? '';
          const regKey = reg.trim().toLowerCase();
          const studentExpanded = expandedStudents.has(reg);
          const records = (byReg.get(regKey) ?? []).sort((a, b) =>
            (b.checkupDate ?? '').localeCompare(a.checkupDate ?? ''),
          );
          const displayName = student.fullName ?? student.regNumber ?? reg;
          entries.push({ type: 'student', name: displayName, email: reg, count: records.length });
          if (studentExpanded) {
            for (const r of records) {
              entries.push({ type: 'row', item: r });
            }
          }
        }
      }
    }
    return entries;
  }, [items, filterRegNumber, regToStudent, courseOrder, expandedCourses, expandedStudents]);

  const isEmpty = items.length === 0;

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
              size={14}
              color="#fff"
              style={{ marginLeft: 'auto' }}
            />
          </TouchableOpacity>
        );
      }

      case 'student': {
        const expanded = expandedStudents.has(entry.email);
        return (
          <TouchableOpacity
            style={styles.studentHeader}
            onPress={() => toggleStudent(entry.email)}
            activeOpacity={0.85}
          >
            <View style={styles.studentAvatar}>
              <Ionicons name="person-outline" size={13} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.studentHeaderName} numberOfLines={1}>{entry.name}</Text>
              {entry.name !== entry.email ? (
                <Text style={styles.studentHeaderEmail} numberOfLines={1}>{entry.email}</Text>
              ) : null}
            </View>
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{entry.count}</Text>
            </View>
            <Ionicons
              name={expanded ? 'chevron-down' : 'chevron-forward'}
              size={14}
              color={Colors.muted}
              style={{ marginLeft: 8 }}
            />
          </TouchableOpacity>
        );
      }

      case 'date':
        return (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionHeaderText}>{entry.date}</Text>
          </View>
        );

      case 'row': {
        // In the grouped (multi-student) view the student name is already shown
        // in the student header above, so don't repeat it in the row.
        const regKey = (entry.item.regNumber ?? '').trim().toLowerCase();
        const student = regToStudent[regKey];
        const studentName = filterRegNumber
          ? (student?.fullName ?? student?.regNumber)
          : undefined;
        return (
          <StudentHealthRow
            item={entry.item}
            studentName={studentName}
            hideStudentName={!filterRegNumber}
            onPress={(r) => navigation.navigate('StudentHealthDetails', { item: r })}
          />
        );
      }
    }
  }, [regToStudent, navigation, expandedCourses, expandedStudents, toggleCourse, toggleStudent]);

  return (
    <SafeAreaView style={KStyles.listRoot}>
      {/* Header */}
      <View style={KStyles.header}>
        {canGoBack ? (
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
        ) : (
          <Ionicons name="medkit" size={24} color="#fff" />
        )}
        <Text style={KStyles.headerTitle}>{headerTitle}</Text>
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
          placeholder="Search by student, blood group, conditions…"
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
          <Ionicons name="medkit-outline" size={48} color="#ccc" />
          <Text style={KStyles.emptyText}>No health records found</Text>
        </View>
      ) : (
        <FlatList
          data={sections}
          keyExtractor={(entry, i) => {
            if (entry.type === 'course')  return `c-${entry.course}`;
            if (entry.type === 'student') return `s-${entry.email}`;
            if (entry.type === 'date')    return `d-${entry.date}`;
            return entry.item.id ?? String(i);
          }}
          renderItem={renderEntry}
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={KStyles.fab}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('StudentHealthForm', {
          mode: 'add',
          ...(filterRegNumber && { prefilledRegNumber: filterRegNumber }),
        })}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

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
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  studentHeaderName: { fontSize: 13, fontWeight: '700', color: '#333' },
  studentHeaderEmail: { fontSize: 11, color: Colors.muted, marginTop: 1 },
  countBadge: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  countText: { fontSize: 11, fontWeight: '700', color: '#fff' },

  sectionHeader: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  sectionHeaderText: { fontSize: 12, fontWeight: '700', color: Colors.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
});
