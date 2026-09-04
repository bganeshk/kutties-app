import React, { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Image, SafeAreaView, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '../../../navigation/HomeStack';
import { Colors, KStyles } from '../../../styles/kutties-styles';
import {
  STUDENT_STATUS_BG,
  STUDENT_STATUS_COLOR,
  STUDENT_STATUS_BORDER,
} from '../../../utils/constants';
import { useStudentRatings } from './useStudentRatings';
import { fmtRating } from './ratingUtils';
import type { ActivityCategoryRow, SubjectRating } from './ratingUtils';

const PRIMARY = Colors.primary;

type Props = NativeStackScreenProps<HomeStackParamList, 'StudentRatingDetail'>;

// ── Avatar helper ─────────────────────────────────────────────────────────────

function Avatar({ name, photo }: { name: string; photo?: string }) {
  if (photo) {
    return <Image source={{ uri: photo }} style={styles.avatar} />;
  }
  const letter = name.trim()[0]?.toUpperCase() ?? '?';
  return (
    <View style={styles.avatarPlaceholder}>
      <Text style={styles.avatarText}>{letter}</Text>
    </View>
  );
}

// ── Collapsible card ──────────────────────────────────────────────────────────

function CollapsibleCard({
  header,
  children,
  defaultOpen = true,
}: {
  header: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <View style={styles.card}>
      <TouchableOpacity
        style={styles.cardHeader}
        onPress={() => setOpen((v) => !v)}
        activeOpacity={0.75}
      >
        <View style={{ flex: 1 }}>{header}</View>
        <Ionicons
          name={open ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={Colors.muted}
        />
      </TouchableOpacity>
      {open && <View style={styles.cardBody}>{children}</View>}
    </View>
  );
}

// ── Simple table ──────────────────────────────────────────────────────────────

function TableHeader({ cols }: { cols: string[] }) {
  return (
    <View style={styles.tableRow}>
      {cols.map((c) => (
        <Text key={c} style={[styles.tableCell, styles.tableHeadCell]}>{c}</Text>
      ))}
    </View>
  );
}

function TableRow({ cols }: { cols: string[] }) {
  return (
    <View style={[styles.tableRow, styles.tableDataRow]}>
      {cols.map((c, i) => (
        <Text key={i} style={styles.tableCell}>{c}</Text>
      ))}
    </View>
  );
}

// ── Section 3 — Academic rating ───────────────────────────────────────────────

function AcademicSection({
  academicRating,
  subjectRatings,
  totalExams,
}: {
  academicRating: number | null;
  subjectRatings: SubjectRating[];
  totalExams: number;
}) {
  return (
    <CollapsibleCard
      header={
        <Text style={styles.cardTitle}>
          📚 Academic Rating — <Text style={styles.cardTitleVal}>{fmtRating(academicRating)}</Text>
        </Text>
      }
    >
      {subjectRatings.length === 0 ? (
        <Text style={styles.emptyText}>No mark sheet records found for this student.</Text>
      ) : (
        <>
          <TableHeader cols={['Subject', 'Avg Rating', 'Exams']} />
          {subjectRatings.map((r) => (
            <TableRow
              key={r.subject}
              cols={[r.subject, String(r.avgNormRating), String(r.examCount)]}
            />
          ))}
          <Text style={styles.tableFooter}>Total exams recorded: {totalExams}</Text>
        </>
      )}
    </CollapsibleCard>
  );
}

// ── Activity category table ───────────────────────────────────────────────────

function ActivityCategoryTable({
  rows,
  emptyMessage,
  total,
  totalLabel,
}: {
  rows: ActivityCategoryRow[];
  emptyMessage: string;
  total: number;
  totalLabel: string;
}) {
  if (rows.length === 0) {
    return <Text style={styles.emptyText}>{emptyMessage}</Text>;
  }
  return (
    <>
      <TableHeader cols={['Category', 'Count', 'Avg Rating', 'Overdue']} />
      {rows.map((r) => (
        <TableRow
          key={r.category}
          cols={[r.category, String(r.count), String(r.avgRating), String(r.overdueCount)]}
        />
      ))}
      <Text style={styles.tableFooter}>{totalLabel}: {total}</Text>
    </>
  );
}

// ── Section 4 — Assignments ───────────────────────────────────────────────────

function AssignmentSection({
  avgRating,
  closed,
  overdue,
  total,
  categories,
}: {
  avgRating: number | null;
  closed: number;
  overdue: number;
  total: number;
  categories: ActivityCategoryRow[];
}) {
  return (
    <CollapsibleCard
      header={
        <View>
          <Text style={styles.cardTitle}>📝 Assignments</Text>
          <View style={styles.cardMeta}>
            <Text style={styles.cardMetaItem}>Avg <Text style={styles.cardMetaVal}>{fmtRating(avgRating)}</Text></Text>
            <Text style={styles.cardMetaSep}>|</Text>
            <Text style={styles.cardMetaItem}>Closed <Text style={styles.cardMetaVal}>{closed}</Text></Text>
            <Text style={styles.cardMetaSep}>|</Text>
            {overdue > 0 && (
              <Text style={[styles.cardMetaItem, styles.overdueText]}>Overdue {overdue}</Text>
            )}
          </View>
        </View>
      }
    >
      <ActivityCategoryTable
        rows={categories}
        emptyMessage="No assignments recorded for this student."
        total={total}
        totalLabel="Total assignments"
      />
    </CollapsibleCard>
  );
}

// ── Section 5 — Tasks ─────────────────────────────────────────────────────────

function TaskSection({
  avgRating,
  closed,
  overdue,
  total,
  categories,
}: {
  avgRating: number | null;
  closed: number;
  overdue: number;
  total: number;
  categories: ActivityCategoryRow[];
}) {
  return (
    <CollapsibleCard
      header={
        <View>
          <Text style={styles.cardTitle}>✅ Tasks</Text>
          <View style={styles.cardMeta}>
            <Text style={styles.cardMetaItem}>Avg <Text style={styles.cardMetaVal}>{fmtRating(avgRating)}</Text></Text>
            <Text style={styles.cardMetaSep}>|</Text>
            <Text style={styles.cardMetaItem}>Closed <Text style={styles.cardMetaVal}>{closed}</Text></Text>
            <Text style={styles.cardMetaSep}>|</Text>
            {overdue > 0 && (
              <Text style={[styles.cardMetaItem, styles.overdueText]}>Overdue {overdue}</Text>
            )}
          </View>
        </View>
      }
    >
      <ActivityCategoryTable
        rows={categories}
        emptyMessage="No tasks recorded for this student."
        total={total}
        totalLabel="Total tasks"
      />
    </CollapsibleCard>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function StudentRatingDetail({ navigation, route }: Props) {
  const { student } = route.params;
  const { loading, ratings } = useStudentRatings();

  const data = useMemo(
    () =>
      ratings.find(
        (r) =>
          r.student.regNumber === student.regNumber ||
          r.student.id === student.id,
      ) ?? null,
    [ratings, student],
  );

  const name   = student.fullName ?? student.id;
  const status = student.status ?? 'active';

  if (loading) {
    return (
      <SafeAreaView style={KStyles.detailsRoot}>
        <View style={KStyles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={KStyles.headerTitle}>Student Rating</Text>
        </View>
        <View style={KStyles.center}>
          <ActivityIndicator size="large" color={PRIMARY} />
        </View>
      </SafeAreaView>
    );
  }

  const totalExams = data
    ? data.subjectRatings.reduce((s, r) => s + r.examCount, 0)
    : 0;

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
        <Text style={KStyles.headerTitle} numberOfLines={1}>Student Rating</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>

        {/* ── Section 1: Student header card ─────────────────────────────── */}
        <TouchableOpacity
          style={styles.heroCard}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('StudentDetails', { item: student })}
        >
          <View style={styles.heroAvatarWrap}>
            <Avatar name={String(name)} photo={student.idphoto} />
          </View>
          <View style={styles.heroInfo}>
            <Text style={styles.heroName} numberOfLines={1}>{name}</Text>
            {student.regNumber ? (
              <View style={styles.heroRegRow}>
                <Ionicons name="id-card-outline" size={12} color="rgba(255,255,255,0.75)" />
                <Text style={styles.heroReg}> {student.regNumber}</Text>
              </View>
            ) : null}
            <View style={styles.heroCourseRow}>
              <Ionicons name="school-outline" size={12} color="rgba(255,255,255,0.7)" />
              <Text style={styles.heroCourse} numberOfLines={1}> {student.course ?? '—'}</Text>
            </View>
            <View style={[
              KStyles.detailsStatusBadge,
              { backgroundColor: STUDENT_STATUS_BG[status] ?? '#F5F5F5', borderColor: STUDENT_STATUS_BORDER[status] ?? '#BDBDBD', alignSelf: 'flex-start', marginTop: 6 },
            ]}>
              <Text style={[KStyles.detailsStatusBadgeText, { color: STUDENT_STATUS_COLOR[status] ?? '#757575' }]}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.5)" />
        </TouchableOpacity>

        {/* ── Section 2: Overall rating banner ───────────────────────────── */}
        <View style={styles.overallBanner}>
          <View style={styles.overallTop}>
            <Text style={styles.overallStar}>★</Text>
            <Text style={styles.overallValue}>{fmtRating(data?.overallRating ?? null)}</Text>
          </View>
          <Text style={styles.overallLabel}>Overall Rating</Text>
          <View style={styles.overallSubRow}>
            <View style={styles.overallSubItem}>
              <Text style={styles.overallSubLabel}>Academic</Text>
              <Text style={styles.overallSubVal}>{fmtRating(data?.academicRating ?? null)}</Text>
            </View>
            <View style={styles.overallDivider} />
            <View style={styles.overallSubItem}>
              <Text style={styles.overallSubLabel}>Activity</Text>
              <Text style={styles.overallSubVal}>{fmtRating(data?.activityRating ?? null)}</Text>
            </View>
          </View>
        </View>

        {data == null ? (
          <Text style={[KStyles.emptyText, { textAlign: 'center', marginTop: 24 }]}>
            No rating data found for this student.
          </Text>
        ) : (
          <>
            {/* ── Section 3: Academic ──────────────────────────────────── */}
            <AcademicSection
              academicRating={data.academicRating}
              subjectRatings={data.subjectRatings}
              totalExams={totalExams}
            />

            {/* ── Section 4: Assignments ───────────────────────────────── */}
            <AssignmentSection
              avgRating={data.assignmentAvgRating}
              closed={data.assignmentClosed}
              overdue={data.assignmentOverdue}
              total={data.assignmentTotal}
              categories={data.assignmentCategories}
            />

            {/* ── Section 5: Tasks ─────────────────────────────────────── */}
            <TaskSection
              avgRating={data.taskAvgRating}
              closed={data.taskClosed}
              overdue={data.taskOverdue}
              total={data.taskTotal}
              categories={data.taskCategories}
            />
          </>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 14, paddingTop: 14, paddingBottom: 24 },

  // Hero card
  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PRIMARY,
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    elevation: 4,
    boxShadow: `0px 4px 12px ${PRIMARY}66`,
  } as any,
  heroAvatarWrap: {
    marginRight: 16,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  avatar: { width: 72, height: 72, borderRadius: 36 },
  avatarPlaceholder: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText:    { fontSize: 30, fontWeight: '700', color: '#fff' },
  heroInfo:      { flex: 1 },
  heroName:      { fontSize: 17, fontWeight: '700', color: '#fff', marginBottom: 4 },
  heroRegRow:    { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  heroReg:       { fontSize: 12, color: 'rgba(255,255,255,0.75)', fontWeight: '600' },
  heroCourseRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  heroCourse:    { fontSize: 12, color: 'rgba(255,255,255,0.7)' },

  // Overall banner
  overallBanner: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginBottom: 12,
    elevation: 2,
    boxShadow: '0px 2px 6px rgba(0,0,0,0.08)',
  } as any,
  overallTop:   { flexDirection: 'row', alignItems: 'center', gap: 6 },
  overallStar:  { fontSize: 36, color: '#F57F17' },
  overallValue: { fontSize: 40, fontWeight: '800', color: '#E65100' },
  overallLabel: { fontSize: 13, color: Colors.muted, marginTop: 4, marginBottom: 14 },
  overallSubRow: {
    flexDirection: 'row', alignItems: 'center',
    width: '100%', justifyContent: 'center', gap: 0,
  },
  overallSubItem: { flex: 1, alignItems: 'center' },
  overallSubLabel:{ fontSize: 11, color: Colors.muted, marginBottom: 2 },
  overallSubVal:  { fontSize: 18, fontWeight: '700', color: '#333' },
  overallDivider: { width: 1, height: 32, backgroundColor: Colors.border },

  // Collapsible card
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: Colors.border,
    overflow: 'hidden',
    marginBottom: 10,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
  },
  cardBody:    { paddingHorizontal: 14, paddingVertical: 10 },
  cardTitle:   { fontSize: 14, fontWeight: '700', color: '#1A1A1A' },
  cardTitleVal:{ color: PRIMARY },
  cardMeta:    { flexDirection: 'row', alignItems: 'center', marginTop: 3, flexWrap: 'wrap', gap: 4 },
  cardMetaItem:{ fontSize: 12, color: Colors.muted },
  cardMetaVal: { fontWeight: '700', color: '#333' },
  cardMetaSep: { fontSize: 12, color: Colors.border, marginHorizontal: 2 },
  overdueText: { color: '#C62828', fontWeight: '700' },

  // Table
  tableRow:     { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: Colors.border },
  tableDataRow: { backgroundColor: '#FAFAFA' },
  tableCell: {
    flex: 1,
    fontSize: 12,
    color: '#333',
    paddingVertical: 7,
    paddingHorizontal: 4,
  },
  tableHeadCell: { fontWeight: '700', color: Colors.muted, fontSize: 11, backgroundColor: '#F5F5F5' },
  tableFooter:   { fontSize: 11, color: Colors.muted, marginTop: 8, textAlign: 'right' },

  emptyText: { fontSize: 13, color: Colors.muted, textAlign: 'center', paddingVertical: 12 },
});
