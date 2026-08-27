import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, TextInput, StyleSheet, Text,
  SafeAreaView, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useSheet } from '../../hooks/useSheet';
import { studentRepository } from '../../db/repositories';
import type { StudentModel } from '../../db/models';
import StudentRow from './StudentRow';
import { GroupedList, GroupLevel } from '../shared';
import { Colors, KStyles } from '../../styles/kutties-styles';

type Student = StudentModel;

const STATUS_DOT: Record<string, string> = {
  active:    '#2E7D32',
  inactive:  '#9E9E9E',
  Alumini:   '#342e9e',
  Graduated: '#d4d408',
};
const STATUS_BG: Record<string, string> = {
  active:    '#F1F8E9',
  inactive:  '#F5F5F5',
  Alumini:   '#EFEFFF',
  Graduated: '#FFFDE7',
};

const STUDENT_GROUP_BY: GroupLevel<Student>[] = [
  {
    keyOf: (s) => s.status ?? 'active',
    dotColor: (k) => STATUS_DOT[k] ?? '#555',
    bgColor:  (k) => STATUS_BG[k]  ?? '#F5F5F5',
    defaultExpanded: false,
  },
  {
    keyOf: (s) => s.course?.trim() || 'No Course',
    dotColor: '#1565C0',
    bgColor:  '#E3F2FD',
    defaultExpanded: false,
  },
];

interface Props {
  navigation: any;
}

export default function StudentList({ navigation }: Props) {
  const { syncing, sync } = useSheet('students');
  const synced = useRef(false);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [students, setStudents] = useState<Student[]>([]);

  const loadStudents = useCallback(async () => {
    const results = search.trim()
      ? await studentRepository.search(search)
      : await studentRepository.findAll();
    setStudents(results.sort((a, b) =>
      String(a.fullName ?? '').localeCompare(String(b.fullName ?? ''))
    ));
  }, [search]);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  useFocusEffect(useCallback(() => {
    loadStudents();
  }, [loadStudents]));

  useEffect(() => {
    if (!synced.current) {
      synced.current = true;
      sync().then(() => loadStudents());
    }
  }, []);

  const toggleSelect = useCallback((item: Student) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(item.id) ? next.delete(item.id) : next.add(item.id);
      return next;
    });
  }, []);

  const handlePress = useCallback((item: Student) => {
    if (selectedIds.size > 0) {
      toggleSelect(item);
    } else {
      navigation.navigate('StudentForm', { mode: 'edit', item });
    }
  }, [selectedIds, navigation, toggleSelect]);

  const renderStudent = useCallback((item: Student) => (
    <StudentRow
      item={item}
      selected={selectedIds.has(item.id)}
      onPress={handlePress}
      onLongPress={toggleSelect}
    />
  ), [selectedIds, handlePress, toggleSelect]);

  const isEmpty = students.length === 0;

  return (
    <SafeAreaView style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Students</Text>
        <TouchableOpacity onPress={() => sync()} style={styles.headerIcon}>
          {syncing
            ? <ActivityIndicator size="small" color="#fff" />
            : <Ionicons name="refresh" size={22} color="#fff" />}
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <Ionicons name="search" size={18} color="#999" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, reg, phone, course…"
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

      {/* Selection banner */}
      {selectedIds.size > 0 && (
        <View style={styles.selectionBanner}>
          <Text style={styles.selectionText}>{selectedIds.size} selected</Text>
          <TouchableOpacity onPress={() => setSelectedIds(new Set())}>
            <Text style={styles.clearText}>Clear</Text>
          </TouchableOpacity>
        </View>
      )}

      {isEmpty && syncing ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : isEmpty ? (
        <View style={styles.center}>
          <Ionicons name="people-outline" size={48} color="#ccc" />
          <Text style={styles.emptyText}>No students found</Text>
        </View>
      ) : (
        <GroupedList
          data={students}
          groupBy={STUDENT_GROUP_BY}
          keyExtractor={(s) => s.id}
          renderItem={renderStudent}
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('StudentForm', { mode: 'add' })}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F5F5F5' },
  header: KStyles.header,
  headerTitle: KStyles.headerTitle,
  headerIcon: KStyles.headerIcon,
  searchRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface, margin: 10, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 6,
    elevation: 1, boxShadow: '0px 1px 3px rgba(0,0,0,0.05)',
  },
  searchIcon: { marginRight: 6 },
  searchInput: { flex: 1, fontSize: 14, color: '#222', paddingVertical: 2 },
  selectionBanner: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: Colors.lightPink, paddingHorizontal: 16, paddingVertical: 8,
  },
  selectionText: { fontSize: 13, fontWeight: '600', color: Colors.primary },
  clearText: { fontSize: 13, color: Colors.primary, textDecorationLine: 'underline' },
  center: { ...KStyles.center, gap: 12, paddingTop: 80 },
  emptyText: { fontSize: 14, color: '#aaa' },
  fab: KStyles.fab,
});
