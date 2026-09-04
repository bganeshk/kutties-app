import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View, TextInput, FlatList, StyleSheet, Text, ScrollView,
  SafeAreaView, TouchableOpacity, ActivityIndicator, Modal, Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useSheet } from '../../../hooks/useSheet';
import {
  studentMarkSheetRepository,
  studentRepository,
  courseRepository,
  teacherRepository,
} from '../../../db/repositories';
import type { StudentMarkSheetModel } from '../../../db/models/studentmarksheet.model';
import type { StudentModel } from '../../../db/models/student.model';
import { Colors, KStyles } from '../../../styles/kutties-styles';
import { SHEETS } from '../../../utils/constants';

const PRIMARY  = Colors.primary;
const COL_SUBJ = 140;   // Subject column
const COL_GRAD = 56;    // Grade column
// Teacher takes remaining flex

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

// ── Average percentage helper ─────────────────────────────────────────────────
function avgPct(rows: StudentMarkSheetModel[]): number | null {
  const scored = rows.filter((r) => r.maxMarks != null && r.marksObtained != null && r.maxMarks > 0);
  if (scored.length === 0) return null;
  const obt = scored.reduce((s, r) => s + (r.marksObtained ?? 0), 0);
  const max = scored.reduce((s, r) => s + (r.maxMarks      ?? 0), 0);
  return max > 0 ? Math.round((obt / max) * 100) : null;
}

function avgPctColor(pct: number): string {
  if (pct >= 75) return '#2E7D32';
  if (pct >= 45) return '#F57F17';
  return '#C62828';
}

// ── Section types ─────────────────────────────────────────────────────────────
type StudentHeader  = { type: 'student';  name: string; reg: string; count: number; avg: number | null; studentKey: string };
type SubjectHeader  = { type: 'subject';  subject: string; count: number; avg: number | null; subjectKey: string };
type ColHeader      = { type: 'colheader' };
type DataRow        = { type: 'row';      item: StudentMarkSheetModel };
type ListEntry      = SubjectHeader | StudentHeader | ColHeader | DataRow;

// ── Grade colour helper ───────────────────────────────────────────────────────
function gradeColor(grade?: string): string {
  const g = (grade ?? '').toUpperCase();
  if (g.startsWith('A')) return '#1B5E20';
  if (g.startsWith('B')) return '#1565C0';
  if (g.startsWith('C')) return '#E65100';
  if (g.startsWith('D')) return '#B71C1C';
  return '#555';
}
function gradeBg(grade?: string): string {
  const g = (grade ?? '').toUpperCase();
  if (g.startsWith('A')) return '#E8F5E9';
  if (g.startsWith('B')) return '#E3F2FD';
  if (g.startsWith('C')) return '#FFF3E0';
  if (g.startsWith('D')) return '#FFEBEE';
  return '#F5F5F5';
}

export default function StudentMarkSheetList({ navigation, route }: Props) {
  const filterRegNumber = route?.params?.studentRegNumber?.trim();
  const filterName      = route?.params?.studentName?.trim();

  const { syncing, sync } = useSheet(SHEETS.STUDENT_MARK_SHEET);
  const [search, setSearch]             = useState('');
  const [items,  setItems]              = useState<StudentMarkSheetModel[]>([]);
  const [regToStudent, setRegToStudent] = useState<Record<string, StudentModel>>({});
  // emailToTeacherName: subjTeacher email → display name
  const [emailToTeacherName, setEmailToTeacherName] = useState<Record<string, string>>({});
  const [courseFilter,    setCourseFilter]    = useState<string | null>(null);
  const [teacherFilter,   setTeacherFilter]   = useState<string | null>(null);
  const [coursePickerOpen, setCoursePickerOpen] = useState(false);
  const [collapsedSubjects,  setCollapsedSubjects]  = useState<Set<string>>(new Set());
  const [collapsedStudents,  setCollapsedStudents]  = useState<Set<string>>(new Set());

  // ── Data load ─────────────────────────────────────────────────────────────
  const loadItems = useCallback(async () => {
    const [marks, students, courses, teachers] = await Promise.all([
      filterRegNumber
        ? studentMarkSheetRepository.findByStudent(filterRegNumber)
        : studentMarkSheetRepository.findAll(),
      studentRepository.findAll(),
      courseRepository.findAll(),
      teacherRepository.findAll(),
    ]);

    // Build email → name map for resolving subjTeacher display
    const e2n: Record<string, string> = {};
    for (const t of teachers) {
      if (t.email) e2n[t.email.trim().toLowerCase()] = t.name ?? t.email;
    }
    setEmailToTeacherName(e2n);

    const sMap: Record<string, StudentModel> = {};
    students.forEach((s) => {
      if (s.regNumber) sMap[s.regNumber.trim().toLowerCase()] = s;
    });

    // build ordered course list from courses sheet
    const seen = new Set<string>();
    const cNames: string[] = [];
    for (const c of courses) {
      const key = c.courseName?.trim() && c.division?.trim()
        ? `${c.courseName}: ${c.division}`
        : c.courseName?.trim() ?? '';
      if (key && !seen.has(key)) { seen.add(key); cNames.push(key); }
    }

    let base = marks;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      base = base.filter((r) => {
        const sName = sMap[(r.regNumber ?? '').trim().toLowerCase()]?.fullName ?? '';
        // resolve teacher email → name for search
        const teacherEmail = (r.subjTeacher ?? '').trim().toLowerCase();
        const teacherName  = e2n[teacherEmail] ?? r.subjTeacher ?? '';
        return [r.regNumber, r.examName, r.subject, r.grade, teacherName, sName]
          .some((v) => String(v ?? '').toLowerCase().includes(q));
      });
    }

    // Seed collapsed state on first load only
    const studentKeys  = new Set<string>();
    const subjectKeys  = new Set<string>();
    marks.forEach((r) => {
      const subj = r.subject?.trim() || 'No Subject';
      const reg  = (r.regNumber ?? '').trim().toLowerCase();
      studentKeys.add(reg);
      subjectKeys.add(`${reg}:${subj}`);
    });
    setCollapsedStudents((prev) => (prev.size > 0 ? prev : studentKeys));
    setCollapsedSubjects((prev) => (prev.size > 0 ? prev : subjectKeys));

    setRegToStudent(sMap);
    setCourseOrder(cNames);
    setItems(base);
  }, [filterRegNumber, search]);

  useFocusEffect(useCallback(() => {
    sync().then(() => loadItems());
  }, [sync, loadItems]));

  useEffect(() => { loadItems(); }, [loadItems]);

  const canGoBack = navigation.canGoBack();

  const resolvedFilterName = filterName
    ?? (filterRegNumber
      ? (regToStudent[filterRegNumber.toLowerCase()]?.fullName ?? filterRegNumber)
      : undefined)
    ?? '';

  const headerTitle = resolvedFilterName
    ? `${resolvedFilterName}'s Marks`
    : (route?.params?.headerTitle ?? 'Mark Sheet');

  const [courseOrder, setCourseOrder] = useState<string[]>([]);

  // ── Course chips — ordered from courses sheet, only courses that have data ─
  const allCourses = useMemo<string[]>(() => {
    const inData = new Set<string>();
    for (const item of items) {
      const reg = (item.regNumber ?? '').trim().toLowerCase();
      const c   = regToStudent[reg]?.course?.trim();
      if (c) inData.add(c);
    }
    const ordered = courseOrder.filter((c) => inData.has(c));
    const extras  = [...inData].filter((c) => !courseOrder.includes(c)).sort();
    return [...ordered, ...extras];
  }, [items, regToStudent, courseOrder]);

  // ── Apply course + teacher filters ───────────────────────────────────────
  const filteredItems = useMemo<StudentMarkSheetModel[]>(() => {
    return items.filter((r) => {
      const reg    = (r.regNumber ?? '').trim().toLowerCase();
      const course = regToStudent[reg]?.course?.trim() ?? '';
      if (courseFilter  && course !== courseFilter)                           return false;
      if (teacherFilter && (r.subjTeacher?.trim() || '') !== teacherFilter)  return false;
      return true;
    });
  }, [items, regToStudent, courseFilter, teacherFilter]);

  // ── Build flat sections: Student → Subject → rows ────────────────────────
  const sections = useMemo<ListEntry[]>(() => {
    // reg → subject → rows
    const byReg = new Map<string, Map<string, StudentMarkSheetModel[]>>();
    for (const item of filteredItems) {
      const reg  = (item.regNumber ?? '').trim().toLowerCase();
      const subj = item.subject?.trim() || 'No Subject';
      if (!byReg.has(reg)) byReg.set(reg, new Map());
      const bySubject = byReg.get(reg)!;
      if (!bySubject.has(subj)) bySubject.set(subj, []);
      bySubject.get(subj)!.push(item);
    }

    // sort students by name
    const sortedRegs = [...byReg.keys()].sort((a, b) => {
      const na = regToStudent[a]?.fullName ?? a;
      const nb = regToStudent[b]?.fullName ?? b;
      return na.localeCompare(nb);
    });

    const entries: ListEntry[] = [];
    for (const reg of sortedRegs) {
      const student    = regToStudent[reg];
      const name       = student?.fullName ?? student?.regNumber ?? reg;
      const bySubject  = byReg.get(reg)!;
      const total      = [...bySubject.values()].reduce((s, r) => s + r.length, 0);
      const studentKey = reg;
      const allStudentRows = [...bySubject.values()].flat();
      entries.push({ type: 'student', name, reg: student?.regNumber ?? reg, count: total, avg: avgPct(allStudentRows), studentKey });

      if (collapsedStudents.has(studentKey)) continue;

      const sortedSubjects = [...bySubject.keys()].sort((a, b) => a.localeCompare(b));
      for (const subject of sortedSubjects) {
        const rows       = bySubject.get(subject)!;
        const subjectKey = `${reg}:${subject}`;
        entries.push({ type: 'subject', subject, count: rows.length, avg: avgPct(rows), subjectKey });

        if (collapsedSubjects.has(subjectKey)) continue;

        entries.push({ type: 'colheader' });
        rows
          .sort((a, b) => (a.examName ?? '').localeCompare(b.examName ?? ''))
          .forEach((r) => entries.push({ type: 'row', item: r }));
      }
    }
    return entries;
  }, [filteredItems, regToStudent, collapsedSubjects, collapsedStudents]);

  const isEmpty = filteredItems.length === 0;

  // ── Render ─────────────────────────────────────────────────────────────────
  const renderEntry = useCallback(({ item: entry }: { item: ListEntry }) => {
    if (entry.type === 'colheader') {
      return (
        <View style={styles.colHeader}>
          <Text style={[styles.colHeaderCell, { width: COL_SUBJ }]}>Exam</Text>
          <Text style={[styles.colHeaderCell, { width: COL_GRAD }]}>Grade</Text>
          <Text style={[styles.colHeaderCell, { flex: 1 }]}>Teacher</Text>
        </View>
      );
    }

    if (entry.type === 'student') {
      const isCollapsed = collapsedStudents.has(entry.studentKey);
      return (
        <TouchableOpacity
          style={styles.studentHeader}
          activeOpacity={0.75}
          onPress={() =>
            setCollapsedStudents((prev) => {
              const next = new Set(prev);
              if (next.has(entry.studentKey)) next.delete(entry.studentKey);
              else next.add(entry.studentKey);
              return next;
            })
          }
        >
          <Ionicons name="person-circle-outline" size={15} color={PRIMARY} style={{ marginRight: 6 }} />
          <Text style={styles.studentHeaderText} numberOfLines={1}>{entry.name}</Text>
          {entry.name !== entry.reg && (
            <Text style={styles.studentHeaderReg} numberOfLines={1}> · {entry.reg}</Text>
          )}
          {entry.avg != null && (
            <View style={[styles.avgBadge, { borderColor: avgPctColor(entry.avg) }]}>
              <Text style={[styles.avgBadgeText, { color: avgPctColor(entry.avg) }]}>{entry.avg}%</Text>
            </View>
          )}
          <View style={styles.studentCountBadge}>
            <Text style={styles.studentCountText}>{entry.count}</Text>
          </View>
          <Ionicons
            name={isCollapsed ? 'chevron-forward' : 'chevron-down'}
            size={13}
            color={PRIMARY}
            style={{ marginLeft: 'auto' }}
          />
        </TouchableOpacity>
      );
    }

    if (entry.type === 'subject') {
      const isCollapsed = collapsedSubjects.has(entry.subjectKey);
      return (
        <TouchableOpacity
          style={styles.subjectHeader}
          activeOpacity={0.75}
          onPress={() =>
            setCollapsedSubjects((prev) => {
              const next = new Set(prev);
              if (next.has(entry.subjectKey)) next.delete(entry.subjectKey);
              else next.add(entry.subjectKey);
              return next;
            })
          }
        >
          <Ionicons name="book-outline" size={13} color={PRIMARY} style={{ marginRight: 6 }} />
          <Text style={styles.subjectHeaderText}>{entry.subject}</Text>
          {entry.avg != null && (
            <View style={[styles.avgBadge, { backgroundColor: avgPctColor(entry.avg) + '22' }]}>
              <Text style={[styles.avgBadgeText, { color: avgPctColor(entry.avg) }]}>{entry.avg}%</Text>
            </View>
          )}
          <View style={styles.groupCountBadge}>
            <Text style={styles.groupCountText}>{entry.count}</Text>
          </View>
          <Ionicons
            name={isCollapsed ? 'chevron-forward' : 'chevron-down'}
            size={14}
            color={PRIMARY}
            style={{ marginLeft: 'auto' }}
          />
        </TouchableOpacity>
      );
    }

    // DataRow
    const { item } = entry;
    // teacher is stored as email; resolve to display name
    const teacherEmail = item.subjTeacher?.trim() || '';
    const teacherLabel = teacherEmail
      ? (emailToTeacherName[teacherEmail.toLowerCase()] ?? teacherEmail)
      : '—';
    const grade    = item.grade?.trim() || '—';
    // filter key is the raw email value (unique)
    const isActive = teacherFilter === teacherEmail;

    return (
      <TouchableOpacity
        style={styles.dataRow}
        activeOpacity={0.7}
        onPress={() => navigation.navigate('StudentMarkSheetDetails', { item })}
      >
        {/* Exam name */}
        <Text style={[styles.cell, styles.cellSubject]} numberOfLines={2}>
          {item.examName ?? '—'}
        </Text>

        {/* Grade badge */}
        <View style={[styles.gradeBadge, { backgroundColor: gradeBg(grade) }]}>
          <Text style={[styles.gradeText, { color: gradeColor(grade) }]}>{grade}</Text>
        </View>

        {/* Teacher — filter chip */}
        <TouchableOpacity
          style={[styles.teacherChip, isActive && styles.teacherChipActive]}
          activeOpacity={0.75}
          onPress={() => setTeacherFilter(isActive ? null : (teacherEmail || null))}
          hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
        >
          <Ionicons
            name="person-outline"
            size={11}
            color={isActive ? '#fff' : '#6B7280'}
            style={{ marginRight: 3 }}
          />
          <Text
            style={[styles.teacherChipText, isActive && styles.teacherChipTextActive]}
            numberOfLines={1}
          >
            {teacherLabel}
          </Text>
          {isActive && (
            <Ionicons name="close" size={11} color="#fff" style={{ marginLeft: 2 }} />
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    );
  }, [navigation, teacherFilter, collapsedSubjects, collapsedStudents]);

  return (
    <SafeAreaView style={KStyles.listRoot}>

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <View style={KStyles.header}>
        {canGoBack ? (
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
        ) : (
          <Ionicons name="document-text" size={24} color="#fff" />
        )}
        <Text style={KStyles.headerTitle} numberOfLines={1}>{headerTitle}</Text>
        <TouchableOpacity
          onPress={() => sync().then(() => loadItems())}
          style={KStyles.headerIcon}
        >
          {syncing
            ? <ActivityIndicator size="small" color="#fff" />
            : <Ionicons name="refresh" size={22} color="#fff" />}
        </TouchableOpacity>
      </View>

      {/* ── Course filter button ─────────────────────────────────────────── */}
      {!filterRegNumber && allCourses.length > 0 && (
        <View style={styles.filterBar}>
          <TouchableOpacity
            style={[styles.filterBtn, courseFilter != null && styles.filterBtnActive]}
            onPress={() => setCoursePickerOpen(true)}
            activeOpacity={0.8}
          >
            <Ionicons
              name="school-outline"
              size={14}
              color={courseFilter != null ? '#fff' : PRIMARY}
              style={{ marginRight: 5 }}
            />
            <Text style={[styles.filterBtnText, courseFilter != null && styles.filterBtnTextActive]} numberOfLines={1}>
              {courseFilter ?? 'Filter by Course'}
            </Text>
            {courseFilter != null ? (
              <TouchableOpacity
                onPress={() => setCourseFilter(null)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={{ marginLeft: 6 }}
              >
                <Ionicons name="close-circle" size={15} color="#fff" />
              </TouchableOpacity>
            ) : (
              <Ionicons name="chevron-down" size={14} color={PRIMARY} style={{ marginLeft: 4 }} />
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* ── Course picker modal ──────────────────────────────────────────── */}
      <Modal
        visible={coursePickerOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setCoursePickerOpen(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setCoursePickerOpen(false)}>
          <Pressable style={styles.modalSheet} onPress={() => {}}>
            {/* Handle */}
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Filter by Course</Text>

            <ScrollView bounces={false}>
              {/* "All" option */}
              <TouchableOpacity
                style={[styles.modalOption, courseFilter === null && styles.modalOptionActive]}
                onPress={() => { setCourseFilter(null); setCoursePickerOpen(false); }}
                activeOpacity={0.75}
              >
                <Ionicons
                  name={courseFilter === null ? 'checkmark-circle' : 'ellipse-outline'}
                  size={18}
                  color={courseFilter === null ? PRIMARY : '#9CA3AF'}
                  style={{ marginRight: 10 }}
                />
                <Text style={[styles.modalOptionText, courseFilter === null && styles.modalOptionTextActive]}>
                  All Courses
                </Text>
              </TouchableOpacity>

              {allCourses.map((c) => {
                const active = courseFilter === c;
                return (
                  <TouchableOpacity
                    key={c}
                    style={[styles.modalOption, active && styles.modalOptionActive]}
                    onPress={() => { setCourseFilter(c); setCoursePickerOpen(false); }}
                    activeOpacity={0.75}
                  >
                    <Ionicons
                      name={active ? 'checkmark-circle' : 'ellipse-outline'}
                      size={18}
                      color={active ? PRIMARY : '#9CA3AF'}
                      style={{ marginRight: 10 }}
                    />
                    <Text style={[styles.modalOptionText, active && styles.modalOptionTextActive]}>
                      {c}
                    </Text>
                  </TouchableOpacity>
                );
              })}

              <View style={{ height: 20 }} />
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Search ───────────────────────────────────────────────────────── */}
      <View style={KStyles.searchRow}>
        <Ionicons name="search" size={18} color="#999" style={KStyles.searchIcon} />
        <TextInput
          style={KStyles.searchInput}
          placeholder="Search subject, exam, teacher…"
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

      {/* ── Body ─────────────────────────────────────────────────────────── */}
      {isEmpty && syncing ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={PRIMARY} />
        </View>
      ) : isEmpty ? (
        <View style={styles.center}>
          <Ionicons name="document-text-outline" size={48} color="#ccc" />
          <Text style={KStyles.emptyText}>No mark sheet entries found</Text>
        </View>
      ) : (
        <FlatList
          data={sections}
          keyExtractor={(entry, i) => {
            if (entry.type === 'subject')   return `subj-${i}-${entry.subject}`;
            if (entry.type === 'student')   return `stu-${i}-${entry.reg}`;
            if (entry.type === 'colheader') return `colhdr-${i}`;
            return entry.item.id ?? String(i);
          }}
          renderItem={renderEntry}
          contentContainerStyle={{ paddingBottom: 100 }}
        />
      )}

      {/* ── FAB ──────────────────────────────────────────────────────────── */}
      <TouchableOpacity
        style={KStyles.fab}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('StudentMarkSheetForm', {
          mode: 'add',
          ...(filterRegNumber && { prefilledRegNumber: filterRegNumber }),
        })}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // Column header row (rendered inside each student group)
  colHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 5,
    backgroundColor: '#F3F4F6',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  colHeaderCell: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Student header (level 0 — outermost group)
  studentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.lightPink,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.primary + '55',
    marginTop: 6,
  },
  subjectHeaderText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
    flex: 1,
  },

  // Subject header (level 1 — nested under student)
  subjectHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  studentHeaderText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
    flex: 1,
  },
  studentHeaderReg: {
    fontSize: 11,
    color: Colors.primary + 'AA',
  },
  studentCountBadge: {
    backgroundColor: Colors.primary,
    borderRadius: 9,
    paddingHorizontal: 6,
    paddingVertical: 1,
    marginLeft: 6,
  },
  studentCountText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '600',
  },

  avgBadge: {
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 7,
    paddingVertical: 2,
    marginLeft: 6,
  },
  avgBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },

  groupCountBadge: {
    backgroundColor: PRIMARY,
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 1,
    marginLeft: 8,
  },
  groupCountText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '600',
  },

  // Data row
  dataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 11,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  cell: {
    fontSize: 13,
    color: '#374151',
  },
  cellSubject: {
    width: COL_SUBJ,
    fontWeight: '500',
    color: '#1f2328',
  },
  // Teacher chip (inside data row)
  teacherChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#f9fafb',
    alignSelf: 'center',
  },
  teacherChipActive: {
    backgroundColor: PRIMARY,
    borderColor: PRIMARY,
  },
  teacherChipText: {
    fontSize: 11,
    color: '#6B7280',
    flexShrink: 1,
  },
  teacherChipTextActive: {
    color: '#fff',
    fontWeight: '600',
  },

  // Grade badge
  gradeBadge: {
    width: COL_GRAD,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  gradeText: {
    fontSize: 12,
    fontWeight: '700',
  },

  // Filter button bar
  filterBar: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: PRIMARY,
    backgroundColor: '#fff',
    maxWidth: '100%',
  },
  filterBtnActive: {
    backgroundColor: PRIMARY,
    borderColor: PRIMARY,
  },
  filterBtnText: {
    fontSize: 13,
    color: PRIMARY,
    fontWeight: '500',
    flexShrink: 1,
  },
  filterBtnTextActive: {
    color: '#fff',
    fontWeight: '600',
  },

  // Course picker modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingTop: 10,
    paddingHorizontal: 0,
    paddingBottom: 4,
    maxHeight: '75%',
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
    alignSelf: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1f2328',
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  modalOptionActive: {
    backgroundColor: '#F0F4FF',
  },
  modalOptionText: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  modalOptionTextActive: {
    color: PRIMARY,
    fontWeight: '600',
  },

  // Misc
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 60,
  },
});
