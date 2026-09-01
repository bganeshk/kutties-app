import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  View, Text, TextInput, StyleSheet, ScrollView, Modal, Pressable as RNPressable,
  SafeAreaView, TouchableOpacity, ActivityIndicator, Pressable, FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useSheet } from '../../hooks/useSheet';
import { studentAttendanceLogRepository, studentRepository } from '../../db/repositories';
import type { StudentAttendanceLogModel } from '../../db/models/studentattendancelog.model';
import type { StudentModel } from '../../db/models/student.model';
import { syncSheet, twoWeeksAgo as getSyncCutoff } from '../../sync/sync.service';
import { Colors, KStyles } from '../../styles/kutties-styles';
import { SHEETS, MONTHS } from '../../utils/constants';
import { formatDisplayDate } from '../../utils/dateUtils';

const PRIMARY = Colors.primary;

type LeaveFilter = 'all' | 'present' | 'absent';

interface StudentSection {
  studentName: string;
  regNumber: string;
  count: number;
  rows: StudentAttendanceLogModel[];
}

interface CourseSection {
  course: string;
  count: number;
  studentSections: StudentSection[];
}

interface DateSection {
  monthLabel: string;
  sortKey: number;
  courseSections: CourseSection[];
}

type RegToStudent = Record<string, StudentModel>;

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

// ── Date helpers ──────────────────────────────────────────────────────────────

/** Parse dd/MMM/yyyy → JS Date (midnight local). Returns null on failure. */
function parseDMY(s?: string): Date | null {
  if (!s) return null;
  const m = s.match(/^(\d{1,2})\/([A-Za-z]{3})\/(\d{4})$/);
  if (!m) return null;
  const month = MONTHS.findIndex((mo) => mo.toLowerCase() === m[2].toLowerCase());
  if (month === -1) return null;
  const d = new Date(Number(m[3]), month, Number(m[1]));
  return isNaN(d.getTime()) ? null : d;
}

/** Returns a Date set to midnight at `daysAgo` days before today. */
function daysAgoDate(daysAgo: number): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - daysAgo);
  return d;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const MONTH_ORDER: Record<string, number> = {
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
  Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
};

function toMonthYear(dateStr?: string): string {
  if (!dateStr) return 'Unknown';
  const dmy = dateStr.match(/^(\d{1,2})\/([A-Za-z]{3})\/(\d{4})$/);
  if (dmy) return `${dmy[2]} ${dmy[3]}`;
  const d = new Date(dateStr);
  if (!isNaN(d.getTime()))
    return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  return dateStr;
}

function monthYearSortKey(label: string): number {
  const m = label.match(/^([A-Za-z]{3,})\s+(\d{4})$/);
  if (!m) return 0;
  const short = m[1].slice(0, 3);
  const month = MONTH_ORDER[short] ?? 0;
  const year  = parseInt(m[2], 10);
  return -(year * 12 + month);
}

/** True if the attendance date is within [startDate, endDate] inclusive. */
function isInDateRange(item: StudentAttendanceLogModel, startDate: Date, endDate: Date): boolean {
  const d = parseDMY(item.attendanceDate);
  if (!d) return false;
  return d >= startDate && d <= endDate;
}

function isPresent(item: StudentAttendanceLogModel): boolean {
  return (item.leaveOption ?? 'Present').toLowerCase() === 'present';
}

function fmtTime(val?: string): string {
  if (!val) return '—';
  return val.replace(/^(\d{1,2}:\d{2}):\d{2}(\s*(AM|PM))$/i, '$1$2').trim();
}

function buildSections(
  items: StudentAttendanceLogModel[],
  regToStudent: RegToStudent,
  leaveFilter: LeaveFilter,
): DateSection[] {
  const filtered =
    leaveFilter === 'present' ? items.filter(isPresent) :
    leaveFilter === 'absent'  ? items.filter((r) => !isPresent(r)) :
    items;

  // Group by month
  const byMonth = new Map<string, StudentAttendanceLogModel[]>();
  for (const item of filtered) {
    const key = toMonthYear(item.attendanceDate);
    if (!byMonth.has(key)) byMonth.set(key, []);
    byMonth.get(key)!.push(item);
  }

  // For each month, group by course then by student
  const sections: DateSection[] = [];
  for (const [monthLabel, monthItems] of byMonth) {
    const byCourse = new Map<string, StudentAttendanceLogModel[]>();
    for (const item of monthItems) {
      const reg     = item.regNumber?.trim().toLowerCase() ?? '';
      const student = regToStudent[reg];
      const course  = student?.course?.trim() || 'Unknown';
      if (!byCourse.has(course)) byCourse.set(course, []);
      byCourse.get(course)!.push(item);
    }
    const courseSections: CourseSection[] = [...byCourse.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([course, courseItems]) => {
        const byStudent = new Map<string, StudentAttendanceLogModel[]>();
        for (const item of courseItems) {
          const reg = item.regNumber?.trim() ?? '';
          if (!byStudent.has(reg)) byStudent.set(reg, []);
          byStudent.get(reg)!.push(item);
        }
        const studentSections: StudentSection[] = [...byStudent.entries()]
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([reg, rows]) => {
            const s = regToStudent[reg.toLowerCase()];
            return {
              studentName: s?.fullName?.trim() ?? (reg || 'Unknown'),
              regNumber: reg,
              count: rows.length,
              rows,
            };
          });
        return { course, count: courseItems.length, studentSections };
      });
    sections.push({ monthLabel, sortKey: monthYearSortKey(monthLabel), courseSections });
  }

  return sections.sort((a, b) => a.sortKey - b.sortKey);
}

// ── Leave-option colours ─────────────────────────────────────────────────────
const LEAVE_COLORS: Record<string, { bg: string; text: string }> = {
  Present:    { bg: '#F1F8E9', text: '#2E7D32' },
  'Half Day': { bg: '#FFF8E1', text: '#F57F17' },
  'Full Day': { bg: '#FFEBEE', text: '#C62828' },
};
const DEFAULT_LEAVE_COLOR = LEAVE_COLORS.Present;

// ── Grid column widths ───────────────────────────────────────────────────────
const COL = { status: 72, time: 72, date: 90 };

// ── Grid components ──────────────────────────────────────────────────────────

function GridHeader() {
  return (
    <View style={styles.gridHeader}>
      <Text style={[styles.hCell, { width: COL.status }]}>Status</Text>
      <Text style={[styles.hCell, { width: COL.time }]}>In</Text>
      <Text style={[styles.hCell, { width: COL.time }]}>Out</Text>
      <Text style={[styles.hCell, { width: COL.date }]}>Date</Text>
    </View>
  );
}

function GridRow({
  item,
  onPress,
}: {
  item: StudentAttendanceLogModel;
  onPress: (item: StudentAttendanceLogModel) => void;
}) {
  const leaveOpt   = item.leaveOption ?? 'Present';
  const leaveStyle = LEAVE_COLORS[leaveOpt] ?? DEFAULT_LEAVE_COLOR;
  const isApproved = String(item.approved ?? '').toLowerCase() === 'true' || item.approved === '1';

  return (
    <Pressable
      onPress={() => onPress(item)}
      android_ripple={{ color: `${PRIMARY}14` }}
      style={({ pressed }) => [styles.gridRow, pressed && styles.gridRowPressed]}
    >
      <View style={{ width: COL.status, alignItems: 'center' }}>
        <View style={[styles.statusBadge, { backgroundColor: leaveStyle.bg }]}>
          <Text style={[styles.statusText, { color: leaveStyle.text }]} numberOfLines={1}>
            {leaveOpt === 'Present' ? 'Present' : leaveOpt === 'Half Day' ? 'Half' : 'Full'}
          </Text>
        </View>
      </View>
      <Text style={[styles.dCell, { width: COL.time }]} numberOfLines={1}>{fmtTime(item.checkIn)}</Text>
      <Text style={[styles.dCell, { width: COL.time }]} numberOfLines={1}>{fmtTime(item.checkOut)}</Text>
      <Text style={[styles.dCell, { width: COL.date }]} numberOfLines={1}>
        {item.attendanceDate ? formatDisplayDate(item.attendanceDate) : '—'}
      </Text>
      <Text style={isApproved ? styles.tickGreen : styles.crossRed}>
        {isApproved ? '✓' : '✗'}
      </Text>
    </Pressable>
  );
}

function StudentSectionBlock({
  section,
  onRowPress,
  defaultExpanded,
}: {
  section: StudentSection;
  onRowPress: (item: StudentAttendanceLogModel) => void;
  defaultExpanded: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const presentCount = section.rows.filter(isPresent).length;
  const absentCount  = section.count - presentCount;

  return (
    <View style={styles.studentBlock}>
      <TouchableOpacity style={styles.studentHeader} onPress={() => setExpanded((v) => !v)} activeOpacity={0.75}>
        <Ionicons name="person-outline" size={13} color={Colors.muted} style={{ marginRight: 5 }} />
        <View style={{ flex: 1 }}>
          <Text style={styles.studentName} numberOfLines={1}>{section.studentName}</Text>
          {section.regNumber ? (
            <Text style={styles.studentReg}>{section.regNumber}</Text>
          ) : null}
        </View>
        <View style={styles.summaryRow}>
          <View style={styles.summaryChip}>
            <Text style={styles.summaryP}>✓ {presentCount}</Text>
          </View>
          {absentCount > 0 && (
            <View style={[styles.summaryChip, styles.summaryAbsChip]}>
              <Text style={styles.summaryA}>✗ {absentCount}</Text>
            </View>
          )}
          <Text style={styles.summaryTotal}>{section.count}</Text>
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={13}
          color={Colors.muted}
          style={{ marginLeft: 4 }}
        />
      </TouchableOpacity>

      {expanded && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View>
            <GridHeader />
            {section.rows.map((item) => (
              <GridRow key={item.id} item={item} onPress={onRowPress} />
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

function CourseSectionBlock({
  section,
  onRowPress,
  defaultExpanded,
}: {
  section: CourseSection;
  onRowPress: (item: StudentAttendanceLogModel) => void;
  defaultExpanded: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const presentCount = section.studentSections.flatMap((s) => s.rows).filter(isPresent).length;
  const absentCount  = section.count - presentCount;

  return (
    <View style={styles.courseBlock}>
      <TouchableOpacity style={styles.courseHeader} onPress={() => setExpanded((v) => !v)} activeOpacity={0.75}>
        <Ionicons name="book-outline" size={14} color={PRIMARY} style={{ marginRight: 6 }} />
        <Text style={styles.courseTitle} numberOfLines={1}>{section.course}</Text>
        <View style={styles.summaryRow}>
          <View style={styles.summaryChip}>
            <Text style={styles.summaryP}>✓ {presentCount}</Text>
          </View>
          {absentCount > 0 && (
            <View style={[styles.summaryChip, styles.summaryAbsChip]}>
              <Text style={styles.summaryA}>✗ {absentCount}</Text>
            </View>
          )}
          <Text style={styles.summaryTotal}>{section.count}</Text>
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={14}
          color={PRIMARY}
          style={{ marginLeft: 4 }}
        />
      </TouchableOpacity>

      {expanded && section.studentSections.map((ss) => (
        <StudentSectionBlock
          key={ss.regNumber || ss.studentName}
          section={ss}
          onRowPress={onRowPress}
          defaultExpanded={false}
        />
      ))}
    </View>
  );
}

function DateSectionBlock({
  section,
  onRowPress,
  defaultExpanded,
}: {
  section: DateSection;
  onRowPress: (item: StudentAttendanceLogModel) => void;
  defaultExpanded: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const totalCount = section.courseSections.reduce((s, c) => s + c.count, 0);
  const studentCount = section.courseSections.reduce(
    (s, c) => s + c.studentSections.length, 0,
  );

  return (
    <View style={styles.dateBlock}>
      <TouchableOpacity style={styles.dateHeader} onPress={() => setExpanded((v) => !v)} activeOpacity={0.75}>
        <View style={{ flex: 1 }}>
          <Text style={styles.dateTitle}>{section.monthLabel}</Text>
          <Text style={styles.dateSubtitle}>
            {section.courseSections.length} course{section.courseSections.length !== 1 ? 's' : ''} · {studentCount} student{studentCount !== 1 ? 's' : ''} · {totalCount} record{totalCount !== 1 ? 's' : ''}
          </Text>
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={PRIMARY}
          style={{ marginLeft: 8 }}
        />
      </TouchableOpacity>

      {expanded && section.courseSections.map((cs) => (
        <CourseSectionBlock
          key={cs.course}
          section={cs}
          onRowPress={onRowPress}
          defaultExpanded={false}
        />
      ))}
    </View>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function StudentAttendanceLogList({ navigation, route }: Props) {
  const filterReg  = route?.params?.studentRegNumber?.trim();
  const filterName = route?.params?.studentName?.trim();

  const { syncing, sync } = useSheet(SHEETS.STUDENT_ATT_LOG, getSyncCutoff());
  const synced = useRef(false);

  const [search,          setSearch]          = useState('');
  const [items,           setItems]           = useState<StudentAttendanceLogModel[]>([]);
  const [regToStudent,    setRegToStudent]    = useState<RegToStudent>({});
  const [leaveFilter,     setLeaveFilter]     = useState<LeaveFilter>('all');
  // Month filter: null = last 2 weeks; "MMM YYYY" = selected month
  const [selectedMonth,    setSelectedMonth]    = useState<string | null>(null);
  const [monthPickerOpen,  setMonthPickerOpen]  = useState(false);
  // The 2-week window bounds (computed once on mount)
  const twoWeeksAgo = useMemo(() => daysAgoDate(13), []); // today inclusive → 14 days total
  const todayEnd    = useMemo(() => { const d = new Date(); d.setHours(23, 59, 59, 999); return d; }, []);

  const loadStudents = useCallback(async () => {
    const students = await studentRepository.findAll();
    const map: RegToStudent = {};
    for (const s of students) {
      if (s.regNumber) map[s.regNumber.trim().toLowerCase()] = s;
    }
    setRegToStudent(map);
  }, []);

  useEffect(() => { loadStudents(); }, [loadStudents]);

  const loadItems = useCallback(async () => {
    let base: StudentAttendanceLogModel[];
    if (filterReg) {
      base = await studentAttendanceLogRepository.findByRegNumber(filterReg);
    } else {
      base = await studentAttendanceLogRepository.findAll();
    }

    // Date range filter — either a selected month or the last 2 weeks
    if (selectedMonth) {
      base = base.filter((r) => toMonthYear(r.attendanceDate) === selectedMonth);
    } else {
      base = base.filter((r) => isInDateRange(r, twoWeeksAgo, todayEnd));
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      base = base.filter((r) =>
        [r.regNumber, r.leaveOption, r.leaveType, r.accompaniedBy, r.markedBy, r.remarks, r.attendanceDate]
          .some((v) => String(v ?? '').toLowerCase().includes(q)),
      );
    }

    setItems(base);
  }, [filterReg, search, selectedMonth, twoWeeksAgo, todayEnd]);

  useEffect(() => { loadItems(); }, [loadItems]);

  useFocusEffect(useCallback(() => { loadItems(); }, [loadItems]));

  useEffect(() => {
    if (!synced.current) {
      synced.current = true;
      Promise.all([
        sync(),
        syncSheet(SHEETS.STUDENTS),
      ]).then(() => Promise.all([loadStudents(), loadItems()]));
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const canGoBack = navigation.canGoBack();

  const resolvedFilterName = filterName
    ?? (filterReg ? (regToStudent[filterReg.toLowerCase()]?.fullName ?? filterReg) : undefined)
    ?? '';
  const headerTitle = resolvedFilterName
    ? `${resolvedFilterName}'s Attendance`
    : (route?.params?.headerTitle ?? 'Student Attendance');

  const sections = useMemo(
    () => buildSections(items, regToStudent, leaveFilter),
    [items, regToStudent, leaveFilter],
  );

  const isEmpty = items.length === 0;

  const handleRowPress = useCallback(
    (item: StudentAttendanceLogModel) => navigation.navigate('StudentAttendanceLogDetails', { item }),
    [navigation],
  );

  // All 12 months for the current year + previous year, newest first.
  const allMonths = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const months: string[] = [];
    for (let y = currentYear; y >= currentYear - 1; y--) {
      for (let m = 11; m >= 0; m--) {
        months.push(`${MONTHS[m]} ${y}`);
      }
    }
    return months;
  }, []);

  return (
    <SafeAreaView style={KStyles.listRoot}>
      {/* Header */}
      <View style={[KStyles.header, { backgroundColor: PRIMARY }]}>
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

      {/* Date filter bar */}
      <View style={styles.dateFilterBar}>
        <TouchableOpacity
          style={[styles.dateFilterBtn, !selectedMonth && styles.dateFilterBtnActive]}
          onPress={() => setSelectedMonth(null)}
          activeOpacity={0.75}
        >
          <Ionicons
            name="calendar-outline"
            size={14}
            color={!selectedMonth ? '#fff' : PRIMARY}
            style={{ marginRight: 4 }}
          />
          <Text style={[styles.dateFilterBtnText, !selectedMonth && styles.dateFilterBtnTextActive]}>
            Last 2 weeks
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.dateFilterBtn, !!selectedMonth && styles.dateFilterBtnActive]}
          onPress={() => setMonthPickerOpen(true)}
          activeOpacity={0.75}
        >
          <Ionicons
            name="calendar-number-outline"
            size={14}
            color={selectedMonth ? '#fff' : PRIMARY}
            style={{ marginRight: 4 }}
          />
          <Text style={[styles.dateFilterBtnText, !!selectedMonth && styles.dateFilterBtnTextActive]}>
            {selectedMonth ?? 'Pick month'}
          </Text>
          {selectedMonth ? (
            <TouchableOpacity
              onPress={(e) => { e.stopPropagation?.(); setSelectedMonth(null); }}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              style={{ marginLeft: 6 }}
            >
              <Ionicons name="close-circle" size={15} color="#fff" />
            </TouchableOpacity>
          ) : null}
        </TouchableOpacity>
      </View>

      {/* Leave filter pills */}
      <View style={styles.filterRow}>
        {(['all', 'present', 'absent'] as LeaveFilter[]).map((f) => {
          const label  = f === 'all' ? 'All' : f === 'present' ? '✓ Present' : '✗ Absent';
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

      {/* Search */}
      <View style={KStyles.searchRow}>
        <Ionicons name="search" size={18} color="#999" style={KStyles.searchIcon} />
        <TextInput
          style={KStyles.searchInput}
          placeholder="Search by student, status, date…"
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

      {/* Month picker modal */}
      <Modal
        visible={monthPickerOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setMonthPickerOpen(false)}
      >
        <RNPressable style={styles.modalOverlay} onPress={() => setMonthPickerOpen(false)}>
          <RNPressable style={styles.modalSheet} onPress={() => {}}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Select a Month</Text>
            {allMonths.length === 0 ? (
              <View style={styles.modalEmpty}>
                <Text style={styles.modalEmptyText}>No months available</Text>
              </View>
            ) : (
              <FlatList
                data={allMonths}
                keyExtractor={(m) => m}
                renderItem={({ item: month }) => {
                  const isActive = month === selectedMonth;
                  return (
                    <TouchableOpacity
                      style={[styles.dateOption, isActive && styles.dateOptionActive]}
                      onPress={() => { setSelectedMonth(month); setMonthPickerOpen(false); }}
                      activeOpacity={0.75}
                    >
                      <Ionicons
                        name={isActive ? 'checkmark-circle' : 'calendar-number-outline'}
                        size={18}
                        color={isActive ? '#fff' : PRIMARY}
                        style={{ marginRight: 10 }}
                      />
                      <Text style={[styles.dateOptionText, isActive && styles.dateOptionTextActive]}>
                        {month}
                      </Text>
                    </TouchableOpacity>
                  );
                }}
                style={{ maxHeight: 360 }}
              />
            )}
            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setMonthPickerOpen(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.modalCloseBtnText}>Close</Text>
            </TouchableOpacity>
          </RNPressable>
        </RNPressable>
      </Modal>

      {isEmpty && syncing ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={PRIMARY} />
        </View>
      ) : isEmpty ? (
        <View style={styles.center}>
          <Ionicons name="calendar-outline" size={48} color="#ccc" />
          <Text style={KStyles.emptyText}>No attendance records found</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
          {sections.map((s) => (
            <DateSectionBlock
              key={s.monthLabel}
              section={s}
              onRowPress={handleRowPress}
              defaultExpanded={false}
            />
          ))}
        </ScrollView>
      )}

      {/* FAB */}
      <TouchableOpacity
        style={[KStyles.fab, { backgroundColor: PRIMARY }]}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('StudentAttendanceLogForm', {
          mode: 'add',
          prefilledRegNumber: filterReg,
        })}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
  filterPillActive:     { backgroundColor: PRIMARY, borderColor: PRIMARY },
  filterPillText:       { fontSize: 12, fontWeight: '600', color: Colors.muted },
  filterPillTextActive: { color: '#fff' },
  center: { ...KStyles.center, gap: 12, paddingTop: 80 },

  // Date section
  dateBlock: {
    marginHorizontal: 12,
    marginTop: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  dateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 11,
    backgroundColor: Colors.lightPink,
    borderLeftWidth: 3,
    borderLeftColor: PRIMARY,
  },
  dateTitle:    { fontSize: 14, fontWeight: '700', color: '#1a1a1a' },
  dateSubtitle: { fontSize: 11, color: Colors.muted, marginTop: 1 },

  // Student section
  studentBlock: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  studentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 7,
    backgroundColor: '#fff',
  },
  studentName: { fontSize: 12, fontWeight: '600', color: '#1a1a1a' },
  studentReg:  { fontSize: 10, color: PRIMARY, fontWeight: '500', marginTop: 1 },

  // Course section
  courseBlock: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  courseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: Colors.surface,
  },
  courseTitle: { fontSize: 12, fontWeight: '700', color: '#1a1a1a', flex: 1 },
  summaryRow:  { flexDirection: 'row', alignItems: 'center', gap: 4 },
  summaryChip: { paddingHorizontal: 5, paddingVertical: 1, borderRadius: 7, backgroundColor: '#E8F5E9' },
  summaryAbsChip: { backgroundColor: '#FFEBEE' },
  summaryP:    { fontSize: 10, fontWeight: '700', color: '#2E7D32' },
  summaryA:    { fontSize: 10, fontWeight: '700', color: '#C62828' },
  summaryTotal:{ fontSize: 10, color: Colors.muted, fontWeight: '500', marginLeft: 2 },

  // Grid
  gridHeader: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  hCell: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    paddingHorizontal: 4,
  },
  gridRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    backgroundColor: '#fff',
  },
  gridRowPressed: { backgroundColor: Colors.lightPink },
  tickGreen: { fontSize: 11, fontWeight: '700', color: '#2E7D32', marginRight: 3 },
  crossRed:  { fontSize: 11, fontWeight: '700', color: '#C62828', marginRight: 3 },
  dCell:     { fontSize: 12, color: '#1a1a1a', paddingHorizontal: 4 },
  statusBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8 },
  statusText:  { fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },

  // Date filter bar
  dateFilterBar: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  dateFilterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: PRIMARY,
    backgroundColor: '#fff',
  },
  dateFilterBtnActive:     { backgroundColor: PRIMARY, borderColor: PRIMARY },
  dateFilterBtnText:       { fontSize: 12, fontWeight: '600', color: PRIMARY },
  dateFilterBtnTextActive: { color: '#fff' },

  // Date picker modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: 16,
    paddingBottom: 28,
    paddingTop: 10,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#ddd',
    alignSelf: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalEmpty: { alignItems: 'center', paddingVertical: 24 },
  modalEmptyText: { fontSize: 14, color: Colors.muted },
  dateOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 4,
    backgroundColor: Colors.surface,
  },
  dateOptionActive:     { backgroundColor: PRIMARY },
  dateOptionText:       { fontSize: 14, color: '#1a1a1a', fontWeight: '500' },
  dateOptionTextActive: { color: '#fff', fontWeight: '700' },
  modalCloseBtn: {
    marginTop: 10,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modalCloseBtnText: { fontSize: 14, fontWeight: '600', color: Colors.muted },
});
