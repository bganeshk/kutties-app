/**
 * Shared rating UI components used by both StudentRatingDetail and
 * TeacherRatingDetail.
 */
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../styles/kutties-styles';

const PRIMARY = Colors.primary;

// ── fmtRating (local copy so consumers don't need to import utils) ────────────

export function fmtRating(value: number | null | undefined): string {
  return value != null ? String(value) : '—';
}

// ── Collapsible card ──────────────────────────────────────────────────────────

export function CollapsibleCard({
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
    <View style={ratingStyles.card}>
      <TouchableOpacity
        style={ratingStyles.cardHeader}
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
      {open && <View style={ratingStyles.cardBody}>{children}</View>}
    </View>
  );
}

// ── Simple table ──────────────────────────────────────────────────────────────

export function TableHeader({ cols }: { cols: string[] }) {
  return (
    <View style={ratingStyles.tableRow}>
      {cols.map((c) => (
        <Text key={c} style={[ratingStyles.tableCell, ratingStyles.tableHeadCell]}>{c}</Text>
      ))}
    </View>
  );
}

export function TableRow({ cols }: { cols: string[] }) {
  return (
    <View style={[ratingStyles.tableRow, ratingStyles.tableDataRow]}>
      {cols.map((c, i) => (
        <Text key={i} style={ratingStyles.tableCell}>{c}</Text>
      ))}
    </View>
  );
}

// ── Overall rating banner ─────────────────────────────────────────────────────

export function RatingBanner({
  overallRating,
  academicRating,
  activityRating,
}: {
  overallRating: number | null | undefined;
  academicRating: number | null | undefined;
  activityRating: number | null | undefined;
}) {
  return (
    <View style={ratingStyles.overallBanner}>
      <View style={ratingStyles.overallTop}>
        <Text style={ratingStyles.overallStar}>★</Text>
        <Text style={ratingStyles.overallValue}>{fmtRating(overallRating ?? null)}</Text>
      </View>
      <Text style={ratingStyles.overallLabel}>Overall Rating</Text>
      <View style={ratingStyles.overallSubRow}>
        <View style={ratingStyles.overallSubItem}>
          <Text style={ratingStyles.overallSubLabel}>Academic</Text>
          <Text style={ratingStyles.overallSubVal}>{fmtRating(academicRating ?? null)}</Text>
        </View>
        <View style={ratingStyles.overallDivider} />
        <View style={ratingStyles.overallSubItem}>
          <Text style={ratingStyles.overallSubLabel}>Activity</Text>
          <Text style={ratingStyles.overallSubVal}>{fmtRating(activityRating ?? null)}</Text>
        </View>
      </View>
    </View>
  );
}

// ── Subject-row type (generic) ────────────────────────────────────────────────

export interface SharedSubjectRating {
  subject: string;
  avgNormRating: number;
  examCount: number;
}

// ── Academic section ──────────────────────────────────────────────────────────

export function AcademicSection({
  academicRating,
  subjectRatings,
  totalExams,
  emptyMessage = 'No mark sheet records found.',
}: {
  academicRating: number | null | undefined;
  subjectRatings: SharedSubjectRating[];
  totalExams: number;
  emptyMessage?: string;
}) {
  return (
    <CollapsibleCard
      header={
        <Text style={ratingStyles.cardTitle}>
          📚 Academic Rating —{' '}
          <Text style={ratingStyles.cardTitleVal}>{fmtRating(academicRating ?? null)}</Text>
        </Text>
      }
    >
      {subjectRatings.length === 0 ? (
        <Text style={ratingStyles.emptyText}>{emptyMessage}</Text>
      ) : (
        <>
          <TableHeader cols={['Subject', 'Avg Rating', 'Exams']} />
          {subjectRatings.map((r) => (
            <TableRow
              key={r.subject}
              cols={[r.subject, String(r.avgNormRating), String(r.examCount)]}
            />
          ))}
          <Text style={ratingStyles.tableFooter}>Total exams recorded: {totalExams}</Text>
        </>
      )}
    </CollapsibleCard>
  );
}

// ── Activity category row type ────────────────────────────────────────────────

export interface SharedActivityCategoryRow {
  category: string;
  count: number;
  avgRating: number;
  overdueCount: number;
}

// ── Activity category table ───────────────────────────────────────────────────

export function ActivityCategoryTable({
  rows,
  emptyMessage,
  total,
  totalLabel,
}: {
  rows: SharedActivityCategoryRow[];
  emptyMessage: string;
  total: number;
  totalLabel: string;
}) {
  if (rows.length === 0) {
    return <Text style={ratingStyles.emptyText}>{emptyMessage}</Text>;
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
      <Text style={ratingStyles.tableFooter}>{totalLabel}: {total}</Text>
    </>
  );
}

// ── Assignment section ────────────────────────────────────────────────────────

export function AssignmentSection({
  avgRating,
  closed,
  overdue,
  total,
  categories,
  emptyMessage = 'No assignments recorded.',
}: {
  avgRating: number | null | undefined;
  closed: number;
  overdue: number;
  total: number;
  categories: SharedActivityCategoryRow[];
  emptyMessage?: string;
}) {
  return (
    <CollapsibleCard
      header={
        <View>
          <Text style={ratingStyles.cardTitle}>📝 Assignments</Text>
          <View style={ratingStyles.cardMeta}>
            <Text style={ratingStyles.cardMetaItem}>Avg <Text style={ratingStyles.cardMetaVal}>{fmtRating(avgRating ?? null)}</Text></Text>
            <Text style={ratingStyles.cardMetaSep}>|</Text>
            <Text style={ratingStyles.cardMetaItem}>Closed <Text style={ratingStyles.cardMetaVal}>{closed}</Text></Text>
            {overdue > 0 && (
              <>
                <Text style={ratingStyles.cardMetaSep}>|</Text>
                <Text style={[ratingStyles.cardMetaItem, ratingStyles.overdueText]}>Overdue {overdue}</Text>
              </>
            )}
          </View>
        </View>
      }
    >
      <ActivityCategoryTable
        rows={categories}
        emptyMessage={emptyMessage}
        total={total}
        totalLabel="Total assignments"
      />
    </CollapsibleCard>
  );
}

// ── Task section ──────────────────────────────────────────────────────────────

export function TaskSection({
  avgRating,
  closed,
  overdue,
  total,
  categories,
  emptyMessage = 'No tasks recorded.',
}: {
  avgRating: number | null | undefined;
  closed: number;
  overdue: number;
  total: number;
  categories: SharedActivityCategoryRow[];
  emptyMessage?: string;
}) {
  return (
    <CollapsibleCard
      header={
        <View>
          <Text style={ratingStyles.cardTitle}>✅ Tasks</Text>
          <View style={ratingStyles.cardMeta}>
            <Text style={ratingStyles.cardMetaItem}>Avg <Text style={ratingStyles.cardMetaVal}>{fmtRating(avgRating ?? null)}</Text></Text>
            <Text style={ratingStyles.cardMetaSep}>|</Text>
            <Text style={ratingStyles.cardMetaItem}>Closed <Text style={ratingStyles.cardMetaVal}>{closed}</Text></Text>
            {overdue > 0 && (
              <>
                <Text style={ratingStyles.cardMetaSep}>|</Text>
                <Text style={[ratingStyles.cardMetaItem, ratingStyles.overdueText]}>Overdue {overdue}</Text>
              </>
            )}
          </View>
        </View>
      }
    >
      <ActivityCategoryTable
        rows={categories}
        emptyMessage={emptyMessage}
        total={total}
        totalLabel="Total tasks"
      />
    </CollapsibleCard>
  );
}

// ── Shared styles ─────────────────────────────────────────────────────────────

export const ratingStyles = StyleSheet.create({
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
  overallSubItem:  { flex: 1, alignItems: 'center' },
  overallSubLabel: { fontSize: 11, color: Colors.muted, marginBottom: 2 },
  overallSubVal:   { fontSize: 18, fontWeight: '700', color: '#333' },
  overallDivider:  { width: 1, height: 32, backgroundColor: Colors.border },

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
