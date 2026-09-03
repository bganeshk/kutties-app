import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  View, TextInput, FlatList, StyleSheet, Text,
  SafeAreaView, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useSheet } from '../../../hooks/useSheet';
import { syncSheet } from '../../../sync/sync.service';
import {
  studentFeeRepository,
  studentRepository,
  courseRepository,
} from '../../../db/repositories';
import type { StudentFeeModel } from '../../../db/models/studentfee.model';
import type { StudentModel } from '../../../db/models/student.model';
import StudentFeeRow from './StudentFeeRow';
import { Colors, KStyles } from '../../../styles/kutties-styles';
import { SHEETS } from '../../../utils/constants';

const PRIMARY = Colors.primary;

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

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
type CourseHeader  = { type: 'course';   course: string; sum: number };
type StudentHeader = { type: 'student';  name: string; regNumber: string; count: number };
type FeeRow        = { type: 'row';      item: StudentFeeModel };
type YearHeader    = { type: 'year';     year: string };
type MonthHeader   = { type: 'month';    key: string; label: string; sum: number };   // key = "YYYY-MM"
type DateCourseHeader = { type: 'dateCourse'; key: string; course: string; sum: number }; // key = "YYYY-MM|course"
type DateStudentHeader = {
  type: 'dateStudent';
  key: string;   // "YYYY-MM|course|reg"
  name: string;
  regNumber: string;
  count: number;
};

type ListEntry =
  | CourseHeader | StudentHeader | FeeRow
  | YearHeader | MonthHeader | DateCourseHeader | DateStudentHeader;

type TabId = 'byCourse' | 'byDate';

export default function StudentFeeList({ navigation, route }: Props) {
  const filterRegNumber = route?.params?.studentRegNumber?.trim();
  const filterName      = route?.params?.studentName?.trim();
  const { syncing, sync } = useSheet(SHEETS.STUDENT_FEE);
  const synced = useRef(false);
  const [search, setSearch] = useState('');
  const [items, setItems]   = useState<StudentFeeModel[]>([]);
  const [regToStudent, setRegToStudent] = useState<Record<string, StudentModel>>({});
  const [courseOrder,  setCourseOrder]  = useState<string[]>([]);

  // ── Active tab (hidden when viewing a single student) ──────────────────────
  const [activeTab, setActiveTab] = useState<TabId>('byCourse');

  // ── Collapse state — byCourse ──────────────────────────────────────────────
  const [expandedCourses,   setExpandedCourses]   = useState<Set<string>>(new Set());
  const [expandedStudents,  setExpandedStudents]  = useState<Set<string>>(new Set());

  // ── Collapse state — byDate ────────────────────────────────────────────────
  const [expandedYears,        setExpandedYears]        = useState<Set<string>>(new Set());
  const [expandedMonths,       setExpandedMonths]       = useState<Set<string>>(new Set());
  const [expandedDateCourses,  setExpandedDateCourses]  = useState<Set<string>>(new Set());
  const [expandedDateStudents, setExpandedDateStudents] = useState<Set<string>>(new Set());

  const toggleCourse  = useCallback((c: string) => setExpandedCourses(prev => {
    const next = new Set(prev); next.has(c) ? next.delete(c) : next.add(c); return next;
  }), []);
  const toggleStudent = useCallback((r: string) => setExpandedStudents(prev => {
    const next = new Set(prev); next.has(r) ? next.delete(r) : next.add(r); return next;
  }), []);
  const toggleYear = useCallback((y: string) => setExpandedYears(prev => {
    const next = new Set(prev); next.has(y) ? next.delete(y) : next.add(y); return next;
  }), []);
  const toggleMonth = useCallback((k: string) => setExpandedMonths(prev => {
    const next = new Set(prev); next.has(k) ? next.delete(k) : next.add(k); return next;
  }), []);
  const toggleDateCourse = useCallback((k: string) => setExpandedDateCourses(prev => {
    const next = new Set(prev); next.has(k) ? next.delete(k) : next.add(k); return next;
  }), []);
  const toggleDateStudent = useCallback((k: string) => setExpandedDateStudents(prev => {
    const next = new Set(prev); next.has(k) ? next.delete(k) : next.add(k); return next;
  }), []);

  /** "YYYY-MM" for offset months from today (0 = current). */
  function monthKey(offset = 0): string {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() + offset);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  const loadItems = useCallback(async () => {
    let base: StudentFeeModel[];
    if (filterRegNumber) {
      // Single-student view: load all their records (no date restriction)
      base = await studentFeeRepository.findByStudent(filterRegNumber);
    } else {
      // General list: load all records (paid + unpaid) for the last 3 months
      base = await studentFeeRepository.findByMonthRange(monthKey(-2), monthKey(0));
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

  const loadStudentsAndCourses = useCallback(async () => {
    const [students, courses] = await Promise.all([
      studentRepository.findAll(),
      courseRepository.findAll(),
    ]);
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
  }, []);

  useEffect(() => { loadStudentsAndCourses(); }, [loadStudentsAndCourses]);
  useEffect(() => { loadItems(); }, [loadItems]);
  useFocusEffect(useCallback(() => { loadItems(); }, [loadItems]));

  useEffect(() => {
    if (!synced.current) {
      synced.current = true;
      // Sync all three sheets this screen depends on, then reload
      Promise.all([
        sync(),                          // STUDENT_FEE (via useSheet)
        syncSheet(SHEETS.STUDENTS),
        syncSheet(SHEETS.COURSES),
      ]).then(() => Promise.all([loadStudentsAndCourses(), loadItems()]));
    }
  }, []);

  const canGoBack = navigation.canGoBack();

  const resolvedFilterName = filterName
    ?? (filterRegNumber ? (regToStudent[filterRegNumber]?.fullName ?? filterRegNumber) : undefined)
    ?? '';

  const headerTitle = resolvedFilterName
    ? `${resolvedFilterName}'s Fees`
    : (route?.params?.headerTitle ?? 'Student Fees');

  // ── byCourse sections (existing logic) ──────────────────────────────────────
  const byCourseEntries = useMemo<ListEntry[]>(() => {
    if (filterRegNumber) {
      return [...items]
        .sort((a, b) => (b.dueDate ?? '').localeCompare(a.dueDate ?? ''))
        .map((item) => ({ type: 'row' as const, item }));
    }

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
      const courseSum = [...(byCourse.get(course) ?? [])].reduce((acc, student) => {
        const reg = (student.regNumber ?? '').trim().toLowerCase();
        return acc + (byReg.get(reg) ?? []).reduce((s, r) => s + (r.amount ?? 0), 0);
      }, 0);
      entries.push({ type: 'course', course, sum: courseSum });

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

  // ── byDate sections: year → month → course → student → rows ────────────────
  const byDateEntries = useMemo<ListEntry[]>(() => {
    if (filterRegNumber) {
      // Single student — just flat rows sorted by paidDate desc
      return [...items]
        .sort((a, b) => (b.paidDate ?? b.dueDate ?? '').localeCompare(a.paidDate ?? a.dueDate ?? ''))
        .map((item) => ({ type: 'row' as const, item }));
    }

    // Group by year → month → course → student
    // Month grouping always uses dueDate (the fee's due month).
    const MON_IDX: Record<string, number> = {
      jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
      jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
    };

    function parseFeeDate(dateStr: string): { year: string; monthKey: string } {
      // dd/MMM/yyyy
      const m = dateStr.match(/^(\d{1,2})\/([A-Za-z]{3})\/(\d{4})$/);
      if (m) {
        const year = m[3];
        const monIdx = MON_IDX[m[2].toLowerCase()] ?? -1;
        const monthKey = monIdx >= 0
          ? `${year}-${String(monIdx + 1).padStart(2, '0')}`
          : `${year}-??`;
        return { year, monthKey };
      }
      // ISO YYYY-MM-DD fallback
      const iso = dateStr.match(/^(\d{4})-(\d{2})/);
      if (iso) return { year: iso[1], monthKey: `${iso[1]}-${iso[2]}` };
      return { year: 'Unknown', monthKey: 'Unknown' };
    }

    type Leaf = { item: StudentFeeModel; year: string; month: string; course: string; regKey: string };

    const leaves: Leaf[] = [];
    for (const item of items) {
      const dateStr = item.dueDate ?? '';
      const { year, monthKey } = parseFeeDate(dateStr);
      const regKey = (item.regNumber ?? '').trim().toLowerCase();
      const student = regToStudent[regKey];
      const course = student?.course?.trim() || 'Unassigned';
      leaves.push({ item, year, month: monthKey, course, regKey });
    }

    // Sort leaves: newest year/month first
    leaves.sort((a, b) => {
      if (b.year !== a.year) return b.year.localeCompare(a.year);
      if (b.month !== a.month) return b.month.localeCompare(a.month);
      return 0;
    });

    // Build nested structure: Map<year, Map<month, Map<course, Map<regKey, StudentFeeModel[]>>>>
    const tree = new Map<string, Map<string, Map<string, Map<string, StudentFeeModel[]>>>>();
    for (const leaf of leaves) {
      if (!tree.has(leaf.year)) tree.set(leaf.year, new Map());
      const yearMap = tree.get(leaf.year)!;
      if (!yearMap.has(leaf.month)) yearMap.set(leaf.month, new Map());
      const monthMap = yearMap.get(leaf.month)!;
      if (!monthMap.has(leaf.course)) monthMap.set(leaf.course, new Map());
      const courseMap = monthMap.get(leaf.course)!;
      if (!courseMap.has(leaf.regKey)) courseMap.set(leaf.regKey, []);
      courseMap.get(leaf.regKey)!.push(leaf.item);
    }

    const entries: ListEntry[] = [];

    // Years: newest first (already sorted)
    const sortedYears = [...tree.keys()].sort((a, b) => b.localeCompare(a));
    for (const year of sortedYears) {
      entries.push({ type: 'year', year });
      const yearExpanded = expandedYears.has(year);
      if (!yearExpanded) continue;

      const yearMap = tree.get(year)!;
      const sortedMonths = [...yearMap.keys()].sort((a, b) => b.localeCompare(a));

      for (const monthKey of sortedMonths) {
        const monthIdx = parseInt(monthKey.slice(5, 7), 10) - 1;
        const monthLabel = monthIdx >= 0 && monthIdx < 12
          ? `${MONTH_NAMES[monthIdx]} ${year}`
          : monthKey;
        const monthMap = yearMap.get(monthKey)!;
        const monthSum = [...monthMap.values()].reduce((macc, courseMap) =>
          macc + [...courseMap.values()].reduce((cacc, records) =>
            cacc + records.reduce((racc, r) => racc + (r.amount ?? 0), 0), 0), 0);
        entries.push({ type: 'month', key: monthKey, label: monthLabel, sum: monthSum });
        const monthExpanded = expandedMonths.has(monthKey);
        if (!monthExpanded) continue;

        // Sort courses: follow courseOrder then alphabetical
        const sheetC = courseOrder.filter((c) => monthMap.has(c));
        const extraC = [...monthMap.keys()].filter((c) => !courseOrder.includes(c)).sort();
        const sortedCourses = [...sheetC, ...extraC];

        for (const course of sortedCourses) {
          const dcKey = `${monthKey}|${course}`;
          const courseMap = monthMap.get(course)!;
          const dcSum = [...courseMap.values()].reduce((cacc, records) =>
            cacc + records.reduce((racc, r) => racc + (r.amount ?? 0), 0), 0);
          entries.push({ type: 'dateCourse', key: dcKey, course, sum: dcSum });
          const dcExpanded = expandedDateCourses.has(dcKey);
          if (!dcExpanded) continue;

          // Sort students by name
          const sortedRegs = [...courseMap.keys()].sort((a, b) => {
            const na = regToStudent[a]?.fullName ?? a;
            const nb = regToStudent[b]?.fullName ?? b;
            return na.localeCompare(nb);
          });

          for (const regKey of sortedRegs) {
            const student = regToStudent[regKey];
            const regNumber = student?.regNumber ?? regKey;
            const displayName = student?.fullName ?? student?.regNumber ?? regKey;
            const records = courseMap.get(regKey)!;
            const dsKey = `${dcKey}|${regKey}`;
            entries.push({ type: 'dateStudent', key: dsKey, name: displayName, regNumber, count: records.length });
            const dsExpanded = expandedDateStudents.has(dsKey);
            if (!dsExpanded) continue;
            for (const r of records.sort((a, b) =>
              (b.paidDate ?? b.dueDate ?? '').localeCompare(a.paidDate ?? a.dueDate ?? ''),
            )) {
              entries.push({ type: 'row', item: r });
            }
          }
        }
      }
    }

    return entries;
  }, [items, filterRegNumber, regToStudent, courseOrder,
      expandedYears, expandedMonths, expandedDateCourses, expandedDateStudents]);

  const sections = activeTab === 'byCourse' ? byCourseEntries : byDateEntries;
  const isEmpty = items.length === 0;

  const renderEntry = useCallback(({ item: entry }: { item: ListEntry }) => {
    switch (entry.type) {
      // ── byCourse headers ────────────────────────────────────────────────────
      case 'course': {
        const expanded = expandedCourses.has(entry.course);
        return (
          <TouchableOpacity style={styles.courseHeader} onPress={() => toggleCourse(entry.course)} activeOpacity={0.85}>
            <Ionicons name="school-outline" size={14} color="#fff" style={{ marginRight: 6 }} />
            <Text style={styles.courseHeaderText}>{entry.course}</Text>
            <Text style={styles.headerSum}>₹{entry.sum.toLocaleString('en-IN')}</Text>
            <Ionicons name={expanded ? 'chevron-down' : 'chevron-forward'} size={14} color="#fff" style={{ marginLeft: 8 }} />
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

      // ── byDate headers ──────────────────────────────────────────────────────
      case 'year': {
        const expanded = expandedYears.has(entry.year);
        return (
          <TouchableOpacity style={styles.yearHeader} onPress={() => toggleYear(entry.year)} activeOpacity={0.85}>
            <Ionicons name="calendar-outline" size={14} color="#fff" style={{ marginRight: 6 }} />
            <Text style={styles.yearHeaderText}>{entry.year}</Text>
            <Ionicons name={expanded ? 'chevron-down' : 'chevron-forward'} size={14} color="#fff" style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>
        );
      }
      case 'month': {
        const expanded = expandedMonths.has(entry.key);
        return (
          <TouchableOpacity style={styles.monthHeader} onPress={() => toggleMonth(entry.key)} activeOpacity={0.85}>
            <Ionicons name="calendar" size={13} color={PRIMARY} style={{ marginRight: 6 }} />
            <Text style={styles.monthHeaderText}>{entry.label}</Text>
            <Text style={styles.monthHeaderSum}>₹{entry.sum.toLocaleString('en-IN')}</Text>
            <Ionicons name={expanded ? 'chevron-down' : 'chevron-forward'} size={13} color={PRIMARY} style={{ marginLeft: 8 }} />
          </TouchableOpacity>
        );
      }
      case 'dateCourse': {
        const expanded = expandedDateCourses.has(entry.key);
        return (
          <TouchableOpacity style={styles.dateCourseHeader} onPress={() => toggleDateCourse(entry.key)} activeOpacity={0.85}>
            <Ionicons name="school-outline" size={13} color="#fff" style={{ marginRight: 6 }} />
            <Text style={styles.dateCourseHeaderText}>{entry.course}</Text>
            <Text style={styles.headerSum}>₹{entry.sum.toLocaleString('en-IN')}</Text>
            <Ionicons name={expanded ? 'chevron-down' : 'chevron-forward'} size={13} color="#fff" style={{ marginLeft: 8 }} />
          </TouchableOpacity>
        );
      }
      case 'dateStudent': {
        const expanded = expandedDateStudents.has(entry.key);
        return (
          <TouchableOpacity style={styles.studentHeader} onPress={() => toggleDateStudent(entry.key)} activeOpacity={0.85}>
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

      // ── Fee row ─────────────────────────────────────────────────────────────
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
  }, [
    regToStudent, navigation, filterRegNumber,
    expandedCourses, expandedStudents, toggleCourse, toggleStudent,
    expandedYears, expandedMonths, expandedDateCourses, expandedDateStudents,
    toggleYear, toggleMonth, toggleDateCourse, toggleDateStudent,
  ]);

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

      {/* Tabs — only shown when not filtered to a single student */}
      {!filterRegNumber && (
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'byCourse' && styles.tabActive]}
            onPress={() => setActiveTab('byCourse')}
            activeOpacity={0.85}
          >
            <Ionicons name="school-outline" size={14} color={activeTab === 'byCourse' ? PRIMARY : Colors.muted} style={{ marginRight: 4 }} />
            <Text style={[styles.tabLabel, activeTab === 'byCourse' && styles.tabLabelActive]}>By Course</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'byDate' && styles.tabActive]}
            onPress={() => setActiveTab('byDate')}
            activeOpacity={0.85}
          >
            <Ionicons name="calendar-outline" size={14} color={activeTab === 'byDate' ? PRIMARY : Colors.muted} style={{ marginRight: 4 }} />
            <Text style={[styles.tabLabel, activeTab === 'byDate' && styles.tabLabelActive]}>By Date</Text>
          </TouchableOpacity>
        </View>
      )}

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
            if (entry.type === 'course')       return `c-${entry.course}`;
            if (entry.type === 'student')      return `s-${entry.regNumber}`;
            if (entry.type === 'year')         return `y-${entry.year}`;
            if (entry.type === 'month')        return `m-${entry.key}`;
            if (entry.type === 'dateCourse')   return `dc-${entry.key}`;
            if (entry.type === 'dateStudent')  return `ds-${entry.key}`;
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

  // ── Tab bar ──────────────────────────────────────────────────────────────────
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: PRIMARY,
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.muted,
  },
  tabLabelActive: {
    color: PRIMARY,
  },

  // ── byCourse headers ─────────────────────────────────────────────────────────
  courseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PRIMARY,
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
    flex: 1,
  },
  headerSum: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.9)',
    marginLeft: 'auto' as any,
    marginRight: 4,
  },
  studentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FCE4EC',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  studentAvatar: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: PRIMARY,
    justifyContent: 'center', alignItems: 'center', marginRight: 10,
  },
  studentHeaderName: { fontSize: 13, fontWeight: '700', color: '#333' },
  studentHeaderSub:  { fontSize: 11, color: Colors.muted, marginTop: 1 },
  countBadge: {
    backgroundColor: PRIMARY,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 5,
  },
  countText: { fontSize: 11, fontWeight: '700', color: '#fff' },

  // ── byDate headers — mirrors byCourse palette ────────────────────────────────
  // year  → same solid primary as courseHeader
  yearHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PRIMARY,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginTop: 4,
  },
  yearHeaderText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  // month → same light-pink as studentHeader
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FCE4EC',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  monthHeaderText: {
    fontSize: 13,
    fontWeight: '700',
    color: PRIMARY,
    flex: 1,
  },
  monthHeaderSum: {
    fontSize: 12,
    fontWeight: '700',
    color: PRIMARY,
    marginLeft: 'auto' as any,
    marginRight: 4,
  },
  // dateCourse → same solid primary as courseHeader, indented to show nesting
  dateCourseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PRIMARY,
    paddingHorizontal: 28,
    paddingVertical: 8,
    marginTop: 2,
  },
  dateCourseHeaderText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    flex: 1,
  },
});
