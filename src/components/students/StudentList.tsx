import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, TextInput, StyleSheet, Text,
  SafeAreaView, TouchableOpacity, ActivityIndicator,
} from 'react-native';
// StyleSheet kept for locally extended `center` style only
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useSheet } from '../../hooks/useSheet';
import { studentRepository } from '../../db/repositories';
import type { StudentModel } from '../../db/models';
import StudentRow from './StudentRow';
import { STUDENT_STATUS_DOT, STUDENT_STATUS_BG } from '../../utils/constants';
import { GroupedList, GroupLevel } from '../shared';
import { Colors, KStyles } from '../../styles/kutties-styles';

type Student = StudentModel;


const STUDENT_GROUP_BY: GroupLevel<Student>[] = [
  {
    keyOf: (s) => s.status ?? 'active',
    dotColor: (k) => STUDENT_STATUS_DOT[k] ?? '#555',
    bgColor:  (k) => STUDENT_STATUS_BG[k]  ?? '#F5F5F5',
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
      navigation.navigate('StudentDetails', { item });
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
    <SafeAreaView style={KStyles.listRoot}>
      {/* Header */}
      <View style={KStyles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={KStyles.headerTitle}>Students</Text>
        <TouchableOpacity onPress={() => sync()} style={KStyles.headerIcon}>
          {syncing
            ? <ActivityIndicator size="small" color="#fff" />
            : <Ionicons name="refresh" size={22} color="#fff" />}
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={KStyles.searchRow}>
        <Ionicons name="search" size={18} color="#999" style={KStyles.searchIcon} />
        <TextInput
          style={KStyles.searchInput}
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
        <View style={KStyles.selectionBanner}>
          <Text style={KStyles.selectionText}>{selectedIds.size} selected</Text>
          <TouchableOpacity onPress={() => setSelectedIds(new Set())}>
            <Text style={KStyles.clearText}>Clear</Text>
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
          <Text style={KStyles.emptyText}>No students found</Text>
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
        style={KStyles.fab}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('StudentForm', { mode: 'add' })}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: { ...KStyles.center, gap: 12, paddingTop: 80 },
});
