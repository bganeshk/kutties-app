import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator, SafeAreaView, StyleSheet, Text,
  TouchableOpacity, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { courseTimeTableRepository, teacherRepository } from '../db/repositories';
import type { CourseTimeTableModel } from '../db/models/coursetimetable.model';
import type { TeacherModel } from '../db/models/teacher.model';
import { useSheet } from '../hooks/useSheet';
import GroupedList, { type GroupLevel } from '../components/shared/GroupedList';
import { Colors, KStyles } from '../styles/kutties-styles';
import { SHEETS } from '../utils/constants';

const PRIMARY = Colors.primary;

// ── Day ordering ──────────────────────────────────────────────────────────────
const DAY_ORDER: Record<string, number> = {
  Monday: 0, Tuesday: 1, Wednesday: 2,
  Thursday: 3, Friday: 4, Saturday: 5, Sunday: 6,
};

function daySort(a: string, b: string): number {
  const oa = DAY_ORDER[a] ?? 99;
  const ob = DAY_ORDER[b] ?? 99;
  return oa !== ob ? oa - ob : a.localeCompare(b);
}

// ── Timetable slot row ────────────────────────────────────────────────────────
// ── Column header (rendered once above the list via ListHeaderComponent) ─────
export function SlotHeader() {
  return (
    <View style={styles.slotHeader}>
      <Text style={[styles.slotHeaderCell, { flex: 1.4 }]}>Subject</Text>
      <Text style={[styles.slotHeaderCell, { flex: 1.1 }]}>Course</Text>
      <Text style={[styles.slotHeaderCell, { flex: 0.8, textAlign: 'right' }]}>Start</Text>
      <Text style={[styles.slotHeaderCell, { flex: 0.8, textAlign: 'right' }]}>End</Text>
    </View>
  );
}

function SlotRow({ item }: { item: CourseTimeTableModel }) {
  return (
    <View style={styles.slotRow}>
      {/* Subject */}
      <Text style={[styles.colSubject, { flex: 1.4 }]} numberOfLines={2}>
        {item.subject || '—'}
      </Text>

      {/* Course / Division */}
      <View style={{ flex: 1.1 }}>
        <View style={styles.courseChip}>
          <Text style={styles.courseChipText} numberOfLines={1}>
            {item.courseDivision || '—'}
          </Text>
        </View>
      </View>

      {/* Start time */}
      <Text style={[styles.colTime, { flex: 0.8, textAlign: 'right' }]} numberOfLines={1}>
        {item.startTime ?? '—'}
      </Text>

      {/* End time */}
      <Text style={[styles.colTime, { flex: 0.8, textAlign: 'right' }]} numberOfLines={1}>
        {item.endTime ?? '—'}
      </Text>
    </View>
  );
}

// ── Day order-preserving group key: prefix with index so GroupedList sorts correctly
// GroupedList sorts by key alphabetically, so we prefix day with zero-padded index.
function dayKey(day: string): string {
  const idx = DAY_ORDER[day] ?? 99;
  return `${String(idx).padStart(2, '0')}_${day}`;
}

function dayLabel(key: string): string {
  // strip the "00_" prefix
  return key.replace(/^\d+_/, '');
}

// ── Teacher display name lookup ───────────────────────────────────────────────
function teacherDisplayName(email: string, map: Map<string, string>): string {
  return map.get(email) ?? email.split('@')[0];
}

// ── Group levels ──────────────────────────────────────────────────────────────
// All-teachers mode: teacher (collapsed) → day (expanded)
function buildAllGroupLevels(teacherMap: Map<string, string>): GroupLevel<CourseTimeTableModel>[] {
  return [
    {
      keyOf: (item) => item.teacher,
      label: (key) => teacherDisplayName(key, teacherMap),
      dotColor: PRIMARY,
      bgColor: Colors.lightPink,
      defaultExpanded: false,
    },
    {
      keyOf: (item) => dayKey(item.day),
      label: dayLabel,
      dotColor: '#1565C0',
      bgColor: '#E3F2FD',
      defaultExpanded: true,
    },
  ];
}

// Single-teacher mode: day only (all expanded)
const DAY_GROUP_LEVELS: GroupLevel<CourseTimeTableModel>[] = [
  {
    keyOf: (item) => dayKey(item.day),
    label: dayLabel,
    dotColor: '#1565C0',
    bgColor: '#E3F2FD',
    defaultExpanded: true,
  },
];

// ── Screen ────────────────────────────────────────────────────────────────────
interface Props {
  navigation: any;
  route?: { params?: { teacherEmail?: string; teacherName?: string } };
}

export default function TeacherScheduleScreen({ navigation, route }: Props) {
  const teacherEmail = route?.params?.teacherEmail?.trim();
  const teacherName  = route?.params?.teacherName?.trim();

  const { syncing, sync } = useSheet(SHEETS.COURSE_TIMETABLE);
  const synced = useRef(false);

  const [all, setAll]               = useState<CourseTimeTableModel[]>([]);
  const [teacherMap, setTeacherMap] = useState<Map<string, string>>(new Map());
  const [loading, setLoading]       = useState(true);

  // Load timetable + teachers
  const load = useCallback(async () => {
    const [entries, teachers] = await Promise.all([
      courseTimeTableRepository.findAll(),
      teacherRepository.findAll(),
    ]);

    // Build email → name map
    const map = new Map<string, string>();
    teachers.forEach((t: TeacherModel) => {
      if (t.email && t.name) map.set(t.email.trim(), t.name.trim());
    });
    setTeacherMap(map);

    // Filter to single teacher when a param is supplied
    const filtered = teacherEmail
      ? entries.filter((e) => e.teacher.trim() === teacherEmail)
      : entries;

    // Sort: teacher → day order → start time
    filtered.sort((a, b) => {
      const tc = a.teacher.localeCompare(b.teacher);
      if (tc !== 0) return tc;
      const dc = daySort(a.day, b.day);
      if (dc !== 0) return dc;
      return String(a.startTime ?? '').localeCompare(String(b.startTime ?? ''));
    });
    setAll(filtered);
    setLoading(false);
  }, [teacherEmail]);

  useEffect(() => { load(); }, [load]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  // One-time sync on first mount
  useEffect(() => {
    if (!synced.current) {
      synced.current = true;
      sync().then(() => load());
    }
  }, []);

  const groupLevels = useMemo(
    () => teacherEmail ? DAY_GROUP_LEVELS : buildAllGroupLevels(teacherMap),
    [teacherEmail, teacherMap],
  );

  const renderItem = useCallback(
    (item: CourseTimeTableModel) => <SlotRow item={item} />,
    [],
  );

  const isEmpty = !loading && all.length === 0;

  // Header title: teacher name when scoped, generic otherwise
  const headerTitle = teacherName
    ? `${teacherName}'s Schedule`
    : teacherEmail
      ? `${teacherEmail.split('@')[0]}'s Schedule`
      : 'Teacher Schedule';

  // Summary line
  const summaryLine = teacherEmail
    ? `${all.length} slot${all.length !== 1 ? 's' : ''}`
    : `${new Set(all.map((r) => r.teacher)).size} teachers · ${all.length} slots`;

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
        <TouchableOpacity
          style={KStyles.headerIcon}
          onPress={() => sync().then(() => load())}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          {syncing
            ? <ActivityIndicator size="small" color="#fff" />
            : <Ionicons name="refresh" size={22} color="#fff" />}
        </TouchableOpacity>
      </View>

      {/* Count summary */}
      {all.length > 0 ? (
        <View style={styles.summaryBar}>
          <Ionicons name="person-outline" size={13} color={PRIMARY} />
          <Text style={styles.summaryText}>{summaryLine}</Text>
        </View>
      ) : null}

      {/* Body */}
      {loading ? (
        <View style={KStyles.center}>
          <ActivityIndicator size="large" color={PRIMARY} />
        </View>
      ) : isEmpty ? (
        <View style={styles.empty}>
          <Ionicons name="calendar-outline" size={52} color="#ccc" />
          <Text style={KStyles.emptyText}>No schedule entries found</Text>
          <TouchableOpacity
            style={styles.syncBtn}
            onPress={() => sync().then(() => load())}
          >
            <Text style={styles.syncBtnText}>Sync now</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <SlotHeader />
          <GroupedList
            data={all}
            groupBy={groupLevels}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={{ paddingBottom: 80 }}
          />
        </View>
      )}
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  summaryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
  },
  summaryText: { fontSize: 12, color: Colors.muted, fontWeight: '600' },

  // ── Slot column header ───────────────────────────────────────────────────────
  slotHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 28,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 8,
  },
  slotHeaderCell: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // ── Slot row ────────────────────────────────────────────────────────────────
  slotRow: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 28,
    paddingVertical: 9,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  colSubject: { fontSize: 13, fontWeight: '600', color: '#1A1A1A' },
  colTime:    { fontSize: 12, color: '#1565C0', fontWeight: '600' },
  courseChip: {
    alignSelf: 'flex-start',
    backgroundColor: '#F1F8E9',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  courseChipText: { fontSize: 11, color: '#2E7D32', fontWeight: '600' },

  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  syncBtn: {
    marginTop: 4,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: PRIMARY,
  },
  syncBtnText: { fontSize: 13, color: PRIMARY, fontWeight: '600' },
});
