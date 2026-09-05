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
import { courseActivityRepository } from '../../../db/repositories';
import type { CourseActivityModel } from '../../../db/models/courseactivity.model';
import CourseActivityRow from './CourseActivityRow';

const PRIMARY = Colors.primary;

interface Props {
  navigation: any;
  route?: {
    params?: {
      course?: string;
      scope?: 'course' | 'school';
      headerTitle?: string;
    };
  };
}

// ── Row discriminated union ───────────────────────────────────────────────────
type ScopeSubHeader = { _type: 'scope_header'; label: string; scopeKey: string; count: number };
type RowItem = CourseActivityModel | ScopeSubHeader;

function isSubHeader(item: RowItem): item is ScopeSubHeader {
  return (item as any)._type === 'scope_header';
}

// ── Section shape (one per course / "School") ─────────────────────────────────
interface Section {
  key: string;
  title: string;
  totalCount: number;
  data: RowItem[];
}

// ── Build sections: scope / course → rows ─────────────────────────────────────
function buildSections(
  items: CourseActivityModel[],
  search: string,
  selectedAssignee: string | null,
  selectedStatus: string | null,
  selectedType: string | null,
  expandedSections: Set<string>,
): Section[] {
  const q = search.trim().toLowerCase();

  let filtered = q
    ? items.filter((r) =>
        [r.title, r.assignee, r.course, r.category, r.activityType, r.status, r.scope]
          .some((v) => String(v ?? '').toLowerCase().includes(q)),
      )
    : items;

  if (selectedAssignee) filtered = filtered.filter((r) => (r.assignee?.trim() ?? '') === selectedAssignee);
  if (selectedStatus)   filtered = filtered.filter((r) => r.status === selectedStatus);
  if (selectedType)     filtered = filtered.filter((r) => r.activityType === selectedType);

  // Group: School-wide items first, then by course name
  const sectionMap = new Map<string, CourseActivityModel[]>();
  for (const row of filtered) {
    const key = row.scope === 'school'
      ? '🏫 School'
      : (row.course?.trim() || '(No Course)');
    if (!sectionMap.has(key)) sectionMap.set(key, []);
    sectionMap.get(key)!.push(row);
  }

  const hasSearch = q.length > 0;
  const sections: Section[] = [];

  // School-wide section first, then courses alphabetically
  const keys = [
    ...(['🏫 School'].filter((k) => sectionMap.has(k))),
    ...[...sectionMap.keys()].filter((k) => k !== '🏫 School').sort(),
  ];

  for (const key of keys) {
    const rows = sectionMap.get(key)!;
    const isExpanded = hasSearch || expandedSections.has(key);
    const data: RowItem[] = isExpanded ? rows : [];
    sections.push({ key, title: key, totalCount: rows.length, data });
  }

  return sections;
}

export default function CourseActivityList({ navigation, route }: Props) {
  const params           = route?.params ?? {};
  const prefilledCourse  = params.course;
  const prefilledScope   = params.scope;
  const headerTitle      = params.headerTitle ?? 'Course Activities';

  const { syncing, sync: sheetSync } = useSheet(SHEETS.COURSE_ACTIVITY);
  const synced = useRef(false);
  const [items,            setItems]            = useState<CourseActivityModel[]>([]);
  const [loading,          setLoading]          = useState(true);
  const [search,           setSearch]           = useState('');
  const [selectedAssignee, setSelectedAssignee] = useState<string | null>(null);
  const [selectedStatus,   setSelectedStatus]   = useState<string | null>(null);
  const [selectedType,     setSelectedType]     = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  // ── Load ──────────────────────────────────────────────────────────────────
  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      let rows = await courseActivityRepository.findAll();
      if (prefilledCourse) rows = rows.filter((r) => r.course?.toLowerCase() === prefilledCourse.toLowerCase());
      if (prefilledScope)  rows = rows.filter((r) => r.scope === prefilledScope);
      setItems(rows);

      // Always expand all sections so items are visible immediately
      const keys = new Set(rows.map((r) =>
        r.scope === 'school' ? '🏫 School' : (r.course?.trim() || '(No Course)'),
      ));
      setExpandedSections(keys);
    } finally {
      setLoading(false);
    }
  }, [prefilledCourse, prefilledScope]);

  useFocusEffect(useCallback(() => { loadItems(); }, [loadItems]));

  useEffect(() => {
    if (!synced.current) {
      synced.current = true;
      sheetSync().then(() => loadItems());
    }
  }, []);

  // ── Sections ──────────────────────────────────────────────────────────────
  const sections: Section[] = useMemo(
    () => buildSections(items, search, selectedAssignee, selectedStatus, selectedType, expandedSections),
    [items, search, selectedAssignee, selectedStatus, selectedType, expandedSections],
  );

  const toggleSection = useCallback((key: string) => {
    setExpandedSections((prev) => {
      if (prev.has(key)) return new Set();
      return new Set([key]);
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
            if (isSubHeader(r)) return `__sh__${(r as ScopeSubHeader).scopeKey}__${i}`;
            return (r as CourseActivityModel).id;
          }}
          renderSectionHeader={({ section }) => {
            const isExpanded = search.trim().length > 0 || expandedSections.has(section.key);
            const isSchool = section.key === '🏫 School';
            return (
              <TouchableOpacity
                style={[styles.sectionHeader, isSchool && styles.sectionHeaderSchool]}
                onPress={() => toggleSection(section.key)}
                activeOpacity={0.75}
              >
                <View style={styles.sectionHeaderLeft}>
                  <Ionicons
                    name={isSchool ? 'business-outline' : 'school-outline'}
                    size={14}
                    color="#fff"
                    style={{ marginRight: 6 }}
                  />
                  <Text style={styles.sectionHeaderText} numberOfLines={1}>
                    {section.title}
                  </Text>
                </View>
                <View style={styles.sectionMeta}>
                  <Text style={styles.sectionCount}>{section.totalCount}</Text>
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
            if (isSubHeader(item)) return null;
            const activity = item as CourseActivityModel;
            return (
              <CourseActivityRow
                item={activity}
                onPress={() => navigation.navigate('CourseActivityDetails', { item: activity })}
                selectedAssignee={selectedAssignee}
                onAssigneePress={(a) => setSelectedAssignee((prev) => (prev === a ? null : a))}
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
          navigation.navigate('CourseActivityForm', {
            mode: 'add',
            ...(prefilledCourse ? { prefilledCourse } : {}),
          })
        }
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: PRIMARY,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  sectionHeaderSchool: {
    backgroundColor: PRIMARY,
  },
  sectionHeaderLeft: {
    flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8,
  },
  sectionHeaderText: {
    flex: 1, fontSize: 13, fontWeight: '700', color: '#fff',
    letterSpacing: 0.3, textTransform: 'uppercase',
  },
  sectionCount: {
    fontSize: 11, fontWeight: '600',
    color: 'rgba(255,255,255,0.8)', marginRight: 4,
  },
  sectionMeta: { flexDirection: 'row', alignItems: 'center', gap: 2 },
});
