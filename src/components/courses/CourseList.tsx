import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, TextInput, StyleSheet, Text, FlatList,
  SafeAreaView, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useSheet } from '../../hooks/useSheet';
import { courseRepository } from '../../db/repositories';
import type { CourseModel } from '../../db/models';
import CourseRow from './CourseRow';
import { Colors, KStyles } from '../../styles/kutties-styles';

type Course = CourseModel;

const PRIMARY = Colors.primary;

interface Props {
  navigation: any;
}

export default function CourseList({ navigation }: Props) {
  const { syncing, sync } = useSheet('courses');
  const synced = useRef(false);
  const [search, setSearch]   = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [courses, setCourses] = useState<Course[]>([]);

  const loadCourses = useCallback(async () => {
    const results = search.trim()
      ? await courseRepository.search(search)
      : await courseRepository.findAll();
    setCourses(
      results.sort((a, b) =>
        String(a.courseName ?? '').localeCompare(String(b.courseName ?? '')),
      ),
    );
  }, [search]);

  useEffect(() => { loadCourses(); }, [loadCourses]);

  useFocusEffect(useCallback(() => { loadCourses(); }, [loadCourses]));

  useEffect(() => {
    if (!synced.current) {
      synced.current = true;
      sync().then(() => loadCourses());
    }
  }, []);

  const toggleSelect = useCallback((item: Course) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(item.id) ? next.delete(item.id) : next.add(item.id);
      return next;
    });
  }, []);

  const handlePress = useCallback((item: Course) => {
    if (selectedIds.size > 0) {
      toggleSelect(item);
    } else {
      navigation.navigate('CourseDetails', { item });
    }
  }, [selectedIds, navigation, toggleSelect]);

  const renderCourse = useCallback((item: Course) => (
    <CourseRow
      item={item}
      selected={selectedIds.has(item.id)}
      onPress={handlePress}
      onLongPress={toggleSelect}
    />
  ), [selectedIds, handlePress, toggleSelect]);

  const isEmpty = courses.length === 0;

  return (
    <SafeAreaView style={KStyles.listRoot}>
      {/* Header */}
      <View style={KStyles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={KStyles.headerTitle}>Courses</Text>
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
          placeholder="Search by name, teacher, subject…"
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
          <ActivityIndicator size="large" color={PRIMARY} />
        </View>
      ) : isEmpty ? (
        <View style={styles.center}>
          <Ionicons name="school-outline" size={48} color="#ccc" />
          <Text style={KStyles.emptyText}>No courses found</Text>
        </View>
      ) : (
        <FlatList
          data={courses}
          keyExtractor={(c) => c.id}
          renderItem={({ item }) => renderCourse(item)}
          contentContainerStyle={{ paddingBottom: 80 }}
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={KStyles.fab}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('CourseForm', { mode: 'add' })}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: { ...KStyles.center, gap: 12, paddingTop: 80 },
});
