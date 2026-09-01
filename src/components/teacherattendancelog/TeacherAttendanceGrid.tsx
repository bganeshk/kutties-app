import React, { memo, useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Pressable, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { TeacherAttendanceLogModel } from '../../db/models/teacherattendancelog.model';
import { Colors } from '../../styles/kutties-styles';
import { formatDisplayDate } from '../../utils/dateUtils';

const PRIMARY = Colors.primary;

/** "9:00:00 AM" → "9:00 AM",  "7:00:00 PM" → "7:00 PM",  others pass through */
function fmtTime(val?: string): string {
  if (!val) return '—';
  return val.replace(/^(\d{1,2}:\d{2}):\d{2}(\s*(AM|PM))$/i, '$1$2').trim();
}

// Column widths (px)
const COL = { label: 110, status: 72, time: 72, date: 88 };

const LEAVE_COLORS: Record<string, { bg: string; text: string }> = {
  Present:    { bg: '#F1F8E9', text: '#2E7D32' },
  'Half Day': { bg: '#FFF8E1', text: '#F57F17' },
  'Full Day': { bg: '#FFEBEE', text: '#C62828' },
};
const DEFAULT_LEAVE_COLOR = LEAVE_COLORS.Present;

export interface AttendanceGridSection {
  /** Section heading: teacher name (By Teacher) or month label (By Date) */
  name: string;
  count: number;
  rows: TeacherAttendanceLogModel[];
}

interface Props {
  sections: AttendanceGridSection[];
  /** 'teacher' → first col = Date; 'date' → first col = Teacher/Employee */
  mode: 'teacher' | 'date';
  /** Required for mode='date' to resolve email → display name */
  emailToName?: Record<string, string>;
  onRowPress: (item: TeacherAttendanceLogModel) => void;
  /** Label used for the person column and section tab. Defaults to 'Teacher'. */
  personLabel?: string;
}

/** Column header row */
function GridHeader({ firstColLabel, showDate }: { firstColLabel: string; showDate: boolean }) {
  return (
    <View style={styles.gridHeader}>
      <Text style={[styles.hCell, { width: COL.label }]}>{firstColLabel}</Text>
      <Text style={[styles.hCell, { width: COL.status }]}>Status</Text>
      <Text style={[styles.hCell, { width: COL.time }]}>In</Text>
      <Text style={[styles.hCell, { width: COL.time }]}>Out</Text>
      {showDate && <Text style={[styles.hCell, { width: COL.date }]}>Date</Text>}
    </View>
  );
}

/** Tooltip that appears as a Modal overlay anchored below the pressed cell */
const EmailTooltip = memo(({ email, onDismiss }: { email: string; onDismiss: () => void }) => (
  <Modal transparent animationType="fade" visible onRequestClose={onDismiss}>
    <Pressable style={styles.tooltipOverlay} onPress={onDismiss}>
      <View style={styles.tooltipBubble} pointerEvents="none">
        <Text style={styles.tooltipText} numberOfLines={1}>{email}</Text>
      </View>
    </Pressable>
  </Modal>
));

/** Single data row */
const GridRow = memo(({
  item,
  teacherName,
  teacherEmail,
  showDate,
  onPress,
}: {
  item: TeacherAttendanceLogModel;
  /** Resolved display name (for mode='date'); undefined means show email directly */
  teacherName?: string;
  /** Raw email (for mode='date' tooltip, or fallback when no name) */
  teacherEmail?: string;
  showDate: boolean;
  onPress: (item: TeacherAttendanceLogModel) => void;
}) => {
  const leaveOpt   = item.leaveOption ?? 'Present';
  const leaveStyle = LEAVE_COLORS[leaveOpt] ?? DEFAULT_LEAVE_COLOR;
  const isApproved = String(item.approved ?? '').toLowerCase() === 'true' || item.approved === '1';
  const [tooltipVisible, setTooltipVisible] = useState(false);

  // firstColValue is the date when mode='teacher', resolved above before passing props.
  // When this component is used in mode='date', teacherName/teacherEmail are supplied.
  const isPersonCol = teacherName !== undefined || teacherEmail !== undefined;
  const displayValue = isPersonCol
    ? (teacherName ?? teacherEmail ?? '—')
    : '—'; // date mode passes teacherName=undefined; caller sets firstColValue for date col

  return (
    <Pressable
      onPress={() => onPress(item)}
      android_ripple={{ color: 'rgba(194,24,91,0.08)' }}
      style={({ pressed }) => [styles.gridRow, pressed && styles.gridRowPressed]}
    >
      {tooltipVisible && teacherEmail && (
        <EmailTooltip email={teacherEmail} onDismiss={() => setTooltipVisible(false)} />
      )}
      <View style={[styles.dCellRow, { width: COL.label }]}>
        <Text style={isApproved ? styles.tickGreen : styles.crossRed}>
          {isApproved ? '✓' : '✗'}
        </Text>
        <Pressable
          onLongPress={isPersonCol && teacherName && teacherEmail
            ? () => setTooltipVisible(true)
            : undefined}
          delayLongPress={300}
          style={{ flex: 1 }}
        >
          <Text style={[styles.dCell, { flex: 1 }]} numberOfLines={1}>
            {displayValue}
          </Text>
          {isPersonCol && teacherName && teacherEmail && (
            <Text style={styles.emailHint} numberOfLines={1}>{teacherEmail}</Text>
          )}
        </Pressable>
      </View>
      <View style={{ width: COL.status, alignItems: 'center' }}>
        <View style={[styles.statusBadge, { backgroundColor: leaveStyle.bg }]}>
          <Text style={[styles.statusText, { color: leaveStyle.text }]} numberOfLines={1}>
            {leaveOpt === 'Present' ? 'Present' : leaveOpt === 'Half Day' ? 'Half' : 'Full'}
          </Text>
        </View>
      </View>
      <Text style={[styles.dCell, { width: COL.time }]} numberOfLines={1}>
        {fmtTime(item.checkIn)}
      </Text>
      <Text style={[styles.dCell, { width: COL.time }]} numberOfLines={1}>
        {fmtTime(item.checkOut)}
      </Text>
      {showDate && (
        <Text style={[styles.dCell, { width: COL.date }]} numberOfLines={1}>
          {item.attendanceDate ? formatDisplayDate(item.attendanceDate) : '—'}
        </Text>
      )}
    </Pressable>
  );
});


/** One collapsible section block */
const SectionBlock = memo(({
  section,
  mode,
  emailToName,
  onRowPress,
  defaultExpanded,
  personLabel,
}: {
  section: AttendanceGridSection;
  mode: 'teacher' | 'date';
  emailToName?: Record<string, string>;
  onRowPress: (item: TeacherAttendanceLogModel) => void;
  defaultExpanded?: boolean;
  personLabel?: string;
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded ?? false);
  const toggle = useCallback(() => setExpanded((v) => !v), []);

  const presentCount = section.rows.filter(
    (r) => (r.leaveOption ?? 'Present').toLowerCase() === 'present',
  ).length;
  const absentCount = section.count - presentCount;

  // Icon and first-column header depend on mode
 // const headerIcon  = mode === 'teacher' ? 'person-outline' : 'calendar-outline';
  const firstColLabel = mode === 'teacher' ? 'Date' : (personLabel ?? 'Teacher');

  return (
    <View style={styles.block}>
      {/* Section header */}
      <TouchableOpacity style={styles.sectionHeader} onPress={toggle} activeOpacity={0.75}>
        {/* <View style={styles.avatar}>
          <Ionicons name={headerIcon} size={16} color="#fff" />
        </View> */}

        <View style={{ flex: 1 }}>
          <View style={styles.summaryRow}>
          <Text style={styles.sectionTitle} numberOfLines={1}>{section.name}</Text>

            <View style={styles.summaryChip}>
              <Text style={styles.summaryP}>✓ {presentCount}</Text>
            </View>
            {absentCount > 0 && (
              <View style={[styles.summaryChip, styles.summaryAbsChip]}>
                <Text style={styles.summaryA}>✗ {absentCount}</Text>
              </View>
            )}
            <Text style={styles.summaryTotal}>{section.count} records</Text>
          </View>
        </View>

        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={PRIMARY}
          style={{ marginLeft: 6 }}
        />
      </TouchableOpacity>

      {/* Grid */}
      {expanded && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View>
            <GridHeader firstColLabel={firstColLabel} showDate={mode === 'date'} />
            {section.rows.map((item) => {
              if (mode === 'teacher') {
                // By-teacher view: first col is date, no email tooltip needed
                const dateVal = item.attendanceDate ? formatDisplayDate(item.attendanceDate) : '—';
                return (
                  <GridRow
                    key={item.id}
                    item={item}
                    teacherName={dateVal}
                    showDate={false}
                    onPress={onRowPress}
                  />
                );
              }
              // By-date view: first col is teacher name with email tooltip
              const email = item.teacherEmail ?? '';
              const name  = emailToName?.[email.toLowerCase()];
              return (
                <GridRow
                  key={item.id}
                  item={item}
                  teacherName={name}
                  teacherEmail={email || undefined}
                  showDate
                  onPress={onRowPress}
                />
              );
            })}
          </View>
        </ScrollView>
      )}
    </View>
  );
});

export default function TeacherAttendanceGrid({ sections, mode, emailToName, onRowPress, personLabel }: Props) {
  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 80 }}>
      {sections.map((s, index) => (
        <SectionBlock
          key={s.name}
          section={s}
          mode={mode}
          emailToName={emailToName}
          onRowPress={onRowPress}
          defaultExpanded={mode === 'date' && index === 0}
          personLabel={personLabel}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  block: {
    marginHorizontal: 12,
    marginTop: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: Colors.lightPink,
    borderLeftWidth: 3,
    borderLeftColor: PRIMARY,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    flexShrink: 0,
  },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#1a1a1a', flex: 1 },
  summaryRow:   { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
  summaryChip:  {
    paddingHorizontal: 6, paddingVertical: 1,
    borderRadius: 8, backgroundColor: '#E8F5E9',
  },
  summaryAbsChip: { backgroundColor: '#FFEBEE' },
  summaryP:     { fontSize: 11, fontWeight: '700', color: '#2E7D32' },
  summaryA:     { fontSize: 11, fontWeight: '700', color: '#C62828' },
  summaryTotal: { fontSize: 11, color: Colors.muted, fontWeight: '500' },

  gridHeader: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  hCell: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    paddingHorizontal: 4,
  },
  gridRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    backgroundColor: '#fff',
  },
  gridRowPressed: { backgroundColor: Colors.lightPink },
  dCellRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  tickGreen: { fontSize: 11, fontWeight: '700', color: '#2E7D32', marginRight: 3 },
  crossRed:  { fontSize: 11, fontWeight: '700', color: '#C62828', marginRight: 3 },
  dCell: {
    fontSize: 12,
    color: '#1a1a1a',
    paddingHorizontal: 4,
  },
  emailHint: {
    fontSize: 10,
    color: Colors.muted,
    paddingHorizontal: 4,
    marginTop: 1,
  },
  tooltipOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tooltipBubble: {
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    maxWidth: 280,
  },
  tooltipText: {
    fontSize: 13,
    color: '#fff',
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  statusText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },
});
