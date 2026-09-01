import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  View, TextInput, StyleSheet, Text,
  SafeAreaView, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useSheet } from '../../hooks/useSheet';
import { teacherAttendanceLogRepository, teacherRepository, employeeRepository } from '../../db/repositories';
import type { TeacherAttendanceLogModel } from '../../db/models/teacherattendancelog.model';
import TeacherAttendanceGrid from './TeacherAttendanceGrid';
import { Colors, KStyles } from '../../styles/kutties-styles';
import { SHEETS } from '../../utils/constants';

const PRIMARY = Colors.primary;

type Tab = 'date' | 'teacher';
type LeaveFilter = 'all' | 'present' | 'absent';

interface Props {
  navigation: any;
  route?: { params?: { teacherEmail?: string; teacherName?: string; headerTitle?: string; staffMode?: boolean; leaveMode?: boolean } };
}

/** "dd/MMM/yyyy" or ISO date → "Month YYYY" for grouping */
function toMonthYear(dateStr?: string): string {
  if (!dateStr) return 'Unknown';
  // Handle dd/MMM/yyyy from normaliseDate
  const dmy = dateStr.match(/^(\d{1,2})\/([A-Za-z]{3})\/(\d{4})$/);
  if (dmy) return `${dmy[2]} ${dmy[3]}`;
  const d = new Date(dateStr);
  if (!isNaN(d.getTime()))
    return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  return dateStr;
}

const MONTHS: Record<string, number> = {
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
  Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
};

/** Sort key for "MMM YYYY" sections: latest first (negative = earlier in sort) */
function monthYearSortKey(label: string): number {
  // label is "Jun 2025" from toMonthYear()
  const m = label.match(/^([A-Za-z]{3})\s+(\d{4})$/);
  if (!m) return 0;
  const month = MONTHS[m[1]] ?? 0;
  const year  = parseInt(m[2], 10);
  return -(year * 12 + month);
}

function isPresent(item: TeacherAttendanceLogModel): boolean {
  return (item.leaveOption ?? 'Present').toLowerCase() === 'present';
}

function buildTeacherGridSections(
  items: TeacherAttendanceLogModel[],
  emailToName: Record<string, string>,
  leaveFilter: LeaveFilter,
) {
  const filtered =
    leaveFilter === 'present' ? items.filter(isPresent) :
    leaveFilter === 'absent'  ? items.filter((r) => !isPresent(r)) :
    items;
  const map = new Map<string, TeacherAttendanceLogModel[]>();
  for (const item of filtered) {
    const email = item.teacherEmail?.toLowerCase() ?? '';
    const name  = emailToName[email] ?? item.teacherEmail ?? 'Unknown';
    if (!map.has(name)) map.set(name, []);
    map.get(name)!.push(item);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, rows]) => ({ name, count: rows.length, rows }));
}

function buildDateGridSections(
  items: TeacherAttendanceLogModel[],
  leaveFilter: LeaveFilter,
) {
  const filtered =
    leaveFilter === 'present' ? items.filter(isPresent) :
    leaveFilter === 'absent'  ? items.filter((r) => !isPresent(r)) :
    items;
  const map = new Map<string, TeacherAttendanceLogModel[]>();
  for (const item of filtered) {
    const key = toMonthYear(item.attendanceDate);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  }
  return [...map.entries()]
    .sort(([a], [b]) => monthYearSortKey(a) - monthYearSortKey(b))
    .map(([name, rows]) => ({ name, count: rows.length, rows }));
}

export default function TeacherAttendanceLogList({ navigation, route }: Props) {
  const filterEmail = route?.params?.teacherEmail?.trim();
  const filterName  = route?.params?.teacherName?.trim();
  const staffMode   = route?.params?.staffMode ?? false;
  const leaveMode   = route?.params?.leaveMode ?? false;
  const { syncing, sync } = useSheet(SHEETS.TEACATTELOG);
  const { sync: syncStaff } = useSheet(SHEETS.STAFF);
  const synced = useRef(false);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('date');
  const [items, setItems] = useState<TeacherAttendanceLogModel[]>([]);
  const [emailToName, setEmailToName] = useState<Record<string, string>>({});
  // In leave mode, default the filter to 'absent' so only leaves are shown
  const [leaveFilter, setLeaveFilter] = useState<LeaveFilter>(leaveMode ? 'absent' : 'all');

  const loadItems = useCallback(async () => {
    let base: TeacherAttendanceLogModel[];
    if (filterEmail) {
      base = await teacherAttendanceLogRepository.findByTeacherEmail(filterEmail);
    } else if (filterName) {
      base = await teacherAttendanceLogRepository.findByTeacher(filterName);
    } else {
      base = await teacherAttendanceLogRepository.findAll();
    }

    // In staff mode, keep only attendance records whose email belongs to
    // a non-teacher staff member (designation !== 'Teacher').
    if (staffMode && !filterEmail && !filterName) {
      const staffMap = await employeeRepository.emailToNameMap();
      const staffEmails = new Set(Object.keys(staffMap));
      base = base.filter((r) => staffEmails.has(r.teacherEmail?.toLowerCase() ?? ''));
      setEmailToName(staffMap);
    } else {
      teacherRepository.emailToNameMap().then(setEmailToName);
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      base = base.filter((r) =>
        [r.teacherEmail, r.approved, r.leaveType, r.leaveOption, r.remarks, r.attendanceDate]
          .some((v) => String(v ?? '').toLowerCase().includes(q)),
      );
    }

    setItems(base);
  }, [filterEmail, filterName, staffMode, search]);

  useEffect(() => { loadItems(); }, [loadItems]);

  useFocusEffect(useCallback(() => { loadItems(); }, [loadItems]));

  useEffect(() => {
    if (!synced.current) {
      synced.current = true;
      // In staff mode we need SHEETS.STAFF populated before filtering;
      // sync both sheets in parallel then reload.
      const syncs = staffMode
        ? Promise.all([sync(), syncStaff()])
        : sync();
      syncs.then(() => loadItems());
    }
  }, []);

  const canGoBack = navigation.canGoBack();

  const personLabel = staffMode ? 'Employee' : 'Teacher';

  const resolvedFilterName = filterName
    ?? (filterEmail ? (emailToName[filterEmail.toLowerCase()] ?? filterEmail) : undefined)
    ?? '';
  const defaultTitle = leaveMode
    ? 'Staff Leave'
    : staffMode ? 'Employee Attendance' : 'Teacher Attendance';
  const headerTitle = resolvedFilterName
    ? `${resolvedFilterName}'s Attendance`
    : (route?.params?.headerTitle ?? defaultTitle);

  const handleTabChange = useCallback((tab: Tab) => {
    setActiveTab(tab);
  }, []);

  const teacherGridSections = useMemo(
    () => activeTab === 'teacher'
      ? buildTeacherGridSections(items, emailToName, leaveFilter)
      : [],
    [activeTab, items, emailToName, leaveFilter],
  );

  const dateGridSections = useMemo(
    () => activeTab === 'date'
      ? buildDateGridSections(items, leaveFilter)
      : [],
    [activeTab, items, leaveFilter],
  );

  const isEmpty = items.length === 0;

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
          <Ionicons name="calendar" size={24} color="#fff" />
        )}
        <Text style={KStyles.headerTitle}>{headerTitle}</Text>
        <TouchableOpacity onPress={() => sync()} style={KStyles.headerIcon}>
          {syncing
            ? <ActivityIndicator size="small" color="#fff" />
            : <Ionicons name="refresh" size={22} color="#fff" />}
        </TouchableOpacity>
      </View>

      {/* Tab bar — hidden in leave mode */}
      {!leaveMode && (
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'date' && styles.tabActive]}
            onPress={() => handleTabChange('date')}
            activeOpacity={0.8}
          >
            <Ionicons
              name="calendar-outline"
              size={15}
              color={activeTab === 'date' ? PRIMARY : Colors.muted}
              style={{ marginRight: 5 }}
            />
            <Text style={[styles.tabText, activeTab === 'date' && styles.tabTextActive]}>
              By Date
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'teacher' && styles.tabActive]}
            onPress={() => handleTabChange('teacher')}
            activeOpacity={0.8}
          >
            <Ionicons
              name="person-outline"
              size={15}
              color={activeTab === 'teacher' ? PRIMARY : Colors.muted}
              style={{ marginRight: 5 }}
            />
            <Text style={[styles.tabText, activeTab === 'teacher' && styles.tabTextActive]}>
              By {personLabel}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Leave filter pills */}
      <View style={styles.filterRow}>
        {(['all', 'present', 'absent'] as LeaveFilter[]).map((f) => {
          const label = f === 'all' ? 'All' : f === 'present' ? '✓ Present' : '✗ Absent';
          const active = leaveFilter === f;
          return (
            <TouchableOpacity
              key={f}
              style={[styles.filterPill, active && styles.filterPillActive]}
              onPress={() => setLeaveFilter(f)}
              activeOpacity={0.75}
            >
              <Text style={[styles.filterPillText, active && styles.filterPillTextActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Search bar */}
      <View style={KStyles.searchRow}>
        <Ionicons name="search" size={18} color="#999" style={KStyles.searchIcon} />
        <TextInput
          style={KStyles.searchInput}
          placeholder={`Search by ${personLabel.toLowerCase()}, status…`}
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
          <Ionicons name="calendar-outline" size={48} color="#ccc" />
          <Text style={KStyles.emptyText}>No attendance records found</Text>
        </View>
      ) : (leaveMode || activeTab === 'date') ? (
        <TeacherAttendanceGrid
          sections={dateGridSections}
          mode="date"
          emailToName={emailToName}
          onRowPress={(r) => navigation.navigate('TeacherAttendanceLogDetails', { item: r })}
          personLabel={personLabel}
        />
      ) : (
        <TeacherAttendanceGrid
          sections={teacherGridSections}
          mode="teacher"
          emailToName={emailToName}
          onRowPress={(r) => navigation.navigate('TeacherAttendanceLogDetails', { item: r })}
          personLabel={personLabel}
        />
      )}

      {/* FAB — hidden in leave-mode (read-only leave list) */}
      {!leaveMode && (
        <TouchableOpacity
          style={KStyles.fab}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('TeacherAttendanceLogForm', { mode: 'add', staffMode })}
        >
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: PRIMARY,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.muted,
  },
  tabTextActive: {
    color: PRIMARY,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  filterPillActive: {
    backgroundColor: PRIMARY,
    borderColor: PRIMARY,
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.muted,
  },
  filterPillTextActive: {
    color: '#fff',
  },
  center: { ...KStyles.center, gap: 12, paddingTop: 80 },
});
