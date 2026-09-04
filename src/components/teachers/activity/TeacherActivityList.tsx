import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, SectionList, TouchableOpacity,
  ActivityIndicator, TextInput, SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useSheet } from '../../../hooks/useSheet';
import { Colors, KStyles } from '../../../styles/kutties-styles';
import { SHEETS } from '../../../utils/constants';
import { teacherActivityRepository, teacherRepository } from '../../../db/repositories';
import type { TeacherActivityModel } from '../../../db/models/teacheractivity.model';
import TeacherActivityRow from './TeacherActivityRow';

const PRIMARY = Colors.primary;

interface Props {
  navigation: any;
  route?: {
    params?: {
      teacherEmail?: string;
      course?: string;
      headerTitle?: string;
    };
  };
}

// ── Row discriminated union ───────────────────────────────────────────────────
type TeacherSubHeader = { _type: 'teacher_header'; teacher: string; teacherKey: string; count: number };
type RowItem = TeacherActivityModel | TeacherSubHeader;

function isSubHeader(item: RowItem): item is TeacherSubHeader {
  return (item as any)._type === 'teacher_header';
}

// ── Section shape (one per course) ───────────────────────────────────────────
interface Section {
  key: string;
  title: string;
  totalCount: number;
  data: RowItem[];
}

// ── Build sections: course → teacher sub-headers + items ─────────────────────
function buildSections(
  items: TeacherActivityModel[],
  search: string,
  selectedReviewer: string | null,
  selectedStatus: string | null,
  selectedType: string | null,
  expandedCourses: Set<string>,
  expandedTeachers: Set<string>,
  teacherNames: Map<string, string>,
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

  // course → teacher → rows
  const courseMap = new Map<string, Map<string, TeacherActivityModel[]>>();
  for (const row of filtered) {
    const course  = row.course?.trim()   || '(No Course)';
    const teacher = row.assignee?.trim() || '(No Teacher)';
    if (!courseMap.has(course)) courseMap.set(course, new Map());
    const inner = courseMap.get(course)!;
    if (!inner.has(teacher)) inner.set(teacher, []);
    inner.get(teacher)!.push(row);
  }

  const hasSearch = q.length > 0;
  const sections: Section[] = [];

  for (const course of [...courseMap.keys()].sort()) {
    const inner      = courseMap.get(course)!;
    const totalCount = [...inner.values()].reduce((n, arr) => n + arr.length, 0);
    const isExpanded = hasSearch || expandedCourses.has(course);

    let data: RowItem[];
    if (!isExpanded) {
      data = [];
    } else {
      data = [];
      for (const teacher of [...inner.keys()].sort()) {
        const rows        = inner.get(teacher)!;
        const displayName = teacherNames.get(teacher.toLowerCase()) ?? teacher;
        const teacherKey  = `${course}::${teacher}`;
        const teacherOpen = hasSearch || expandedTeachers.has(teacherKey);
        data.push({ _type: 'teacher_header', teacher: displayName, teacherKey, count: rows.length } satisfies TeacherSubHeader);
        if (teacherOpen) data.push(...rows);
      }
    }

    sections.push({ key: course, title: course, totalCount, data });
  }

  return sections;
}

export default function TeacherActivityList({ navigation, route }: Props) {
  const params           = route?.params ?? {};
  const prefilledEmail   = params.teacherEmail;
  const prefilledCourse  = params.course;
  const headerTitle      = params.headerTitle ?? 'Teacher Activities';

  const { syncing, sync: sheetSync } = useSheet(SHEETS.TEACHER_ACTIVITY);
  const synced = useRef(false);
  const [items,            setItems]            = useState<TeacherActivityModel[]>([]);
  const [teacherNames,     setTeacherNames]     = useState<Map<string, string>>(new Map());
  const [loading,          setLoading]          = useState(true);
  const [search,           setSearch]           = useState('');
  const [selectedReviewer, setSelectedReviewer] = useState<string | null>(null);
  const [selectedStatus,   setSelectedStatus]   = useState<string | null>(null);
  const [selectedType,     setSelectedType]     = useState<string | null>(null);
  const [expandedCourses,  setExpandedCourses]  = useState<Set<string>>(new Set());
  const [expandedTeachers, setExpandedTeachers] = useState<Set<string>>(new Set());

  // ── Load ──────────────────────────────────────────────────────────────────
  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const [activityRows, allTeachers] = await Promise.all([
        teacherActivityRepository.findAll(),
        teacherRepository.findAll(),
      ]);
      // email (lowercase) → name lookup
      const nameMap = new Map<string, string>();
      for (const t of allTeachers) {
        if (t.email) nameMap.set(t.email.toLowerCase(), t.name ?? t.email);
      }
      setTeacherNames(nameMap);

      let rows = activityRows;
      if (prefilledEmail)  rows = rows.filter((r) => r.assignee?.toLowerCase() === prefilledEmail.toLowerCase());
      if (prefilledCourse) rows = rows.filter((r) => r.course?.toLowerCase()   === prefilledCourse.toLowerCase());
      setItems(rows);

      if (prefilledEmail || prefilledCourse) {
        const courseKeys = new Set(rows.map((r) => r.course?.trim() || '(No Course)'));
        setExpandedCourses(courseKeys);
        setExpandedTeachers(new Set(rows.map((r) => `${r.course?.trim() || '(No Course)'}::${r.assignee?.trim() || '(No Teacher)'}`)));
      } else {
        setExpandedCourses(new Set());
        setExpandedTeachers(new Set());
      }
    } finally {
      setLoading(false);
    }
  }, [prefilledEmail, prefilledCourse]);

  useFocusEffect(useCallback(() => { loadItems(); }, [loadItems]));

  // ── Auto-sync once on first mount ─────────────────────────────────────────
  useEffect(() => {
    if (!synced.current) {
      synced.current = true;
      sheetSync().then(() => loadItems());
    }
  }, []);

  // ── Build sections ────────────────────────────────────────────────────────
  const sections: Section[] = useMemo(
    () => buildSections(items, search, selectedReviewer, selectedStatus, selectedType, expandedCourses, expandedTeachers, teacherNames),
    [items, search, selectedReviewer, selectedStatus, selectedType, expandedCourses, expandedTeachers, teacherNames],
  );

  const toggleCourse = useCallback((course: string) => {
    setExpandedCourses((prev) => {
      if (prev.has(course)) return new Set();
      return new Set([course]);
    });
    setExpandedTeachers(new Set());
  }, []);

  const toggleTeacher = useCallback((teacherKey: string) => {
    setExpandedTeachers((prev) => {
      const next = new Set(prev);
      if (next.has(teacherKey)) next.delete(teacherKey);
      else next.add(teacherKey);
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
            onPress={() => sheetSync().then(() => loadItems())}
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
            if (isSubHeader(r)) return `__th__${(r as TeacherSubHeader).teacher}__${i}`;
            return (r as TeacherActivityModel).id;
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
            if (isSubHeader(item)) {
              const sub = item as TeacherSubHeader;
              if (prefilledEmail) return null;
              const isTeacherOpen = search.trim().length > 0 || expandedTeachers.has(sub.teacherKey);
              return (
                <TouchableOpacity
                  style={styles.teacherHeader}
                  onPress={() => toggleTeacher(sub.teacherKey)}
                  activeOpacity={0.75}
                >
                  <Ionicons name="person-circle-outline" size={12} color={PRIMARY} style={{ marginRight: 5 }} />
                  <Text style={styles.teacherHeaderText} numberOfLines={1}>
                    {sub.teacher}
                  </Text>
                  <Text style={styles.teacherCount}>{sub.count}</Text>
                  <Ionicons
                    name={isTeacherOpen ? 'chevron-up' : 'chevron-down'}
                    size={12}
                    color={PRIMARY}
                    style={{ marginLeft: 4 }}
                  />
                </TouchableOpacity>
              );
            }

            const activity = item as TeacherActivityModel;
            return (
              <TeacherActivityRow
                item={activity}
                onPress={() => navigation.navigate('TeacherActivityDetails', { item: activity })}
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
          navigation.navigate('TeacherActivityForm', {
            mode: 'add',
            prefilledEmail,
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
  teacherHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    paddingHorizontal: 20,
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: '#E8EAF0',
  },
  teacherHeaderText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: PRIMARY,
    letterSpacing: 0.2,
  },
  teacherCount: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.muted,
    marginLeft: 6,
  },
});
