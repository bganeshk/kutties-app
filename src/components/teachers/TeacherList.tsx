import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  View, TextInput, StyleSheet, Text,
  SafeAreaView, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useSheet } from '../../hooks/useSheet';
import { teacherRepository } from '../../db/repositories';
import type { TeacherModel } from '../../db/models';
import TeacherRow from './TeacherRow';
import { GroupedList, GroupConfig } from '../shared';
import { Colors, KStyles } from '../../styles/kutties-styles';
type Teacher = TeacherModel;

const PRIMARY = Colors.primary;

const TEACHER_GROUPS: GroupConfig<Teacher>[] = [
  {
    key: 'active',
    label: 'Active',
    filter: (t) => t.status === 'active',
    dotColor: '#2E7D32',
    bgColor: '#F1F8E9',
    defaultExpanded: true,
  },
  {
    key: 'inactive',
    label: 'Inactive',
    filter: (t) => t.status !== 'active',
    dotColor: '#9E9E9E',
    bgColor: '#F5F5F5',
    defaultExpanded: false,
  },
];

interface Props {
  navigation: any;
}

export default function TeacherList({ navigation }: Props) {
  const { syncing, sync } = useSheet('teachers');
  const synced = useRef(false);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [subjectFilter, setSubjectFilter] = useState<string | null>(null);

  const toggleSubjectFilter = useCallback((subject: string) => {
    setSubjectFilter((prev) => (prev === subject ? null : subject));
  }, []);

  const displayedTeachers = useMemo(() =>
    subjectFilter
      ? teachers.filter((t) => t.subjectList?.includes(subjectFilter))
      : teachers,
    [teachers, subjectFilter],
  );

  const loadTeachers = useCallback(async () => {
    const results = search.trim()
      ? await teacherRepository.search(search)
      : await teacherRepository.findAll();
    setTeachers(results.sort((a, b) =>
      String(a.name ?? '').localeCompare(String(b.name ?? ''))
    ));
  }, [search]);

  useEffect(() => {
    loadTeachers();
  }, [loadTeachers]);

  // reload list every time the screen comes back into focus (e.g. after save/edit)
  useFocusEffect(useCallback(() => {
    loadTeachers();
  }, [loadTeachers]));

  useEffect(() => {
    if (!synced.current) {
      synced.current = true;
      sync().then(() => loadTeachers());
    }
  }, []);

  const toggleSelect = useCallback((item: Teacher) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(item.id) ? next.delete(item.id) : next.add(item.id);
      return next;
    });
  }, []);

  const handlePress = useCallback((item: Teacher) => {
    if (selectedIds.size > 0) {
      toggleSelect(item);
    } else {
      navigation.navigate('TeacherDetails', { item });
    }
  }, [selectedIds, navigation, toggleSelect]);

  const renderTeacher = useCallback((item: Teacher) => (
    <TeacherRow
      item={item}
      selected={selectedIds.has(item.id)}
      onPress={handlePress}
      onLongPress={toggleSelect}
      activeSubject={subjectFilter ?? undefined}
      onSubjectPress={toggleSubjectFilter}
      onQrPress={(t) =>
        navigation.navigate('Landing', {
          title: String(t.name ?? t.id),
          appviewsheet: 'TeacherAttendanceQR',
        })
      }
    />
  ), [selectedIds, handlePress, toggleSelect, subjectFilter, toggleSubjectFilter, navigation]);

  const isEmpty = displayedTeachers.length === 0;

  return (
    <SafeAreaView style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Teachers</Text>
        <TouchableOpacity onPress={() => sync()} style={styles.headerIcon}>
          {syncing
            ? <ActivityIndicator size="small" color="#fff" />
            : <Ionicons name="refresh" size={22} color="#fff" />}
        </TouchableOpacity>
      </View>

      {/* Search bar */}
      <View style={styles.searchRow}>
        <Ionicons name="search" size={18} color="#999" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, email, phone…"
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

      {/* Subject filter banner */}
      {subjectFilter && (
        <View style={styles.filterBanner}>
          <Ionicons name="filter" size={14} color="#1565C0" style={{ marginRight: 6 }} />
          <Text style={styles.filterBannerText}>Subject: {subjectFilter}</Text>
          <TouchableOpacity onPress={() => setSubjectFilter(null)} style={{ marginLeft: 'auto' }}>
            <Ionicons name="close-circle" size={18} color="#1565C0" />
          </TouchableOpacity>
        </View>
      )}

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
          <ActivityIndicator size="large" color={PRIMARY} />
        </View>
      ) : isEmpty ? (
        <View style={styles.center}>
          <Ionicons name="people-outline" size={48} color="#ccc" />
          <Text style={styles.emptyText}>No teachers found</Text>
        </View>
      ) : (
        <GroupedList
          data={displayedTeachers}
          groups={TEACHER_GROUPS}
          keyExtractor={(t) => t.id}
          renderItem={renderTeacher}
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('TeacherForm', { mode: 'add' })}
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
  filterBanner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#E3F2FD', paddingHorizontal: 16, paddingVertical: 8,
    borderBottomWidth: 0.5, borderBottomColor: '#BBDEFB',
  },
  filterBannerText: { fontSize: 13, fontWeight: '600', color: '#1565C0' },
  selectionBanner: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: Colors.lightPink, paddingHorizontal: 16, paddingVertical: 8,
  },
  selectionText: { fontSize: 13, fontWeight: '600', color: PRIMARY },
  clearText: { fontSize: 13, color: PRIMARY, textDecorationLine: 'underline' },
  center: { ...KStyles.center, gap: 12, paddingTop: 80 },
  emptyText: { fontSize: 14, color: '#aaa' },
  fab: KStyles.fab,
});
