import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View, TextInput, FlatList, StyleSheet, Text,
  SafeAreaView, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useSheet } from '../../hooks/useSheet';
import { parentNoteRepository, studentRepository, courseRepository } from '../../db/repositories';
import type { ParentNoteModel } from '../../db/models/parentnote.model';
import type { StudentModel } from '../../db/models/student.model';
import ParentNoteRow from './ParentNoteRow';
import { Colors, KStyles } from '../../styles/kutties-styles';
import { SHEETS } from '../../utils/constants';

const PRIMARY = Colors.primary;

interface Props {
  navigation: any;
  route?: { params?: { studentRegNumber?: string; studentName?: string; headerTitle?: string } };
}

type CourseHeader  = { type: 'course';   course: string };
type StudentHeader = { type: 'student';  name: string; reg: string; count: number };
type NoteRow       = { type: 'row';      item: ParentNoteModel };

type ListEntry = CourseHeader | StudentHeader | NoteRow;

export default function ParentNoteList({ navigation, route }: Props) {
  const filterRegNumber = route?.params?.studentRegNumber?.trim();
  const filterName      = route?.params?.studentName?.trim();
  const { syncing, sync } = useSheet(SHEETS.PARENT_NOTE);
  const [search, setSearch]           = useState('');
  const [items, setItems]             = useState<ParentNoteModel[]>([]);
  const [regToStudent, setRegToStudent] = useState<Record<string, StudentModel>>({});
  const [courseOrder, setCourseOrder] = useState<string[]>([]);

  const [expandedCourses, setExpandedCourses]   = useState<Set<string>>(new Set());
  const [expandedStudents, setExpandedStudents] = useState<Set<string>>(new Set());

  const toggleCourse = useCallback((course: string) => {
    setExpandedCourses((prev) => {
      const next = new Set(prev);
      next.has(course) ? next.delete(course) : next.add(course);
      return next;
    });
  }, []);

  const toggleStudent = useCallback((reg: string) => {
    setExpandedStudents((prev) => {
      const next = new Set(prev);
      next.has(reg) ? next.delete(reg) : next.add(reg);
      return next;
    });
  }, []);

  const loadItems = useCallback(async () => {
    const [notes, students, courses] = await Promise.all([
      filterRegNumber
        ? parentNoteRepository.findByStudent(filterRegNumber)
        : parentNoteRepository.findAll(),
      studentRepository.findAll(),
      courseRepository.findAll(),
    ]);

    const map: Record<string, StudentModel> = {};
    students.forEach((s) => {
      if (s.regNumber) map[s.regNumber.trim().toLowerCase()] = s;
    });

    const seen = new Set<string>();
    const names: string[] = [];
    for (const c of courses) {
      const key = c.division?.trim() ? `${c.courseName}: ${c.division}` : (c.courseName?.trim() ?? '');
      if (key && !seen.has(key)) { seen.add(key); names.push(key); }
    }

    let base = notes;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      base = base.filter((r) => {
        const sName = map[(r.regNumber ?? '').trim().toLowerCase()]?.fullName ?? '';
        return [r.regNumber, r.noteText, r.category, r.parentName, r.teacherReply, r.noteDate, sName]
          .some((v) => String(v ?? '').toLowerCase().includes(q));
      });
    }

    setRegToStudent(map);
    setCourseOrder(names);
    setItems(base);
  }, [filterRegNumber, search]);

  useFocusEffect(useCallback(() => {
    sync().then(() => loadItems());
  }, [sync, loadItems]));

  useEffect(() => { loadItems(); }, [loadItems]);

  const canGoBack = navigation.canGoBack();

  const resolvedFilterName = filterName
    ?? (filterRegNumber ? (regToStudent[filterRegNumber]?.fullName ?? filterRegNumber) : undefined)
    ?? '';

  const headerTitle = resolvedFilterName
    ? `${resolvedFilterName}'s Notes`
    : (route?.params?.headerTitle ?? 'Parent Notes');

  const sections = useMemo<ListEntry[]>(() => {
    if (filterRegNumber) {
      // Single-student: flat list sorted newest first
      return [...items]
        .sort((a, b) => (b.noteDate ?? '').localeCompare(a.noteDate ?? ''))
        .map((r) => ({ type: 'row' as const, item: r }));
    }

    // Multi-student: course → student accordion
    const byReg = new Map<string, ParentNoteModel[]>();
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

    const sheetCourses = courseOrder.filter((c) => byCourse.has(c));
    const extraCourses = [...byCourse.keys()]
      .filter((c) => !courseOrder.includes(c))
      .sort((a, b) => a.localeCompare(b));
    const sorted = [...sheetCourses, ...extraCourses];

    const entries: ListEntry[] = [];
    for (const course of sorted) {
      const students = byCourse.get(course)!.sort((a, b) =>
        (a.fullName ?? a.regNumber ?? '').localeCompare(b.fullName ?? b.regNumber ?? ''),
      );
      entries.push({ type: 'course', course });
      if (expandedCourses.has(course)) {
        for (const student of students) {
          const reg    = student.regNumber ?? '';
          const regKey = reg.trim().toLowerCase();
          const records = (byReg.get(regKey) ?? []).sort((a, b) =>
            (b.noteDate ?? '').localeCompare(a.noteDate ?? ''),
          );
          entries.push({ type: 'student', name: student.fullName ?? reg, reg, count: records.length });
          if (expandedStudents.has(reg)) {
            for (const r of records) entries.push({ type: 'row', item: r });
          }
        }
      }
    }
    return entries;
  }, [items, filterRegNumber, regToStudent, courseOrder, expandedCourses, expandedStudents]);

  const isEmpty = items.length === 0;

  const renderEntry = useCallback(({ item: entry }: { item: ListEntry }) => {
    switch (entry.type) {
      case 'course': {
        const expanded = expandedCourses.has(entry.course);
        return (
          <TouchableOpacity style={styles.courseHeader} onPress={() => toggleCourse(entry.course)} activeOpacity={0.85}>
            <Ionicons name="school-outline" size={14} color="#fff" style={{ marginRight: 6 }} />
            <Text style={styles.courseHeaderText}>{entry.course}</Text>
            <Ionicons name={expanded ? 'chevron-down' : 'chevron-forward'} size={14} color="#fff" style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>
        );
      }
      case 'student': {
        const expanded = expandedStudents.has(entry.reg);
        return (
          <TouchableOpacity style={styles.studentHeader} onPress={() => toggleStudent(entry.reg)} activeOpacity={0.85}>
            <View style={styles.studentAvatar}>
              <Ionicons name="person-outline" size={13} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.studentHeaderName} numberOfLines={1}>{entry.name}</Text>
              {entry.name !== entry.reg ? (
                <Text style={styles.studentHeaderReg} numberOfLines={1}>{entry.reg}</Text>
              ) : null}
            </View>
            <View style={styles.countBadge}><Text style={styles.countText}>{entry.count}</Text></View>
            <Ionicons name={expanded ? 'chevron-down' : 'chevron-forward'} size={14} color={Colors.muted} style={{ marginLeft: 8 }} />
          </TouchableOpacity>
        );
      }
      case 'row':
        return (
          <ParentNoteRow
            item={entry.item}
            onPress={(r) => navigation.navigate('ParentNoteDetails', { item: r })}
          />
        );
    }
  }, [expandedCourses, expandedStudents, toggleCourse, toggleStudent, navigation]);

  return (
    <SafeAreaView style={KStyles.listRoot}>
      <View style={KStyles.header}>
        {canGoBack ? (
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
        ) : (
          <Ionicons name="chatbubble-ellipses" size={24} color="#fff" />
        )}
        <Text style={KStyles.headerTitle}>{headerTitle}</Text>
        <TouchableOpacity onPress={() => sync().then(() => loadItems())} style={KStyles.headerIcon}>
          {syncing
            ? <ActivityIndicator size="small" color="#fff" />
            : <Ionicons name="refresh" size={22} color="#fff" />}
        </TouchableOpacity>
      </View>

      <View style={KStyles.searchRow}>
        <Ionicons name="search" size={18} color="#999" style={KStyles.searchIcon} />
        <TextInput
          style={KStyles.searchInput}
          placeholder="Search by student, note, category…"
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
        <View style={styles.center}><ActivityIndicator size="large" color={PRIMARY} /></View>
      ) : isEmpty ? (
        <View style={styles.center}>
          <Ionicons name="chatbubble-ellipses-outline" size={48} color="#ccc" />
          <Text style={KStyles.emptyText}>No parent notes found</Text>
        </View>
      ) : (
        <FlatList
          data={sections}
          keyExtractor={(entry, i) => {
            if (entry.type === 'course')  return `c-${entry.course}`;
            if (entry.type === 'student') return `s-${entry.reg}`;
            return entry.item.id ?? String(i);
          }}
          renderItem={renderEntry}
        />
      )}

      {/* FAB — only parents can create; hide in teacher-only deployments by removing this */}
      <TouchableOpacity
        style={KStyles.fab}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('ParentNoteForm', {
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
  courseHeader: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 14, paddingVertical: 8, marginTop: 4,
  },
  courseHeaderText: {
    fontSize: 13, fontWeight: '700', color: '#fff',
    textTransform: 'uppercase', letterSpacing: 0.8,
  },
  studentHeader: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.lightPink,
    paddingHorizontal: 14, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  studentAvatar: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: PRIMARY,
    justifyContent: 'center', alignItems: 'center', marginRight: 10,
  },
  studentHeaderName: { fontSize: 13, fontWeight: '700', color: '#333' },
  studentHeaderReg:  { fontSize: 11, color: Colors.muted, marginTop: 1 },
  countBadge: {
    backgroundColor: PRIMARY, borderRadius: 10,
    minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 5,
  },
  countText: { fontSize: 11, fontWeight: '700', color: '#fff' },
});
