import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  View, TextInput, FlatList, StyleSheet, Text,
  SafeAreaView, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useSheet } from '../../hooks/useSheet';
import {
  studentFeeRepository,
  studentRepository,
  courseRepository,
} from '../../db/repositories';
import type { StudentFeeModel } from '../../db/models/studentfee.model';
import type { StudentModel } from '../../db/models/student.model';
import StudentFeeRow from './StudentFeeRow';
import { Colors, KStyles } from '../../styles/kutties-styles';
import { SHEETS } from '../../utils/constants';

const PRIMARY = Colors.primary;

interface Props {
  navigation: any;
  route?: {
    params?: {
      studentRegNumber?: string;
      studentName?: string;
      headerTitle?: string;
      /** Pre-fill form when launched from "Collect Fee" dashboard card */
      prefilledRegNumber?: string;
    };
  };
}

// ── Flat-list entry types ──────────────────────────────────────────────────
type CourseHeader  = { type: 'course';   course: string };
type StudentHeader = { type: 'student';  name: string; regNumber: string; count: number };
type FeeRow        = { type: 'row';      item: StudentFeeModel };

type ListEntry = CourseHeader | StudentHeader | FeeRow;

export default function StudentFeeList({ navigation, route }: Props) {
  const filterRegNumber = route?.params?.studentRegNumber?.trim();
  const filterName      = route?.params?.studentName?.trim();
  const { syncing, sync } = useSheet(SHEETS.STUDENT_FEE);
  const synced = useRef(false);
  const [search, setSearch] = useState('');
  const [items, setItems]   = useState<StudentFeeModel[]>([]);
  const [regToStudent, setRegToStudent] = useState<Record<string, StudentModel>>({});
  const [courseOrder,  setCourseOrder]  = useState<string[]>([]);

  // Collapse state — everything starts collapsed
  const [expandedCourses,   setExpandedCourses]   = useState<Set<string>>(new Set());
  const [expandedStudents, setExpandedStudents] = useState<Set<string>>(new Set());

  const toggleCourse  = useCallback((c: string) => setExpandedCourses(prev => {
    const next = new Set(prev); next.has(c) ? next.delete(c) : next.add(c); return next;
  }), []);
  const toggleStudent = useCallback((r: string) => setExpandedStudents(prev => {
    const next = new Set(prev); next.has(r) ? next.delete(r) : next.add(r); return next;
  }), []);

  const loadItems = useCallback(async () => {
    let base: StudentFeeModel[];
    if (filterRegNumber) {
      base = await studentFeeRepository.findByStudent(filterRegNumber);
    } else {
      base = await studentFeeRepository.findAll();
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      base = base.filter((r) => {
        const sname = regToStudent[(r.regNumber ?? '').trim().toLowerCase()]?.fullName ?? '';
        return [r.regNumber, r.feeType, r.status, r.paymentMode, r.remarks, sname]
          .some((v) => String(v ?? '').toLowerCase().includes(q));
      });
    }

    setItems(base);
  }, [filterRegNumber, search, regToStudent]);

  useEffect(() => {
    Promise.all([
      studentRepository.findAll(),
      courseRepository.findAll(),
    ]).then(([students, courses]) => {
      const map: Record<string, StudentModel> = {};
      students.forEach((s) => { if (s.regNumber) map[s.regNumber.trim().toLowerCase()] = s; });
      setRegToStudent(map);

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
    ? `${resolvedFilterName}'s Fees`
    : (route?.params?.headerTitle ?? 'Student Fees');

  // ── Sections ──────────────────────────────────────────────────────────────
  const sections = useMemo<ListEntry[]>(() => {
    if (filterRegNumber) {
      // Single student — show all fee rows sorted by dueDate desc
      return [...items]
        .sort((a, b) => (b.dueDate ?? '').localeCompare(a.dueDate ?? ''))
        .map((item) => ({ type: 'row' as const, item }));
    }

    // Multi-student view: course → student → rows
    const byReg = new Map<string, StudentFeeModel[]>();
    for (const item of items) {
      const key = (item.regNumber ?? '').trim().toLowerCase();
      if (!key) continue;
      if (!byReg.has(key)) byReg.set(key, []);
      byReg.get(key)!.push(item);
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

    const sheetCourses  = courseOrder.filter((c) => byCourse.has(c));
    const extraCourses  = [...byCourse.keys()].filter((c) => !courseOrder.includes(c)).sort();
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
          const reg    = student.regNumber ?? '';
          const regKey = reg.trim().toLowerCase();
          const expanded = expandedStudents.has(reg);
          const records = (byReg.get(regKey) ?? []).sort((a, b) =>
            (b.dueDate ?? '').localeCompare(a.dueDate ?? ''),
          );
          const displayName = student.fullName ?? student.regNumber ?? reg;
          entries.push({ type: 'student', name: displayName, regNumber: reg, count: records.length });
          if (expanded) {
            for (const r of records) entries.push({ type: 'row', item: r });
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
          <TouchableOpacity style={styles.courseHeader} onPress={() => toggleCourse(entry.course)} activeOpacity={0.85}>
            <Ionicons name="school-outline" size={14} color="#fff" style={{ marginRight: 6 }} />
            <Text style={styles.courseHeaderText}>{entry.course}</Text>
            <Ionicons name={expanded ? 'chevron-down' : 'chevron-forward'} size={14} color="#fff" style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>
        );
      }
      case 'student': {
        const expanded = expandedStudents.has(entry.regNumber);
        return (
          <TouchableOpacity style={styles.studentHeader} onPress={() => toggleStudent(entry.regNumber)} activeOpacity={0.85}>
            <View style={styles.studentAvatar}>
              <Ionicons name="person-outline" size={13} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.studentHeaderName} numberOfLines={1}>{entry.name}</Text>
              {entry.name !== entry.regNumber ? (
                <Text style={styles.studentHeaderSub} numberOfLines={1}>{entry.regNumber}</Text>
              ) : null}
            </View>
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{entry.count}</Text>
            </View>
            <Ionicons name={expanded ? 'chevron-down' : 'chevron-forward'} size={14} color={Colors.muted} style={{ marginLeft: 8 }} />
          </TouchableOpacity>
        );
      }
      case 'row': {
        const regKey = (entry.item.regNumber ?? '').trim().toLowerCase();
        const student = regToStudent[regKey];
        const studentName = filterRegNumber ? (student?.fullName ?? student?.regNumber) : undefined;
        return (
          <StudentFeeRow
            item={entry.item}
            studentName={studentName}
            hideStudentName={!filterRegNumber}
            onPress={(r) => navigation.navigate('StudentFeeDetails', { item: r })}
          />
        );
      }
    }
  }, [regToStudent, navigation, expandedCourses, expandedStudents, toggleCourse, toggleStudent, filterRegNumber]);

  return (
    <SafeAreaView style={KStyles.listRoot}>
      {/* Header */}
      <View style={KStyles.header}>
        {canGoBack ? (
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
        ) : (
          <Ionicons name="cash" size={24} color="#fff" />
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
          placeholder="Search by student, fee type, status…"
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
          <Ionicons name="cash-outline" size={48} color="#ccc" />
          <Text style={KStyles.emptyText}>No fee records found</Text>
        </View>
      ) : (
        <FlatList
          data={sections}
          keyExtractor={(entry, i) => {
            if (entry.type === 'course')  return `c-${entry.course}`;
            if (entry.type === 'student') return `s-${entry.regNumber}`;
            return entry.item.id ?? String(i);
          }}
          renderItem={renderEntry}
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={KStyles.fab}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('StudentFeeForm', {
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
    backgroundColor: '#1565C0',
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
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  studentAvatar: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: '#1565C0',
    justifyContent: 'center', alignItems: 'center', marginRight: 10,
  },
  studentHeaderName: { fontSize: 13, fontWeight: '700', color: '#333' },
  studentHeaderSub:  { fontSize: 11, color: Colors.muted, marginTop: 1 },
  countBadge: {
    backgroundColor: '#1565C0',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 5,
  },
  countText: { fontSize: 11, fontWeight: '700', color: '#fff' },
});
