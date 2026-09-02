import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, SectionList, TouchableOpacity,
  ActivityIndicator, TextInput, SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Colors, KStyles } from '../../styles/kutties-styles';
import { SHEETS } from '../../utils/constants';
import { studentActivityRepository, studentRepository } from '../../db/repositories';
import { isActivityOverdue } from '../../db/models/studentactivity.model';
import type { StudentActivityModel } from '../../db/models/studentactivity.model';
import { syncSheet } from '../../sync/sync.service';
import StudentActivityRow from './StudentActivityRow';

const PRIMARY = Colors.primary;

interface Props {
  navigation: any;
  route?: {
    params?: {
      studentRegNumber?: string;
      studentName?: string;
      course?: string;
      headerTitle?: string;
    };
  };
}// ── Row discriminated union ───────────────────────────────────────────────────
type StudentSubHeader = { _type: 'student_header'; student: string; studentKey: string; count: number };
type RowItem = StudentActivityModel | StudentSubHeader;

function isSubHeader(item: RowItem): item is StudentSubHeader {
  return (item as any)._type === 'student_header';
}

// ── Section shape (one per course) ───────────────────────────────────────────
interface Section {
  key: string;          // course name
  title: string;        // course display name
  totalCount: number;   // total activities across all students in this course
  data: RowItem[];      // interleaved: sub-header rows + activity rows
}

// ── Build sections: course → student sub-headers + items ─────────────────────
function buildSections(
  items: StudentActivityModel[],
  search: string,
  selectedReviewer: string | null,
  selectedStatus: string | null,
  selectedType: string | null,
  expandedCourses: Set<string>,
  expandedStudents: Set<string>,
  studentNames: Map<string, string>,
): Section[] {
  const q = search.trim().toLowerCase();

  let filtered = q
    ? items.filter((r) =>
        [r.title, r.assignee, r.course, r.category, r.activityType, r.status]
          .some((v) => String(v ?? '').toLowerCase().includes(q)),
      )
    : items;

  if (selectedReviewer) {
    filtered = filtered.filter((r) => (r.reviewer?.trim() ?? '') === selectedReviewer);
  }
  if (selectedStatus) {
    filtered = filtered.filter((r) => r.status === selectedStatus);
  }
  if (selectedType) {
    filtered = filtered.filter((r) => r.activityType === selectedType);
  }

  // course → student → rows
  const courseMap = new Map<string, Map<string, StudentActivityModel[]>>();

  for (const row of filtered) {
    const course  = row.course?.trim()   || '(No Course)';
    const student = row.assignee?.trim() || '(No Student)';

    if (!courseMap.has(course)) courseMap.set(course, new Map());
    const inner = courseMap.get(course)!;
    if (!inner.has(student)) inner.set(student, []);
    inner.get(student)!.push(row);
  }

  const hasSearch = q.length > 0;
  const sections: Section[] = [];

  for (const course of [...courseMap.keys()].sort()) {
    const inner       = courseMap.get(course)!;
    const totalCount  = [...inner.values()].reduce((n, arr) => n + arr.length, 0);
    const isExpanded  = hasSearch || expandedCourses.has(course);

    let data: RowItem[];
    if (!isExpanded) {
      data = [];
    } else {
      data = [];
      for (const student of [...inner.keys()].sort()) {
        const rows = inner.get(student)!;
        const displayName = studentNames.get(student.toLowerCase()) ?? student;
        const studentKey  = `${course}::${student}`;
        const studentOpen = hasSearch || expandedStudents.has(studentKey);
        data.push({ _type: 'student_header', student: displayName, studentKey, count: rows.length } satisfies StudentSubHeader);
        if (studentOpen) data.push(...rows);
      }
    }

    sections.push({ key: course, title: course, totalCount, data });
  }

  return sections;
}

export default function StudentActivityList({ navigation, route }: Props) {
  const params          = route?.params ?? {};
  const prefilledReg    = params.studentRegNumber;
  const prefilledCourse = params.course;
  const headerTitle     = params.headerTitle ?? 'Activities';

  const [items,             setItems]             = useState<StudentActivityModel[]>([]);
  const [studentNames,      setStudentNames]      = useState<Map<string, string>>(new Map());
  const [loading,           setLoading]           = useState(true);
  const [syncing,           setSyncing]           = useState(false);
  const [search,            setSearch]            = useState('');
  const [selectedReviewer,  setSelectedReviewer]  = useState<string | null>(null);
  const [selectedStatus,    setSelectedStatus]    = useState<string | null>(null);
  const [selectedType,      setSelectedType]      = useState<string | null>(null);
  // Set of course keys that are currently EXPANDED (all start collapsed)
  const [expandedCourses,   setExpandedCourses]   = useState<Set<string>>(new Set());
  const [expandedStudents,  setExpandedStudents]  = useState<Set<string>>(new Set());

  // ── Load ──────────────────────────────────────────────────────────────────
  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const [activityRows, allStudents] = await Promise.all([
        studentActivityRepository.findAll(),
        studentRepository.findAll(),
      ]);
      // regNumber (lowercase) → fullName lookup
      const nameMap = new Map<string, string>();
      for (const s of allStudents) {
        if (s.regNumber) nameMap.set(s.regNumber.toLowerCase(), s.fullName ?? s.regNumber);
      }
      setStudentNames(nameMap);

      let rows = activityRows.map((r) => ({
        ...r,
        isOverdue: r.status !== 'closed' ? isActivityOverdue(r) : r.isOverdue,
      }));
      if (prefilledReg)    rows = rows.filter((r) => r.assignee?.toLowerCase() === prefilledReg.toLowerCase());
      if (prefilledCourse) rows = rows.filter((r) => r.course?.toLowerCase()   === prefilledCourse.toLowerCase());
      setItems(rows);
      // When scoped to a single student/course, auto-expand all courses so rows are visible
      if (prefilledReg || prefilledCourse) {
        const courseKeys = new Set(rows.map((r) => r.course?.trim() || '(No Course)'));
        setExpandedCourses(courseKeys);
        setExpandedStudents(new Set(rows.map((r) => `${r.course?.trim() || '(No Course)'}::${r.assignee?.trim() || '(No Student)'}`)));
      } else {
        setExpandedCourses(new Set());
        setExpandedStudents(new Set());
      }
    } finally {
      setLoading(false);
    }
  }, [prefilledReg, prefilledCourse]);

  // ── Sync ──────────────────────────────────────────────────────────────────
  const sync = useCallback(async () => {
    setSyncing(true);
    try { await syncSheet(SHEETS.STUDENT_ACTIVITY); } finally { setSyncing(false); }
  }, []);

  useFocusEffect(useCallback(() => { loadItems(); }, [loadItems]));

  // ── Build sections ────────────────────────────────────────────────────────
  const sections: Section[] = useMemo(
    () => buildSections(items, search, selectedReviewer, selectedStatus, selectedType, expandedCourses, expandedStudents, studentNames),
    [items, search, selectedReviewer, selectedStatus, selectedType, expandedCourses, expandedStudents, studentNames],
  );

  const toggleCourse = useCallback((course: string) => {
    setExpandedCourses((prev) => {
      if (prev.has(course)) return new Set();
      return new Set([course]);
    });
    // Collapse all student rows when the course collapses
    setExpandedStudents(new Set());
  }, []);

  const toggleStudent = useCallback((studentKey: string) => {
    setExpandedStudents((prev) => {
      const next = new Set(prev);
      if (next.has(studentKey)) next.delete(studentKey);
      else next.add(studentKey);
      return next;
    });
  }, []);

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
        <Text style={KStyles.headerTitle} numberOfLines={1}>{headerTitle}</Text>
        <View style={KStyles.headerActions}>
          <TouchableOpacity
            style={KStyles.headerIcon}
            onPress={() => sync().then(() => loadItems())}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            {syncing
              ? <ActivityIndicator color="#fff" size="small" />
              : <Ionicons name="refresh-outline" size={22} color="#fff" />}
          </TouchableOpacity>
        </View>
      </View>

      {/* Search bar */}
      <View style={KStyles.searchRow}>
        <Ionicons name="search-outline" size={16} color={Colors.muted} style={KStyles.searchIcon} />
        <TextInput
          style={KStyles.searchInput}
          placeholder="Search activities…"
          placeholderTextColor={Colors.muted}
          value={search}
          onChangeText={setSearch}
        />
        {search ? (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={16} color={Colors.muted} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Grouped list */}
      {loading ? (
        <View style={KStyles.center}>
          <ActivityIndicator color={PRIMARY} size="large" />
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(r, i) => {
            if (isSubHeader(r)) return `__sh__${r.student}__${i}`;
            return (r as StudentActivityModel).id;
          }}
          renderSectionHeader={({ section }) => {
            const isExpanded = search.trim().length > 0 || expandedCourses.has(section.key);
            return (
              <TouchableOpacity
                style={styles.courseHeader}
                onPress={() => toggleCourse(section.key)}
                activeOpacity={0.75}
              >
                <View style={styles.courseHeaderLeft}>
                  <Ionicons name="school-outline" size={14} color="#fff" style={{ marginRight: 6 }} />
                  <Text style={styles.courseHeaderText} numberOfLines={1}>
                    {section.title}
                  </Text>
                </View>
                <View style={styles.sectionMeta}>
                  <Text style={styles.courseCount}>{section.totalCount}</Text>
                  <Ionicons
                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                    size={14}
                    color="#fff"
                  />
                </View>
              </TouchableOpacity>
            );
          }}
          renderItem={({ item }) => {
            // Student sub-header row — skip when scoped to a single student
            if (isSubHeader(item)) {
              if (prefilledReg) return null;
              const isStudentOpen = search.trim().length > 0 || expandedStudents.has(item.studentKey);
              return (
                <TouchableOpacity
                  style={styles.studentHeader}
                  onPress={() => toggleStudent(item.studentKey)}
                  activeOpacity={0.75}
                >
                  <Ionicons name="person-outline" size={12} color={PRIMARY} style={{ marginRight: 5 }} />
                  <Text style={styles.studentHeaderText} numberOfLines={1}>
                    {item.student}
                  </Text>
                  <Text style={styles.studentCount}>{item.count}</Text>
                  <Ionicons
                    name={isStudentOpen ? 'chevron-up' : 'chevron-down'}
                    size={12}
                    color={PRIMARY}
                    style={{ marginLeft: 4 }}
                  />
                </TouchableOpacity>
              );
            }

            // Activity row
            const activity = item as StudentActivityModel;
            return (
              <StudentActivityRow
                item={activity}
                onPress={() => navigation.navigate('StudentActivityDetails', { item: activity })}
                selectedReviewer={selectedReviewer}
                onReviewerPress={(r) => setSelectedReviewer((prev) => (prev === r ? null : r))}
                selectedStatus={selectedStatus}
                onStatusPress={(s) => setSelectedStatus((prev) => (prev === s ? null : s))}
                selectedType={selectedType}
                onTypePress={(t) => setSelectedType((prev) => (prev === t ? null : t))}
              />
            );
          }}
          ListEmptyComponent={
            <View style={[KStyles.center, { paddingTop: 60 }]}>
              <Ionicons name="document-text-outline" size={48} color="#DDD" />
              <Text style={[KStyles.emptyText, { marginTop: 12 }]}>No activities found</Text>
            </View>
          }
          stickySectionHeadersEnabled
          contentContainerStyle={{ flexGrow: 1 }}
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={KStyles.fab}
        activeOpacity={0.85}
        onPress={() =>
          navigation.navigate('StudentActivityForm', {
            mode: 'add',
            prefilledRegNumber: prefilledReg,
            prefilledCourse,
          })
        }
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // ── Course header (sticky, bold, colored) ──────────────────────────────────
  courseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: PRIMARY,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  courseHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  courseHeaderText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  courseCount: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
    marginRight: 4,
  },
  sectionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },

  // ── Student sub-header (indented, lighter) ─────────────────────────────────
  studentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    paddingHorizontal: 20,
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: '#E8EAF0',
  },
  studentHeaderText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: PRIMARY,
    letterSpacing: 0.2,
  },
  studentCount: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.muted,
    marginLeft: 6,
  },
});
