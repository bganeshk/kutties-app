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
import { GroupedList, GroupLevel } from '../shared';
import { Colors, KStyles } from '../../styles/kutties-styles';
import { SHEETS } from '../../utils/constants';
type Teacher = TeacherModel;

const PRIMARY = Colors.primary;

const TEACHER_GROUP_BY: GroupLevel<Teacher>[] = [
  {
    keyOf: (t) => t.status ?? 'inactive',
    dotColor: (k) => k === 'active' ? '#2E7D32' : '#9E9E9E',
    bgColor:  (k) => k === 'active' ? '#F1F8E9' : '#F5F5F5',
    defaultExpanded: (k) => k === 'active',
  },
];

interface Props {
  navigation: any;
}

export default function TeacherList({ navigation }: Props) {
  const { syncing, sync } = useSheet(SHEETS.STAFF);
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
      onSchedulePress={(t) =>
        navigation.navigate('TeacherSchedule', {
          teacherEmail: t.email,
          teacherName: t.name,
        })
      }
    />
  ), [selectedIds, handlePress, toggleSelect, subjectFilter, toggleSubjectFilter, navigation]);

  const isEmpty = displayedTeachers.length === 0;

  return (
    <SafeAreaView style={KStyles.listRoot}>
      {/* Header */}
      <View style={KStyles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={KStyles.headerTitle}>Teachers</Text>
        <TouchableOpacity onPress={() => sync()} style={KStyles.headerIcon}>
          {syncing
            ? <ActivityIndicator size="small" color="#fff" />
            : <Ionicons name="refresh" size={22} color="#fff" />}
        </TouchableOpacity>
      </View>

      {/* Search bar */}
      <View style={KStyles.searchRow}>
        <Ionicons name="search" size={18} color="#999" style={KStyles.searchIcon} />
        <TextInput
          style={KStyles.searchInput}
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
        <View style={KStyles.selectionBanner}>
          <Text style={KStyles.selectionText}>{selectedIds.size} selected</Text>
          <TouchableOpacity onPress={() => setSelectedIds(new Set())}>
            <Text style={KStyles.clearText}>Clear</Text>
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
          <Text style={KStyles.emptyText}>No teachers found</Text>
        </View>
      ) : (
        <GroupedList
          data={displayedTeachers}
          groupBy={TEACHER_GROUP_BY}
          keyExtractor={(t) => t.id}
          renderItem={renderTeacher}
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={KStyles.fab}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('TeacherForm', { mode: 'add' })}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  filterBanner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#E3F2FD', paddingHorizontal: 16, paddingVertical: 8,
    borderBottomWidth: 0.5, borderBottomColor: '#BBDEFB',
  },
  filterBannerText: { fontSize: 13, fontWeight: '600', color: '#1565C0' },
  center: { ...KStyles.center, gap: 12, paddingTop: 80 },
});
