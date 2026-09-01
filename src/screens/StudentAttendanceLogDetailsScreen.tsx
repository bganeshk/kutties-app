import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '../navigation/HomeStack';
import { Colors, KStyles } from '../styles/kutties-styles';
import { SHEETS } from '../utils/constants';
import { studentAttendanceLogRepository, studentRepository } from '../db/repositories';
import type { StudentAttendanceLogModel } from '../db/models/studentattendancelog.model';
import type { StudentModel } from '../db/models/student.model';
import { syncSheet, twoWeeksAgo } from '../sync/sync.service';
import ConfirmDialog from '../components/shared/ConfirmDialog';
import InfoRow from '../components/shared/InfoRow';

const PRIMARY = Colors.primary;

type Props = NativeStackScreenProps<HomeStackParamList, 'StudentAttendanceLogDetails'>;

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  Present:    { bg: '#F1F8E9', text: '#2E7D32' },
  'Half Day': { bg: '#FFF8E1', text: '#F57F17' },
  'Full Day': { bg: '#FFEBEE', text: '#C62828' },
};

function Section({ title }: { title: string }) {
  return <Text style={KStyles.detailsSection}>{title}</Text>;
}

export default function StudentAttendanceLogDetailsScreen({ navigation, route }: Props) {
  const [item,          setItem]          = useState<StudentAttendanceLogModel>(route.params.item);
  const [studentRecord, setStudentRecord] = useState<StudentModel | undefined>(undefined);
  const [deleteVisible, setDeleteVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      studentAttendanceLogRepository.findById(route.params.item.id).then((fresh) => {
        if (fresh) setItem(fresh);
      });
    }, [route.params.item.id]),
  );

  // Resolve student record from regNumber
  React.useEffect(() => {
    if (!item.regNumber) return;
    studentRepository.findAll().then((students) => {
      const match = students.find(
        (s) => (s.regNumber ?? '').toLowerCase() === (item.regNumber ?? '').toLowerCase(),
      );
      setStudentRecord(match ?? undefined);
    });
  }, [item.regNumber]);

  const leaveOpt   = item.leaveOption ?? 'Present';
  const isOnLeave  = leaveOpt !== 'Present';
  const isApproved = String(item.approved ?? '').toLowerCase() === 'true' || item.approved === '1';

  const { bg: statusBg, text: statusText } =
    STATUS_COLORS[leaveOpt] ?? STATUS_COLORS.Present;

  const studentName = studentRecord?.fullName ?? studentRecord?.regNumber;

  const handleDelete = useCallback(() => {
    studentAttendanceLogRepository.delete(item.id).then(() => {
      syncSheet(SHEETS.STUDENT_ATT_LOG, twoWeeksAgo()).catch(() => {});
      navigation.goBack();
    });
  }, [item.id, navigation]);

  return (
    <SafeAreaView style={KStyles.detailsRoot}>
      {/* Header */}
      <View style={[KStyles.header, { backgroundColor: PRIMARY }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={KStyles.headerTitle} numberOfLines={1}>Attendance Record</Text>
        <View style={KStyles.headerActions}>
          <TouchableOpacity
            style={KStyles.headerIcon}
            onPress={() => navigation.navigate('StudentAttendanceLogForm', { mode: 'edit', item })}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="create-outline" size={22} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            style={KStyles.headerIcon}
            onPress={() => setDeleteVisible(true)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="trash-outline" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={KStyles.detailsScroll}>

        {/* ── Hero card ──────────────────────────────────────────────────── */}
        <View style={KStyles.detailsHeroCard}>
          <View style={styles.heroAvatar}>
            <Ionicons name="calendar" size={36} color={PRIMARY} />
          </View>

          {/* Student name — tappable if record found */}
          <TouchableOpacity
            disabled={!studentRecord}
            onPress={
              studentRecord
                ? () => navigation.navigate('StudentDetails', { item: studentRecord })
                : undefined
            }
            activeOpacity={0.7}
          >
            <Text style={[KStyles.detailsHeroName, studentRecord && styles.heroNameLink]}>
              {studentName ?? item.regNumber ?? '—'}
            </Text>
          </TouchableOpacity>
          {studentName && item.regNumber ? (
            <Text style={KStyles.detailsHeroDesignation}>{item.regNumber}</Text>
          ) : null}
          {item.attendanceDate ? (
            <Text style={KStyles.detailsHeroDesignation}>{item.attendanceDate}</Text>
          ) : null}

          <View style={styles.badgeRow}>
            <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
              <Text style={[styles.statusText, { color: statusText }]}>{leaveOpt.toUpperCase()}</Text>
            </View>
            {isApproved && (
              <View style={styles.approvedBadge}>
                <Ionicons name="checkmark-circle" size={13} color="#2E7D32" />
                <Text style={styles.approvedText}>Approved</Text>
              </View>
            )}
          </View>
        </View>

        {/* ── Attendance ─────────────────────────────────────────────────── */}
        <Section title="Attendance" />
        <View style={KStyles.detailsCard}>
          {studentName ? (
            <InfoRow icon="person-outline"    label="Student"      value={`${studentName} (${item.regNumber})`} iconBg={PRIMARY} />
          ) : (
            <InfoRow icon="person-outline"    label="Reg Number"   value={item.regNumber}          iconBg={PRIMARY} />
          )}
          <InfoRow icon="calendar-outline"    label="Date"         value={item.attendanceDate} iconBg={PRIMARY} />
          <InfoRow icon="log-in-outline"      label="Check-in"     value={item.checkIn}            iconBg={PRIMARY} />
          <InfoRow icon="log-out-outline"     label="Check-out"    value={item.checkOut}           iconBg={PRIMARY} />
          <InfoRow icon="airplane-outline"    label="Option" value={leaveOpt} />
          {isOnLeave && (
            <InfoRow icon="list-outline"      label="Leave Type"   value={item.leaveType} />
          )}
          <InfoRow icon="people-outline"      label="Accompanied By" value={item.accompaniedBy} />
          <InfoRow icon="person-add-outline"  label="Marked By"    value={item.markedBy} />
          <InfoRow icon="checkmark-circle-outline" label="Approved" value={isApproved ? 'Yes' : 'No'} />
          <InfoRow icon="chatbubble-outline"  label="Remarks"      value={item.remarks} />
        </View>

        {/* ── Audit ──────────────────────────────────────────────────────── */}
        {item.lastmodified && (
          <>
            <Section title="Audit" />
            <View style={KStyles.detailsCard}>
              <InfoRow icon="time-outline" label="Last Modified" value={item.lastmodified} />
            </View>
          </>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>

      <TouchableOpacity
        style={[KStyles.fab, { backgroundColor: PRIMARY }]}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('StudentAttendanceLogForm', { mode: 'edit', item })}
      >
        <Ionicons name="create" size={26} color="#fff" />
      </TouchableOpacity>

      <ConfirmDialog
        visible={deleteVisible}
        title="Delete Attendance Record"
        message="Are you sure you want to delete this record? This cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={() => { setDeleteVisible(false); handleDelete(); }}
        onCancel={() => setDeleteVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  heroAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  heroNameLink: { color: PRIMARY, textDecorationLine: 'underline' },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  statusBadge: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 14,
  },
  statusText:    { fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
  approvedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  approvedText:  { fontSize: 12, color: '#2E7D32', fontWeight: '600' },
});
