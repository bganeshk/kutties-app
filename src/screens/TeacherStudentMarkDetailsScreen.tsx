import React, { useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '../navigation/HomeStack';
import { Colors, KStyles } from '../styles/kutties-styles';
import { useTeacherStudentMarks } from '../components/teachers/studentmark/useTeacherStudentMarks';
import { GRADE_SCORE } from '../db/models/studentmarksheet.model';

const PRIMARY = Colors.primary;

type Props = NativeStackScreenProps<HomeStackParamList, 'TeacherStudentMarkDetails'>;

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtRating(v: number | null | undefined): string {
  if (v == null) return '—';
  return v.toFixed(1);
}

const GRADE_ENTRIES = Object.entries(GRADE_SCORE).sort(([, a], [, b]) => b - a);

function avgGradeLabel(grades: string[]): string | null {
  const scores = grades
    .map((g) => GRADE_SCORE[g])
    .filter((v): v is number => v != null);
  if (scores.length === 0) return null;
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  let best = GRADE_ENTRIES[0];
  let bestDiff = Math.abs(best[1] - avg);
  for (const entry of GRADE_ENTRIES) {
    const diff = Math.abs(entry[1] - avg);
    if (diff < bestDiff) { bestDiff = diff; best = entry; }
  }
  return best[0];
}

function initials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('') || '?';
}

// ── Subject card ─────────────────────────────────────────────────────────────

interface SubjectEntry {
  examName: string;
  grade: string;
  norm_rating?: number;
}

function SubjectCard({
  subject,
  entries,
}: {
  subject: string;
  entries: SubjectEntry[];
}) {
  const avgRating = useMemo<number | null>(() => {
    const vals = entries
      .map((e) => e.norm_rating)
      .filter((v): v is number => v != null);
    if (vals.length === 0) return null;
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  }, [entries]);

  const avgGrade = useMemo(
    () => avgGradeLabel(entries.map((e) => e.grade).filter(Boolean)),
    [entries],
  );

  return (
    <View style={styles.subjectCard}>
      {/* Card header */}
      <View style={styles.subjectCardHeader}>
        <Ionicons name="book-outline" size={15} color={PRIMARY} style={{ marginRight: 6 }} />
        <Text style={styles.subjectCardTitle}>{subject}</Text>
        {avgGrade != null && (
          <View style={styles.avgGradeBadge}>
            <Text style={styles.avgGradeBadgeText}>{avgGrade}</Text>
          </View>
        )}
      </View>

      {/* Column header */}
      <View style={styles.tableHeader}>
        <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Exam Type</Text>
        <Text style={styles.tableHeaderCell}>Grade</Text>
      </View>

      {/* Rows */}
      {entries.map((entry, idx) => (
        <View key={idx} style={styles.tableRow}>
          <Text style={[styles.tableCell, { flex: 2 }]} numberOfLines={1}>
            {entry.examName || '—'}
          </Text>
          <Text style={[styles.tableCell, styles.gradeCell]}>{entry.grade || '—'}</Text>
        </View>
      ))}

      {/* Footer: avg rating + avg grade */}
      {(avgRating != null || avgGrade != null) && (
        <View style={styles.subjectCardFooter}>
          {avgRating != null && (
            <Text style={styles.subjectCardFooterText}>
              Avg norm_rating: <Text style={styles.subjectCardFooterValue}>{fmtRating(avgRating)}</Text>
            </Text>
          )}
          {avgGrade != null && (
            <Text style={[styles.subjectCardFooterText, { marginTop: avgRating != null ? 2 : 0 }]}>
              Avg grade: <Text style={[styles.subjectCardFooterValue, { color: '#2E7D32' }]}>{avgGrade}</Text>
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function TeacherStudentMarkDetailsScreen({ navigation, route }: Props) {
  const { teacherEmail, regNumber, studentName } = route.params;

  const { rows, loading } = useTeacherStudentMarks();

  // Filter to this student
  const studentRows = useMemo(
    () => rows.filter((r) => (r.mark.regNumber ?? '').toLowerCase() === regNumber.toLowerCase()),
    [rows, regNumber],
  );

  const displayName = studentName ?? studentRows[0]?.studentName ?? regNumber;
  const course = studentRows[0]?.courseDivision ?? '';

  // Avg norm_rating for this student (teacher-scoped)
  const avgNormRating = useMemo<number | null>(() => {
    const vals = studentRows
      .map((r) => r.mark.norm_rating)
      .filter((v): v is number => v != null);
    if (vals.length === 0) return null;
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  }, [studentRows]);

  // Group by subject, sorted A→Z
  const subjectGroups = useMemo<Map<string, SubjectEntry[]>>(() => {
    const map = new Map<string, SubjectEntry[]>();
    for (const r of studentRows) {
      const subj = r.mark.subject ?? 'Unknown';
      if (!map.has(subj)) map.set(subj, []);
      map.get(subj)!.push({
        examName:    r.mark.examName ?? '',
        grade:       r.mark.grade ?? '',
        norm_rating: r.mark.norm_rating,
      });
    }
    return new Map([...map.entries()].sort(([a], [b]) => a.localeCompare(b)));
  }, [studentRows]);

  return (
    <SafeAreaView style={KStyles.detailsRoot}>
      {/* Header */}
      <View style={KStyles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={KStyles.headerTitle} numberOfLines={1}>Student Mark Details</Text>
        <View style={{ width: 36 }} />
      </View>

      {loading ? (
        <View style={KStyles.center}>
          <ActivityIndicator size="large" color={PRIMARY} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          {/* Hero card */}
          <View style={styles.heroCard}>
            <View style={styles.heroAvatar}>
              <Text style={styles.heroAvatarText}>{initials(displayName)}</Text>
            </View>
            <Text style={styles.heroName}>{displayName}</Text>
            <Text style={styles.heroReg}>{regNumber}</Text>
            {course ? (
              <View style={styles.courseBadge}>
                <Text style={styles.courseBadgeText}>{course}</Text>
              </View>
            ) : null}
          </View>

          {/* Avg rating chip */}
          {avgNormRating != null && (
            <View style={styles.ratingChipRow}>
              <View style={styles.ratingChip}>
                <Text style={styles.ratingChipLabel}>Avg Rating</Text>
                <Text style={styles.ratingChipValue}>★ {fmtRating(avgNormRating)}</Text>
              </View>
            </View>
          )}

          {/* Subject cards */}
          {subjectGroups.size === 0 ? (
            <View style={{ alignItems: 'center', marginTop: 40 }}>
              <Ionicons name="document-outline" size={48} color="#ccc" />
              <Text style={{ color: Colors.muted, marginTop: 12 }}>No mark records found.</Text>
            </View>
          ) : (
            Array.from(subjectGroups.entries()).map(([subject, entries]) => (
              <SubjectCard key={subject} subject={subject} entries={entries} />
            ))
          )}

          <View style={{ height: 32 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 14, paddingTop: 16, paddingBottom: 24 },

  // Hero
  heroCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
    marginBottom: 12,
    elevation: 2,
    boxShadow: '0px 2px 4px rgba(0,0,0,0.08)',
  } as any,
  heroAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  heroAvatarText: { fontSize: 22, fontWeight: '700', color: '#fff' },
  heroName: { fontSize: 18, fontWeight: '700', color: '#1A1A1A', marginBottom: 4 },
  heroReg:  { fontSize: 13, color: Colors.muted },
  courseBadge: {
    marginTop: 8,
    backgroundColor: Colors.lightPink,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  courseBadgeText: { fontSize: 12, color: PRIMARY, fontWeight: '700' },

  // Rating chip
  ratingChipRow: { alignItems: 'center', marginBottom: 14 },
  ratingChip: {
    backgroundColor: '#FFF8E1',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    elevation: 1,
  },
  ratingChipLabel: { fontSize: 12, color: '#F57F17', fontWeight: '600' },
  ratingChipValue: { fontSize: 16, fontWeight: '700', color: '#E65100' },

  // Subject card
  subjectCard: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    marginBottom: 12,
    overflow: 'hidden',
    elevation: 1,
    boxShadow: '0px 1px 3px rgba(0,0,0,0.06)',
  } as any,
  subjectCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3E5F5',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: '#CE93D8',
  },
  subjectCardTitle: { fontSize: 14, fontWeight: '700', color: '#4A148C', flex: 1 },
  avgGradeBadge: {
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A5D6A7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginLeft: 8,
  },
  avgGradeBadgeText: { fontSize: 12, fontWeight: '700', color: '#2E7D32' },

  // Table inside card
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F9F9F9',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
  },
  tableHeaderCell: {
    flex: 1,
    fontSize: 10,
    fontWeight: '700',
    color: Colors.muted,
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
  },
  tableCell:  { flex: 1, fontSize: 13, color: '#222' },
  gradeCell:  { fontWeight: '700', color: PRIMARY },

  // Footer
  subjectCardFooter: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#FAFAFA',
    borderTopWidth: 0.5,
    borderTopColor: Colors.border,
  },
  subjectCardFooterText:  { fontSize: 12, color: Colors.muted },
  subjectCardFooterValue: { fontWeight: '700', color: '#333' },
});
