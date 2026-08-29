import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, ScrollView,
  SafeAreaView, TouchableOpacity, ActivityIndicator, Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useSheet } from '../../hooks/useSheet';
import { courseTimeTableRepository } from '../../db/repositories';
import type { CourseTimeTableModel } from '../../db/models/coursetimetable.model';
import { Colors, KStyles } from '../../styles/kutties-styles';

const PRIMARY = Colors.primary;

// ── Column definitions ────────────────────────────────────────────────────────
const COLS = [
  { key: 'day',            label: 'Day',     flex: 1.0 },
  { key: 'courseDivision', label: 'Course',  flex: 1.1 },
  { key: 'subject',        label: 'Subject', flex: 1.4 },
  { key: 'teacher',        label: 'Teacher', flex: 1.3 },
  { key: 'startTime',      label: 'Time',    flex: 0.9 },
] as const;

// ── Filter chip ───────────────────────────────────────────────────────────────
function FilterChip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <View style={styles.chip}>
      <Text style={styles.chipText} numberOfLines={1}>{label}</Text>
      <TouchableOpacity onPress={onClear} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
        <Ionicons name="close-circle" size={15} color={PRIMARY} />
      </TouchableOpacity>
    </View>
  );
}

// ── Grid header ───────────────────────────────────────────────────────────────
function GridHeader({ hidden }: { hidden: Set<string> }) {
  return (
    <View style={styles.gridHeader}>
      {COLS.filter((c) => !hidden.has(c.key)).map((c) => (
        <Text key={c.key} style={[styles.gridHeaderCell, { flex: c.flex }]} numberOfLines={1}>
          {c.label}
        </Text>
      ))}
    </View>
  );
}

// ── Grid row ──────────────────────────────────────────────────────────────────
interface GridRowProps {
  item: CourseTimeTableModel;
  hidden: Set<string>;
  onPress: (item: CourseTimeTableModel) => void;
  onFilterDay:     (day: string) => void;
  onFilterCourse:  (course: string) => void;
  onFilterSubject: (subject: string) => void;
  onFilterTeacher: (teacher: string) => void;
  activeDay:     string;
  activeCourse:  string;
  activeSubject: string;
  activeTeacher: string;
}

function GridRow({
  item, hidden, onPress,
  onFilterDay, onFilterCourse, onFilterSubject, onFilterTeacher,
  activeDay, activeCourse, activeSubject, activeTeacher,
}: GridRowProps) {
  const shortTeacher = item.teacher ? item.teacher.split('@')[0] : '—';

  const timeLabel = item.startTime && item.endTime
    ? `${item.startTime}–${item.endTime}`
    : item.startTime ?? '—';

  const dayHighlighted     = activeDay     === item.day;
  const courseHighlighted  = activeCourse  === item.courseDivision;
  const subjectHighlighted = activeSubject === item.subject;
  const teacherHighlighted = activeTeacher === item.teacher;

  return (
    <Pressable
      onPress={() => onPress(item)}
      android_ripple={{ color: 'rgba(194,24,91,0.08)' }}
      style={({ pressed }) => [styles.gridRow, pressed && styles.gridRowPressed]}
    >
      {/* Day — tappable to filter */}
      {!hidden.has('day') && (
        <View style={{ flex: COLS[0].flex }}>
          <TouchableOpacity onPress={() => onFilterDay(item.day)} activeOpacity={0.7}>
            <Text style={[styles.dayChip, dayHighlighted && styles.chipActive]} numberOfLines={1}>
              {item.day || '—'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Course — tappable to filter */}
      {!hidden.has('courseDivision') && (
        <View style={{ flex: COLS[1].flex }}>
          <TouchableOpacity onPress={() => onFilterCourse(item.courseDivision)} activeOpacity={0.7}>
            <Text style={[styles.courseChip, courseHighlighted && styles.chipActive]} numberOfLines={1}>
              {item.courseDivision || '—'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Subject — tappable to filter */}
      {!hidden.has('subject') && (
        <View style={{ flex: COLS[2].flex }}>
          <TouchableOpacity onPress={() => onFilterSubject(item.subject)} activeOpacity={0.7}>
            <Text style={[styles.subjectChip, subjectHighlighted && styles.chipActive]} numberOfLines={2}>
              {item.subject || '—'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Teacher — tappable to filter */}
      {!hidden.has('teacher') && (
        <View style={{ flex: COLS[3].flex }}>
          <TouchableOpacity onPress={() => onFilterTeacher(item.teacher)} activeOpacity={0.7}>
            <Text style={[styles.teacherChip, teacherHighlighted && styles.chipActive]} numberOfLines={2}>
              {shortTeacher}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Time — always visible */}
      <View style={{ flex: COLS[4].flex, alignItems: 'center' }}>
        <Text style={styles.timeText} numberOfLines={2}>{timeLabel}</Text>
      </View>
    </Pressable>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
interface Props {
  navigation: any;
  route?: { params?: { initialCourse?: string } };
}

export default function CourseTimeTableList({ navigation, route }: Props) {
  const { syncing, sync } = useSheet('coursetimetbl');
  const synced = useRef(false);
  const [all, setAll] = useState<CourseTimeTableModel[]>([]);
  const [filterDay,     setFilterDay]     = useState('');
  const [filterCourse,  setFilterCourse]  = useState(route?.params?.initialCourse ?? '');
  const [filterSubject, setFilterSubject] = useState('');
  const [filterTeacher, setFilterTeacher] = useState('');

  const load = useCallback(async () => {
    const results = await courseTimeTableRepository.findAll();
    setAll(
      results.sort((a, b) => {
        const dayCmp = String(a.day ?? '').localeCompare(String(b.day ?? ''));
        if (dayCmp !== 0) return dayCmp;
        return String(a.startTime ?? '').localeCompare(String(b.startTime ?? ''));
      }),
    );
  }, []);

  useEffect(() => { load(); }, [load]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  useEffect(() => {
    if (!synced.current) {
      synced.current = true;
      sync().then(() => load());
    }
  }, []);

  // Apply active filters
  const entries = useMemo(() => {
    let list = all;
    if (filterDay)     list = list.filter((r) => r.day             === filterDay);
    if (filterCourse)  list = list.filter((r) => r.courseDivision  === filterCourse);
    if (filterSubject) list = list.filter((r) => r.subject         === filterSubject);
    if (filterTeacher) list = list.filter((r) => r.teacher         === filterTeacher);
    return list;
  }, [all, filterDay, filterCourse, filterSubject, filterTeacher]);

  const clearAll = useCallback(() => {
    setFilterDay(''); setFilterCourse(''); setFilterSubject(''); setFilterTeacher('');
  }, []);

  const handleFilterDay     = useCallback((v: string) => setFilterDay    ((p) => p === v ? '' : v), []);
  const handleFilterCourse  = useCallback((v: string) => setFilterCourse ((p) => p === v ? '' : v), []);
  const handleFilterSubject = useCallback((v: string) => setFilterSubject((p) => p === v ? '' : v), []);
  const handleFilterTeacher = useCallback((v: string) => setFilterTeacher((p) => p === v ? '' : v), []);

  const handlePress = useCallback((item: CourseTimeTableModel) => {
    navigation.navigate('CourseTimeTableDetails', { item });
  }, [navigation]);

  const hasFilters = filterDay || filterCourse || filterSubject || filterTeacher;

  // Columns that are actively filtered are hidden from the grid
  const hiddenCols = useMemo(() => {
    const s = new Set<string>();
    if (filterDay)     s.add('day');
    if (filterCourse)  s.add('courseDivision');
    if (filterSubject) s.add('subject');
    if (filterTeacher) s.add('teacher');
    return s;
  }, [filterDay, filterCourse, filterSubject, filterTeacher]);
  const isEmpty = entries.length === 0;

  return (
    <SafeAreaView style={KStyles.listRoot}>
      {/* Header */}
      <View style={KStyles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={KStyles.headerTitle}>Time Table</Text>
        <TouchableOpacity onPress={() => sync()} style={KStyles.headerIcon}>
          {syncing
            ? <ActivityIndicator size="small" color="#fff" />
            : <Ionicons name="refresh" size={22} color="#fff" />}
        </TouchableOpacity>
      </View>

      {/* Active filter chips */}
      {hasFilters ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterBar}
          contentContainerStyle={styles.filterBarContent}
        >
          {filterDay     ? <FilterChip label={`Day: ${filterDay}`}                      onClear={() => setFilterDay('')}     /> : null}
          {filterCourse  ? <FilterChip label={`Course: ${filterCourse}`}                onClear={() => setFilterCourse('')}  /> : null}
          {filterSubject ? <FilterChip label={`Subject: ${filterSubject}`}              onClear={() => setFilterSubject('')} /> : null}
          {filterTeacher ? <FilterChip label={`Teacher: ${filterTeacher.split('@')[0]}`} onClear={() => setFilterTeacher('')} /> : null}
          <TouchableOpacity onPress={clearAll}>
            <Text style={styles.clearAll}>Clear all</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : null}

      {/* Grid */}
      {isEmpty && syncing ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={PRIMARY} />
        </View>
      ) : isEmpty ? (
        <View style={styles.center}>
          <Ionicons name="calendar-outline" size={48} color="#ccc" />
          <Text style={KStyles.emptyText}>
            {hasFilters ? 'No entries match the filter' : 'No timetable entries found'}
          </Text>
          {hasFilters ? (
            <TouchableOpacity onPress={clearAll}>
              <Text style={styles.clearAll}>Clear filters</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(e) => e.id}
          ListHeaderComponent={<GridHeader hidden={hiddenCols} />}
          stickyHeaderIndices={[0]}
          renderItem={({ item }) => (
            <GridRow
              item={item}
              hidden={hiddenCols}
              onPress={handlePress}
              onFilterDay={handleFilterDay}
              onFilterCourse={handleFilterCourse}
              onFilterSubject={handleFilterSubject}
              onFilterTeacher={handleFilterTeacher}
              activeDay={filterDay}
              activeCourse={filterCourse}
              activeSubject={filterSubject}
              activeTeacher={filterTeacher}
            />
          )}
          contentContainerStyle={{ paddingBottom: 80 }}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={KStyles.fab}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('CourseTimeTableForm', { mode: 'add' })}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: { ...KStyles.center, gap: 12, paddingTop: 80 },

  // ── Filter bar ──────────────────────────────────────────────────────────────
  filterBar: {
    backgroundColor: Colors.surface,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
    maxHeight: 44,
  },
  filterBarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 8,
    paddingVertical: 6,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.lightPink,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 5,
    maxWidth: 180,
  },
  chipText: { fontSize: 12, color: PRIMARY, fontWeight: '600', flexShrink: 1 },
  clearAll:  { fontSize: 12, color: PRIMARY, fontWeight: '600', textDecorationLine: 'underline', paddingHorizontal: 4 },

  // ── Grid header ─────────────────────────────────────────────────────────────
  gridHeader: {
    flexDirection: 'row',
    backgroundColor: PRIMARY,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 4,
  },
  gridHeaderCell: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },

  // ── Grid row ────────────────────────────────────────────────────────────────
  gridRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: Colors.surface,
    gap: 4,
    minHeight: 48,
  },
  gridRowPressed: { backgroundColor: '#F5F5F5' },
  separator: { height: 0.5, backgroundColor: Colors.border },

  cellText: { fontSize: 13, color: '#1A1A1A' },

  // ── Tappable filter chips in grid cells ──────────────────────────────────
  dayChip: {
    fontSize: 12,
    color: '#1A1A1A',
    fontWeight: '600',
    backgroundColor: '#F0F0F0',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
    alignSelf: 'flex-start',
    overflow: 'hidden',
  },
  courseChip: {
    fontSize: 11,
    color: '#1565C0',
    fontWeight: '600',
    backgroundColor: '#E3F2FD',
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 3,
    alignSelf: 'flex-start',
    overflow: 'hidden',
  },
  subjectChip: {
    fontSize: 12,
    color: '#2E7D32',
    fontWeight: '500',
    backgroundColor: '#F1F8E9',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
    alignSelf: 'flex-start',
    overflow: 'hidden',
  },
  teacherChip: {
    fontSize: 12,
    color: PRIMARY,
    fontWeight: '600',
    backgroundColor: Colors.lightPink,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
    alignSelf: 'flex-start',
    overflow: 'hidden',
  },
  chipActive: {
    borderWidth: 1.5,
    borderColor: PRIMARY,
  },
  timeText: {
    fontSize: 11,
    color: '#555',
    textAlign: 'center',
  },
});
