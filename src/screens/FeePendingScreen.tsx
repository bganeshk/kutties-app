import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  SafeAreaView, ActivityIndicator, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useSheet } from '../hooks/useSheet';
import { syncSheet } from '../sync/sync.service';
import {
  studentFeeRepository,
  studentRepository,
  courseRepository,
} from '../db/repositories';
import type { StudentModel } from '../db/models/student.model';
import type { StudentFeeModel } from '../db/models/studentfee.model';
import { Colors, KStyles } from '../styles/kutties-styles';
import { SHEETS } from '../utils/constants';

const PRIMARY = Colors.primary;

// ── Inline tooltip chip ───────────────────────────────────────────────────────
// Shows an inline bubble above the chip while the user holds down (press-and-hold
// is the mobile equivalent of hover; releasing dismisses it automatically).
function Tooltip({ label, tip }: { label: string; tip: string }) {
  const [visible, setVisible] = useState(false);
  return (
    <View style={styles.tipWrapper}>
      <TouchableOpacity
        style={styles.tipChip}
        onPressIn={() => setVisible(true)}
        onPressOut={() => setVisible(false)}
        hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
        activeOpacity={1}
        // @ts-ignore — web-only pointer events
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
      >
        <Text style={styles.tipChipText}>{label}</Text>
      </TouchableOpacity>

      {visible && (
        <View style={styles.tipBubble} pointerEvents="none">
          <Text style={styles.tipBubbleText}>{tip}</Text>
        </View>
      )}
    </View>
  );
}

// ── helpers ───────────────────────────────────────────────────────────────────

/** "YYYY-MM" key for a given offset from today's month (0 = current, -1 = prev, …) */
function monthKey(offset = 0): string {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** Short display label for a "YYYY-MM" key, e.g. "Jun 2025" */
function monthLabel(key: string): string {
  const [y, m] = key.split('-');
  const SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${SHORT[parseInt(m, 10) - 1]} ${y}`;
}

/** Parse a fee record date (dd/MMM/yyyy or YYYY-MM-DD) → "YYYY-MM". Returns '' when unparseable. */
function feeMonthKey(dateStr: string | undefined): string {
  if (!dateStr) return '';
  const mon: Record<string, string> = {
    jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
    jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
  };
  const dm = dateStr.match(/^(\d{1,2})\/([A-Za-z]{3})\/(\d{4})$/);
  if (dm) {
    const m = mon[dm[2].toLowerCase()];
    return m ? `${dm[3]}-${m}` : '';
  }
  const im = dateStr.match(/^(\d{4})-(\d{2})/);
  if (im) return `${im[1]}-${im[2]}`;
  return '';
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface PendingStudent {
  student: StudentModel;
  partialRecord?: StudentFeeModel; // partial/pending record already logged this month
  feeAmount?: number;              // computed: courseFee + optional afterSchool/weekend add-ons
}

type CourseGroup = { course: string; students: PendingStudent[] };

/** All pending data keyed by "YYYY-MM" */
type PendingMap = Record<string, CourseGroup[]>;

interface Props {
  navigation: any;
  route?: { params?: { headerTitle?: string } };
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function FeePendingScreen({ navigation, route }: Props) {
  const headerTitle = route?.params?.headerTitle ?? 'Fee Pending';
  const { syncing, sync } = useSheet(SHEETS.STUDENT_FEE);
  const synced = useRef(false);

  // Three month keys: [M-2, M-1, M]
  const tabs = useMemo(() => [monthKey(-2), monthKey(-1), monthKey(0)], []);

  const [activeTab, setActiveTab] = useState<string>(tabs[2]); // default: current month
  const [search, setSearch] = useState('');
  const [pendingMap, setPendingMap] = useState<PendingMap>({});
  const [pendingCounts, setPendingCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [expandedCourses, setExpandedCourses] = useState<Set<string>>(new Set());

  // Reset expansion when tab changes
  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
    setSearch('');
    setExpandedCourses(new Set());
  }, []);

  const toggleCourse = useCallback((c: string) => {
    setExpandedCourses((prev) => {
      const next = new Set(prev);
      next.has(c) ? next.delete(c) : next.add(c);
      return next;
    });
  }, []);

  // ── Load data for all three months at once ────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [allStudents, allCourses, allFees] = await Promise.all([
        studentRepository.findAll(),
        courseRepository.findAll(),
        // Fetch ALL fee records (paid + unpaid) so hasPaid check works correctly
        studentFeeRepository.findByMonthRange(tabs[0], tabs[2]),
      ]);

      const active = allStudents.filter((s) => s.status === 'active' && s.regNumber);

      // Build course order from the courses sheet
      const seen = new Set<string>();
      const courseOrder: string[] = [];
      for (const c of allCourses) {
        const name = c.courseName?.trim() ?? '';
        const div  = c.division?.trim()  ?? '';
        if (!name) continue;
        const key = div ? `${name}: ${div}` : name;
        if (!seen.has(key)) { seen.add(key); courseOrder.push(key); }
      }

      // Fee lookup keyed by "CourseName: Division" — exactly how student.course is stored
      const courseFeeMap = new Map<string, { courseFee: number; afterSchoolFee?: number; weekEndFee?: number }>();
      for (const c of allCourses) {
        const name = c.courseName?.trim() ?? '';
        const div  = c.division?.trim()   ?? '';
        if (!name) continue;
        const key = div ? `${name}: ${div}` : name;
        if (!courseFeeMap.has(key)) {
          courseFeeMap.set(key, {
            courseFee:      c.courseFee,
            afterSchoolFee: c.afterSchoolFee,
            weekEndFee:     c.weekEndFee,
          });
        }
      }

      const newMap: PendingMap = {};
      const newCounts: Record<string, number> = {};

      for (const mk of tabs) {
        // All pending/partial fee records for this specific month, grouped by dueDate.
        // Records with no dueDate fall into the current month tab only.
        const monthFees = allFees.filter((f) => {
          const k = feeMonthKey(f.dueDate);
          if (!k) return mk === tabs[2]; // no dueDate → show under current month
          return k === mk;
        });

        const feesByReg = new Map<string, StudentFeeModel[]>();
        for (const f of monthFees) {
          const key = (f.regNumber ?? '').trim().toLowerCase();
          if (!key) continue;
          if (!feesByReg.has(key)) feesByReg.set(key, []);
          feesByReg.get(key)!.push(f);
        }

        const pending: PendingStudent[] = [];
        for (const student of active) {
          const key = student.regNumber!.trim().toLowerCase();
          const fees = feesByReg.get(key) ?? [];
          const hasPaid = fees.some(
            (f) => (f.status ?? '').trim().toLowerCase() === 'paid',
          );
          if (!hasPaid) {
            const partialRecord = fees.find(
              (f) => (f.status ?? '').trim().toLowerCase() !== 'paid',
            );

            // Compute expected fee amount for this student
            const courseName = student.course?.trim() ?? '';
            const courseData  = courseFeeMap.get(courseName);
            let feeAmount: number | undefined;
            if (courseData) {
              feeAmount = courseData.courseFee;
              if (student.afterSchool === 'Y' && courseData.afterSchoolFee) {
                feeAmount += courseData.afterSchoolFee;
              }
              if (student.optWeekend === 'Y' && courseData.weekEndFee) {
                feeAmount += courseData.weekEndFee;
              }
            }

            pending.push({ student, partialRecord, feeAmount });
          }
        }

        // Group by course
        const grouped = new Map<string, PendingStudent[]>();
        for (const p of pending) {
          const course = p.student.course?.trim() || 'Unassigned';
          if (!grouped.has(course)) grouped.set(course, []);
          grouped.get(course)!.push(p);
        }
        for (const arr of grouped.values()) {
          arr.sort((a, b) =>
            (a.student.fullName ?? a.student.regNumber ?? '').localeCompare(
              b.student.fullName ?? b.student.regNumber ?? '',
            ),
          );
        }

        const sheetC = courseOrder.filter((c) => grouped.has(c));
        const extraC = [...grouped.keys()].filter((c) => !courseOrder.includes(c)).sort();
        const sortedCourses = [...sheetC, ...extraC];

        newMap[mk] = sortedCourses.map((course) => ({ course, students: grouped.get(course)! }));
        newCounts[mk] = pending.length;
      }

      setPendingMap(newMap);
      setPendingCounts(newCounts);

      // Auto-expand single-course tabs
      setExpandedCourses((prev) => {
        const groups = newMap[activeTab] ?? [];
        if (groups.length === 1) return new Set([groups[0].course]);
        return prev;
      });
    } finally {
      setLoading(false);
    }
  }, [tabs, activeTab]);

  useEffect(() => { loadData(); }, [loadData]);
  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  useEffect(() => {
    if (!synced.current) {
      synced.current = true;
      // Sync all three sheets this screen depends on, then reload
      Promise.all([
        sync(),                           // STUDENT_FEE (via useSheet)
        syncSheet(SHEETS.STUDENTS),
        syncSheet(SHEETS.COURSES),
      ]).then(() => loadData());
    }
  }, []);

  // ── Derived data for the active tab ──────────────────────────────────────────
  const activeCourseGroups = pendingMap[activeTab] ?? [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return activeCourseGroups;
    return activeCourseGroups
      .map(({ course, students }) => ({
        course,
        students: students.filter(({ student }) =>
          [student.fullName, student.regNumber, student.phone, student.course]
            .some((v) => String(v ?? '').toLowerCase().includes(q)),
        ),
      }))
      .filter(({ students }) => students.length > 0);
  }, [activeCourseGroups, search]);

  const totalPending = useMemo(
    () => filtered.reduce((acc, g) => acc + g.students.length, 0),
    [filtered],
  );

  const canGoBack = navigation.canGoBack();

  // ── Flat list data ───────────────────────────────────────────────────────────
  type ListItem =
    | { type: 'course'; course: string; count: number }
    | { type: 'student'; pendingStudent: PendingStudent };

  const flatData = useMemo<ListItem[]>(() => {
    const out: ListItem[] = [];
    for (const { course, students } of filtered) {
      out.push({ type: 'course', course, count: students.length });
      if (expandedCourses.has(course)) {
        for (const p of students) out.push({ type: 'student', pendingStudent: p });
      }
    }
    return out;
  }, [filtered, expandedCourses]);

  // ── Render ────────────────────────────────────────────────────────────────────
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
          <Ionicons name="alert-circle-outline" size={24} color="#fff" />
        )}
        <Text style={KStyles.headerTitle}>{headerTitle}</Text>
        <TouchableOpacity
          style={KStyles.headerIcon}
          onPress={() => sync().then(() => loadData())}
        >
          {syncing
            ? <ActivityIndicator size="small" color="#fff" />
            : <Ionicons name="refresh" size={22} color="#fff" />}
        </TouchableOpacity>
      </View>

      {/* Month tabs */}
      <View style={styles.tabBar}>
        {tabs.map((tab, idx) => {
          const isActive  = tab === activeTab;
          const count     = pendingCounts[tab] ?? 0;
          const isCurrent = idx === tabs.length - 1;
          return (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, isActive && styles.tabActive]}
              onPress={() => handleTabChange(tab)}
              activeOpacity={0.85}
            >
              <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                {monthLabel(tab)}
              </Text>
              {isCurrent && (
                <Text style={[styles.tabSub, isActive && styles.tabSubActive]}>current</Text>
              )}
              {!loading && count > 0 && (
                <View style={[styles.tabBadge, isActive && styles.tabBadgeActive]}>
                  <Text style={styles.tabBadgeText}>{count}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Search */}
      <View style={KStyles.searchRow}>
        <Ionicons name="search" size={18} color="#999" style={KStyles.searchIcon} />
        <TextInput
          style={KStyles.searchInput}
          placeholder="Search student name or reg number…"
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

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={PRIMARY} />
        </View>
      ) : totalPending === 0 ? (
        <View style={styles.center}>
          <Ionicons name="checkmark-circle-outline" size={56} color="#66BB6A" />
          <Text style={styles.allPaidText}>
            All students are paid for {monthLabel(activeTab)}!
          </Text>
        </View>
      ) : (
        <FlatList
          data={flatData}
          keyExtractor={(item, i) =>
            item.type === 'course'
              ? `course-${item.course}`
              : `st-${item.pendingStudent.student.regNumber ?? i}`
          }
          renderItem={({ item }) => {
            // ── Course header ──────────────────────────────────────────────────
            if (item.type === 'course') {
              const expanded = expandedCourses.has(item.course);
              return (
                <TouchableOpacity
                  style={styles.courseHeader}
                  onPress={() => toggleCourse(item.course)}
                  activeOpacity={0.85}
                >
                  <Ionicons name="school-outline" size={14} color="#fff" style={{ marginRight: 6 }} />
                  <Text style={styles.courseHeaderText}>{item.course}</Text>
                  <View style={styles.courseCountBadge}>
                    <Text style={styles.courseCountText}>{item.count}</Text>
                  </View>
                  <Ionicons
                    name={expanded ? 'chevron-down' : 'chevron-forward'}
                    size={14}
                    color="#fff"
                    style={{ marginLeft: 8 }}
                  />
                </TouchableOpacity>
              );
            }

            // ── Student row ────────────────────────────────────────────────────
            const { student, partialRecord, feeAmount } = item.pendingStudent;
            const initials = (student.fullName ?? student.regNumber ?? '?')
              .split(' ')
              .slice(0, 2)
              .map((w) => w[0]?.toUpperCase() ?? '')
              .join('');

            return (
              <TouchableOpacity
                style={styles.studentRow}
                activeOpacity={0.82}
                onPress={() =>
                  navigation.navigate('StudentFeeForm', {
                    mode: 'add',
                    prefilledRegNumber: student.regNumber,
                    prefilledAmount:   item.pendingStudent.feeAmount,
                    prefilledFeeType:  'Course Fee',
                  })
                }
              >
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{initials}</Text>
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.studentName} numberOfLines={1}>
                    {student.fullName ?? student.regNumber ?? '—'}
                  </Text>
                  <Text style={styles.studentReg} numberOfLines={1}>
                    {student.regNumber}
                    {student.phone ? `  •  ${student.phone}` : ''}
                  </Text>
                  {feeAmount != null && (
                    <View style={styles.feeAmountRow}>
                      <Ionicons name="cash-outline" size={10} color="#2E7D32" />
                      <Text style={styles.feeAmountText}>
                        {'₹' + feeAmount.toLocaleString('en-IN')}
                      </Text>
                      {student.afterSchool === 'Y' && (
                        <Tooltip label="+AS" tip="After School" />
                      )}
                      {student.optWeekend === 'Y' && (
                        <Tooltip label="+WE" tip="Weekend" />
                      )}
                    </View>
                  )}
                  {partialRecord && (
                    <View style={styles.partialRow}>
                      <Ionicons name="time-outline" size={10} color="#F57F17" />
                      <Text style={styles.partialText}>
                        {partialRecord.status ?? 'Partial'}
                        {partialRecord.amount != null
                          ? `  ₹${partialRecord.amount.toLocaleString('en-IN')}`
                          : ''}
                      </Text>
                    </View>
                  )}
                </View>

                <View style={styles.collectBtn}>
                  <Ionicons name="add-circle-outline" size={14} color="#fff" />
                  <Text style={styles.collectBtnText}>Collect</Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, paddingTop: 60 },
  allPaidText: { fontSize: 15, fontWeight: '600', color: '#2E7D32', textAlign: 'center', paddingHorizontal: 32 },

  // ── Tab bar ──────────────────────────────────────────────────────────────────
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    paddingHorizontal: 4,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    gap: 2,
  },
  tabActive:    { borderBottomColor: PRIMARY },
  tabLabel:     { fontSize: 13, fontWeight: '700', color: Colors.muted },
  tabLabelActive: { color: PRIMARY },
  tabSub:       { fontSize: 9, fontWeight: '500', color: '#bbb', textTransform: 'uppercase', letterSpacing: 0.4 },
  tabSubActive: { color: PRIMARY },
  tabBadge: {
    backgroundColor: Colors.border,
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  tabBadgeActive: { backgroundColor: PRIMARY },
  tabBadgeText:   { fontSize: 10, fontWeight: '700', color: '#fff' },

  // ── Course header ─────────────────────────────────────────────────────────────
  courseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PRIMARY,
    paddingHorizontal: 14,
    paddingVertical: 9,
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
  courseCountBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 10,
    minWidth: 22,
    height: 22,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  courseCountText: { fontSize: 12, fontWeight: '700', color: '#fff' },

  // ── Student row ───────────────────────────────────────────────────────────────
  studentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    flexShrink: 0,
  },
  avatarText:  { fontSize: 15, fontWeight: '700', color: '#fff' },
  studentName: { fontSize: 14, fontWeight: '700', color: '#1A1A1A' },
  studentReg:  { fontSize: 11, color: Colors.muted, marginTop: 2 },
  feeAmountRow:  { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3, flexWrap: 'wrap' },
  feeAmountText: { fontSize: 11, color: '#2E7D32', fontWeight: '600' },

  // ── Tooltip chip ─────────────────────────────────────────────────────────────
  tipWrapper: {
    position: 'relative',
    alignItems: 'center',
  },
  tipChip: {
    backgroundColor: '#E8F5E9',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderWidth: 0.5,
    borderColor: '#A5D6A7',
  },
  tipChipText: { fontSize: 10, fontWeight: '700', color: '#2E7D32' },
  tipBubble: {
    position: 'absolute',
    bottom: '100%',
    backgroundColor: '#1A1A1A',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 4,
    zIndex: 99,
  },
  tipBubbleText: { fontSize: 11, color: '#fff', fontWeight: '600' },
  partialRow:    { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  partialText:   { fontSize: 11, color: '#F57F17', fontWeight: '600' },

  collectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: PRIMARY,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginLeft: 8,
    flexShrink: 0,
  },
  collectBtnText: { fontSize: 12, fontWeight: '700', color: '#fff' },
});
