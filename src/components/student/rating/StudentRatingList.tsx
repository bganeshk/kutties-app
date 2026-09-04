import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  TextInput, SafeAreaView, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '../../../navigation/HomeStack';
import { Colors, KStyles } from '../../../styles/kutties-styles';
import { useStudentRatings, type ListEntry } from './useStudentRatings';
import { fmtRating } from './ratingUtils';

const PRIMARY = Colors.primary;

type Props = NativeStackScreenProps<HomeStackParamList, 'StudentRatingList'>;

// ── Course section header ─────────────────────────────────────────────────────

function CourseHeader({ course, count }: { course: string; count: number }) {
  return (
    <View style={styles.courseHeader}>
      <Text style={styles.courseHeaderEmoji}>📘</Text>
      <Text style={styles.courseHeaderText} numberOfLines={1}>{course}</Text>
      <Text style={styles.courseHeaderCount}>{count} student{count !== 1 ? 's' : ''}</Text>
    </View>
  );
}

// ── Student rating row ────────────────────────────────────────────────────────

function StudentRatingRow({
  data,
  onPress,
}: {
  data: import('./useStudentRatings').StudentRating;
  onPress: () => void;
}) {
  const { student, overallRating, academicRating, activityRating, activityCount } = data;
  const name = student.fullName ?? student.regNumber ?? '—';
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <TouchableOpacity style={styles.rowCard} onPress={onPress} activeOpacity={0.75}>
      {/* Avatar */}
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initials || '?'}</Text>
      </View>

      {/* Info */}
      <View style={styles.rowInfo}>
        {/* Row 1: name + overall */}
        <View style={styles.rowTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowName} numberOfLines={1}>{name}</Text>
            {student.regNumber ? (
              <Text style={styles.rowReg}>{student.regNumber}</Text>
            ) : null}
          </View>
          <View style={styles.overallBadge}>
            <Text style={styles.overallLabel}>Overall Rating</Text>
            <View style={styles.overallScoreRow}>
              <Text style={styles.overallStar}>★</Text>
              <Text style={styles.overallValue}>{fmtRating(overallRating)}</Text>
            </View>
          </View>
        </View>

        {/* Row 2: sub-scores */}
        <View style={styles.rowBottom}>
          <Text style={styles.subScore}>Academic: <Text style={styles.subScoreVal}>{fmtRating(academicRating)}</Text></Text>
          <Text style={styles.subScoreDot}>·</Text>
          <Text style={styles.subScore}>Activity: <Text style={styles.subScoreVal}>{fmtRating(activityRating)}</Text></Text>
          <Text style={styles.subScoreDot}>·</Text>
          <Text style={styles.subScore}>Activities: <Text style={styles.subScoreVal}>{activityCount}</Text></Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function StudentRatingList({ navigation }: Props) {
  const { loading, syncing, error, buildList, courses, sync } = useStudentRatings();
  const [search, setSearch]           = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [courseMenuOpen, setCourseMenuOpen] = useState(false);

  const listData = buildList(search, courseFilter);

  const renderItem = useCallback(
    ({ item }: { item: ListEntry }) => {
      if (item.type === 'course') {
        return <CourseHeader course={item.course} count={item.count} />;
      }
      return (
        <StudentRatingRow
          data={item.data}
          onPress={() =>
            navigation.navigate('StudentRatingDetail', { student: item.data.student })
          }
        />
      );
    },
    [navigation],
  );

  const keyExtractor = useCallback((item: ListEntry) => {
    if (item.type === 'course') return `course-${item.course}`;
    return `student-${item.data.student.regNumber ?? item.data.student.id}`;
  }, []);

  return (
    <SafeAreaView style={KStyles.listRoot}>
      {/* Header */}
      <View style={KStyles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={KStyles.headerTitle}>Student Ratings</Text>
        <TouchableOpacity
          onPress={() => sync()}
          disabled={syncing}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={KStyles.headerIcon}
        >
          {syncing
            ? <ActivityIndicator size={18} color="#fff" />
            : <Ionicons name="sync-outline" size={22} color="#fff" />
          }
        </TouchableOpacity>
      </View>

      {/* Error */}
      {error ? <Text style={KStyles.errorBanner}>{error}</Text> : null}

      {/* Search + Course filter */}
      <View style={styles.filterRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={16} color={Colors.muted} style={KStyles.searchIcon} />
          <TextInput
            style={KStyles.searchInput}
            placeholder="Search name or reg no…"
            placeholderTextColor={Colors.muted}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color={Colors.muted} />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={styles.courseFilterBtn}
          onPress={() => setCourseMenuOpen((v) => !v)}
          activeOpacity={0.8}
        >
          <Text style={styles.courseFilterText} numberOfLines={1}>
            {courseFilter || 'All Courses'}
          </Text>
          <Ionicons
            name={courseMenuOpen ? 'chevron-up' : 'chevron-down'}
            size={14}
            color={PRIMARY}
          />
        </TouchableOpacity>
      </View>

      {/* Course dropdown */}
      {courseMenuOpen && (
        <View style={styles.courseDropdown}>
          {[{ label: 'All Courses', value: '' }, ...courses.map((c) => ({ label: c, value: c }))].map(
            ({ label, value }) => (
              <TouchableOpacity
                key={value || '__all__'}
                style={[
                  styles.courseDropdownItem,
                  courseFilter === value && styles.courseDropdownItemActive,
                ]}
                onPress={() => {
                  setCourseFilter(value);
                  setCourseMenuOpen(false);
                }}
              >
                <Text
                  style={[
                    styles.courseDropdownItemText,
                    courseFilter === value && styles.courseDropdownItemTextActive,
                  ]}
                >
                  {label}
                </Text>
                {courseFilter === value && (
                  <Ionicons name="checkmark" size={14} color={PRIMARY} />
                )}
              </TouchableOpacity>
            ),
          )}
        </View>
      )}

      {/* List */}
      {loading ? (
        <View style={KStyles.center}>
          <ActivityIndicator size="large" color={PRIMARY} />
        </View>
      ) : listData.length === 0 ? (
        <View style={KStyles.center}>
          <Ionicons name="star-outline" size={48} color="#ccc" />
          <Text style={[KStyles.emptyText, { marginTop: 12, textAlign: 'center' }]}>
            No student records found.{'\n'}Sync to load data.
          </Text>
        </View>
      ) : (
        <FlatList
          data={listData}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
        />
      )}
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 4,
    gap: 8,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    elevation: 1,
    boxShadow: '0px 1px 3px rgba(0,0,0,0.05)',
  } as any,
  courseFilterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 4,
    maxWidth: 130,
    elevation: 1,
    boxShadow: '0px 1px 3px rgba(0,0,0,0.05)',
  } as any,
  courseFilterText: { fontSize: 13, color: PRIMARY, fontWeight: '600', flexShrink: 1 },
  courseDropdown: {
    marginHorizontal: 10,
    backgroundColor: Colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    maxHeight: 220,
    overflow: 'hidden',
    elevation: 4,
  },
  courseDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
  },
  courseDropdownItemActive:     { backgroundColor: Colors.lightPink },
  courseDropdownItemText:       { fontSize: 14, color: '#1A1A1A' },
  courseDropdownItemTextActive: { color: PRIMARY, fontWeight: '700' },

  listContent: { paddingBottom: 24 },

  // Section header
  courseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3E5F5',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: '#CE93D8',
  },
  courseHeaderEmoji: { fontSize: 16, marginRight: 8 },
  courseHeaderText: {
    flex: 1, fontSize: 14, fontWeight: '700', color: '#4A148C',
  },
  courseHeaderCount: { fontSize: 12, color: '#7B1FA2', fontWeight: '600' },

  // Student row
  rowCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  avatarText:  { fontSize: 16, fontWeight: '700', color: '#fff' },
  rowInfo:     { flex: 1 },
  rowTop:      { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 4 },
  rowName:     { fontSize: 14, fontWeight: '700', color: '#1A1A1A' },
  rowReg:      { fontSize: 11, color: Colors.muted, marginTop: 1 },
  overallBadge: {
    flexDirection: 'column',
    alignItems: 'center',
    backgroundColor: '#FFF8E1',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginLeft: 8,
  },
  overallLabel: { fontSize: 9, color: '#F57F17', fontWeight: '600', marginBottom: 1 },
  overallScoreRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  overallStar:  { fontSize: 13, color: '#F57F17' },
  overallValue: { fontSize: 13, fontWeight: '700', color: '#E65100' },
  rowBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 2,
  },
  subScore:    { fontSize: 11, color: Colors.muted },
  subScoreVal: { fontWeight: '700', color: '#444' },
  subScoreDot: { fontSize: 11, color: Colors.muted, marginHorizontal: 2 },
});
