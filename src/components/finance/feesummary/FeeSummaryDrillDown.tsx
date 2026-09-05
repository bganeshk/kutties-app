import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, SectionList, StyleSheet, SafeAreaView,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '../../../navigation/HomeStack';
import { Colors, KStyles } from '../../../styles/kutties-styles';
import { SHEETS } from '../../../utils/constants';
import { studentFeeRepository, studentRepository } from '../../../db/repositories';
import { syncSheet } from '../../../sync/sync.service';
import type { StudentFeeModel } from '../../../db/models/studentfee.model';
import FeeSummaryStudentRow from './FeeSummaryStudentRow';

type Props = NativeStackScreenProps<HomeStackParamList, 'FeeSummaryDrillDown'>;

// ── Helpers ───────────────────────────────────────────────────────────────────

const MON: Record<string, string> = {
  jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
  jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
};

function toMonthKey(dateStr: string | undefined): string {
  if (!dateStr) return '';
  const dm = dateStr.match(/^(\d{1,2})\/([A-Za-z]{3})\/(\d{4})$/);
  if (dm) {
    const m = MON[dm[2].toLowerCase()];
    return m ? `${dm[3]}-${m}` : '';
  }
  const im = dateStr.match(/^(\d{4})-(\d{2})/);
  if (im) return `${im[1]}-${im[2]}`;
  return '';
}

function fmt(val: number): string {
  return `₹${val.toLocaleString('en-IN', { minimumFractionDigits: 0 })}`;
}

interface CourseSection {
  course: string;  // display name
  data: StudentFeeModel[];
  collected: number;
  pending: number;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function FeeSummaryDrillDown({ navigation, route }: Props) {
  const { monthKey, monthLabel } = route.params;

  const [sections, setSections]         = useState<CourseSection[]>([]);
  const [studentMap, setStudentMap]     = useState<Map<string, string>>(new Map());
  const [collapsed, setCollapsed]       = useState<Set<string>>(new Set());
  const [loading, setLoading]           = useState(true);
  const didSync = useRef(false);

  // Totals for the banner
  const totalCollected = sections.reduce((s, c) => s + c.collected, 0);
  const totalPending   = sections.reduce((s, c) => s + c.pending, 0);
  const totalRecords   = sections.reduce((s, c) => s + c.data.length, 0);

  const loadData = useCallback(async () => {
    setLoading(true);

    // 1. Load all students → build regNumber → { fullName, course } map
    const students = await studentRepository.findAll();
    const sMap = new Map<string, { name: string; course: string }>();
    for (const s of students) {
      if (s.regNumber) {
        sMap.set(s.regNumber.toLowerCase(), {
          name:   s.fullName ?? s.regNumber,
          course: s.course ?? '',
        });
      }
    }

    // 2. Load fee records for this month:
    //    - paid records matched by paidDate month
    //    - pending/partial records matched by dueDate month
    const allFees = await studentFeeRepository.findAll();
    const monthFees = allFees.filter((f) => {
      const status = (f.status ?? '').trim().toLowerCase();
      if (status === 'paid') return toMonthKey(f.paidDate) === monthKey;
      return toMonthKey(f.dueDate) === monthKey;
    });

    // 3. Build regNumber → display name map (for the row component)
    const nameMap = new Map<string, string>();
    for (const f of monthFees) {
      const key = (f.regNumber ?? '').toLowerCase();
      const entry = sMap.get(key);
      if (entry && f.regNumber) nameMap.set(f.regNumber, entry.name);
    }
    setStudentMap(nameMap);

    // 4. Group by course
    const courseMap = new Map<string, StudentFeeModel[]>();
    for (const f of monthFees) {
      const key = (f.regNumber ?? '').toLowerCase();
      const course = sMap.get(key)?.course?.trim() || 'Unassigned';
      const list = courseMap.get(course) ?? [];
      list.push(f);
      courseMap.set(course, list);
    }

    // 5. Build sections sorted alphabetically, Unassigned last
    const built: CourseSection[] = [];
    for (const [course, data] of courseMap.entries()) {
      const collected = data
        .filter((f) => (f.status ?? '').trim().toLowerCase() === 'paid')
        .reduce((s, f) => s + (f.amount ?? 0), 0);
      const pending = data
        .filter((f) => (f.status ?? '').trim().toLowerCase() !== 'paid')
        .reduce((s, f) => s + (f.amount ?? 0), 0);
      built.push({ course, data, collected, pending });
    }
    built.sort((a, b) => {
      if (a.course === 'Unassigned') return 1;
      if (b.course === 'Unassigned') return -1;
      return a.course.localeCompare(b.course);
    });

    setSections(built);
    setLoading(false);
  }, [monthKey]);

  const syncAndLoad = useCallback(async () => {
    await syncSheet(SHEETS.STUDENT_FEE);
    await loadData();
  }, [loadData]);

  useFocusEffect(
    useCallback(() => {
      if (!didSync.current) {
        didSync.current = true;
        syncAndLoad();
      } else {
        loadData();
      }
    }, [syncAndLoad, loadData]),
  );

  const toggleCollapse = useCallback((course: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(course)) next.delete(course);
      else next.add(course);
      return next;
    });
  }, []);

  // SectionList needs sections with items shown/hidden by rewriting data
  const visibleSections = sections.map((s) => ({
    ...s,
    data: collapsed.has(s.course) ? [] : s.data,
  }));

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
        <Text style={KStyles.headerTitle} numberOfLines={1}>{monthLabel}</Text>
      </View>

      {/* Month totals banner */}
      {!loading && sections.length > 0 && (
        <View style={styles.banner}>
          <View style={styles.bannerCell}>
            <Text style={styles.bannerValue}>{fmt(totalCollected)}</Text>
            <Text style={styles.bannerLabel}>Collected</Text>
          </View>
          <View style={styles.bannerDivider} />
          <View style={styles.bannerCell}>
            <Text style={[styles.bannerValue, styles.pendingColor]}>{fmt(totalPending)}</Text>
            <Text style={styles.bannerLabel}>Pending</Text>
          </View>
          <View style={styles.bannerDivider} />
          <View style={styles.bannerCell}>
            <Text style={styles.bannerValue}>{totalRecords}</Text>
            <Text style={styles.bannerLabel}>Records</Text>
          </View>
        </View>
      )}

      {loading ? (
        <View style={KStyles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <SectionList
          sections={visibleSections}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          stickySectionHeadersEnabled={false}
          ListEmptyComponent={
            <View style={KStyles.center}>
              <Text style={KStyles.emptyText}>No fee records for this month.</Text>
            </View>
          }
          renderSectionHeader={({ section }) => {
            const isCollapsed = collapsed.has(section.course);
            return (
              <TouchableOpacity
                style={styles.sectionHeader}
                activeOpacity={0.75}
                onPress={() => toggleCollapse(section.course)}
              >
                <View style={styles.sectionLeft}>
                  <Text style={styles.sectionTitle}>{section.course}</Text>
                  <Text style={styles.sectionMeta}>
                    {section.data.length} record{section.data.length !== 1 ? 's' : ''}
                    {'  '}
                    <Text style={styles.collectedInline}>{fmt(section.collected)}</Text>
                    {section.pending > 0
                      ? <Text style={styles.pendingInline}>{'  '}pending {fmt(section.pending)}</Text>
                      : null}
                  </Text>
                </View>
                <Ionicons
                  name={isCollapsed ? 'chevron-down' : 'chevron-up'}
                  size={16}
                  color={Colors.muted}
                />
              </TouchableOpacity>
            );
          }}
          renderItem={({ item }) => (
            <FeeSummaryStudentRow
              item={item}
              studentName={studentMap.get(item.regNumber ?? '')}
              onPress={(fee) => navigation.navigate('StudentFeeDetails', { item: fee })}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  list: { paddingBottom: 32 },
  banner: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    elevation: 1,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E0E0E0',
  },
  bannerCell:    { flex: 1, alignItems: 'center' },
  bannerDivider: { width: 1, backgroundColor: '#E0E0E0', marginVertical: 4 },
  bannerValue:   { fontSize: 15, fontWeight: '700', color: '#1A1A1A' },
  bannerLabel:   { fontSize: 11, color: Colors.muted, marginTop: 2 },
  pendingColor:  { color: '#C62828' },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E0E0E0',
    marginTop: 4,
  },
  sectionLeft:      { flex: 1 },
  sectionTitle:     { fontSize: 13, fontWeight: '700', color: '#1A1A1A' },
  sectionMeta:      { fontSize: 12, color: Colors.muted, marginTop: 1 },
  collectedInline:  { color: '#2E7D32', fontWeight: '600' },
  pendingInline:    { color: '#C62828', fontWeight: '600' },
});
