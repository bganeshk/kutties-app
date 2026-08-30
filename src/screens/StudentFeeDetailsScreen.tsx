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
import { studentFeeRepository, studentRepository } from '../db/repositories';
import type { StudentFeeModel } from '../db/models/studentfee.model';
import type { StudentModel } from '../db/models/student.model';
import { syncSheet } from '../sync/sync.service';
import ConfirmDialog from '../components/shared/ConfirmDialog';
import InfoRow from '../components/shared/InfoRow';

const PRIMARY = Colors.primary;

type Props = NativeStackScreenProps<HomeStackParamList, 'StudentFeeDetails'>;

const STATUS_STYLE: Record<string, { bg: string; text: string; border: string }> = {
  paid:    { bg: '#E8F5E9', text: '#2E7D32', border: '#A5D6A7' },
  partial: { bg: '#FFF8E1', text: '#F57F17', border: '#FFE082' },
  pending: { bg: '#FFEBEE', text: '#C62828', border: '#EF9A9A' },
};

function Section({ title }: { title: string }) {
  return <Text style={KStyles.detailsSection}>{title}</Text>;
}

function fmtCurrency(val: number | undefined): string | undefined {
  if (val == null) return undefined;
  return `₹${val.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
}

export default function StudentFeeDetailsScreen({ navigation, route }: Props) {
  const [item, setItem]               = useState<StudentFeeModel>(route.params.item);
  const [studentRecord, setStudentRecord] = useState<StudentModel | undefined>(undefined);
  const [deleteVisible, setDeleteVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      studentFeeRepository.findById(route.params.item.id).then((fresh) => {
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

  const studentName = studentRecord?.fullName ?? studentRecord?.regNumber;

  const statusKey   = (item.status ?? '').trim().toLowerCase();
  const statusStyle = STATUS_STYLE[statusKey] ?? { bg: '#F5F5F5', text: '#757575', border: '#BDBDBD' };
  const statusLabel = item.status
    ? item.status.charAt(0).toUpperCase() + item.status.slice(1)
    : null;

  const handleDelete = useCallback(() => {
    studentFeeRepository.delete(item.id).then(() => {
      syncSheet(SHEETS.STUDENT_FEE).catch(() => {});
      navigation.goBack();
    });
  }, [item.id, navigation]);

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
        <Text style={KStyles.headerTitle} numberOfLines={1}>Fee Record</Text>
        <View style={KStyles.headerActions}>
          <TouchableOpacity
            style={KStyles.headerIcon}
            onPress={() => navigation.navigate('StudentFeeForm', { mode: 'edit', item })}
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
            <Ionicons name="cash" size={36} color="#1565C0" />
          </View>

          {/* Student name — tappable if record found */}
          <TouchableOpacity
            disabled={!studentRecord}
            onPress={studentRecord ? () => navigation.navigate('StudentDetails', { item: studentRecord }) : undefined}
            activeOpacity={0.7}
          >
            <Text style={[KStyles.detailsHeroName, studentRecord && styles.heroNameLink]}>
              {studentName ?? item.regNumber ?? '—'}
            </Text>
          </TouchableOpacity>
          {studentName && item.regNumber ? (
            <Text style={KStyles.detailsHeroDesignation}>{item.regNumber}</Text>
          ) : null}
          {item.feeType ? (
            <Text style={styles.feeTypeLabel}>{item.feeType}</Text>
          ) : null}

          {/* Amount summary */}
          {item.amount != null ? (
            <Text style={styles.heroAmount}>{fmtCurrency(item.amount)}</Text>
          ) : null}

          {/* Status badge */}
          {statusLabel ? (
            <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg, borderColor: statusStyle.border }]}>
              <Text style={[styles.statusText, { color: statusStyle.text }]}>{statusLabel}</Text>
            </View>
          ) : null}
        </View>

        {/* ── Fee Info ────────────────────────────────────────────────────── */}
        <Section title="Fee Info" />
        <View style={KStyles.detailsCard}>
          <InfoRow icon="cash-outline"            label="Amount"       value={fmtCurrency(item.amount)}  iconBg={PRIMARY} />
          <InfoRow icon="receipt-outline"         label="Receipt No"   value={item.recptNo}              />
          <InfoRow icon="receipt-outline"         label="Fee Type"     value={item.feeType}              />
          <InfoRow icon="calendar-outline"        label="Due Date"     value={item.dueDate}              />
          <InfoRow icon="calendar-number-outline" label="Paid Date"    value={item.paidDate}             />
          <InfoRow icon="card-outline"            label="Payment Mode" value={item.paymentMode}          iconBg={PRIMARY} />
        </View>

        {/* ── Remarks ─────────────────────────────────────────────────────── */}
        {item.remarks ? (
          <>
            <Section title="Remarks" />
            <View style={KStyles.detailsCard}>
              <InfoRow icon="chatbubble-outline" label="Remarks" value={item.remarks} />
            </View>
          </>
        ) : null}

        {/* ── Audit ───────────────────────────────────────────────────────── */}
        {item.lastmodified ? (
          <>
            <Section title="Audit" />
            <View style={KStyles.detailsCard}>
              <InfoRow icon="time-outline" label="Last Modified" value={item.lastmodified} />
            </View>
          </>
        ) : null}

        <View style={{ height: 32 }} />
      </ScrollView>

      <TouchableOpacity
        style={KStyles.fab}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('StudentFeeForm', { mode: 'edit', item })}
      >
        <Ionicons name="create" size={26} color="#fff" />
      </TouchableOpacity>

      <ConfirmDialog
        visible={deleteVisible}
        title="Delete Fee Record"
        message="Are you sure you want to delete this fee record? This cannot be undone."
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
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 12,
  },
  heroNameLink:  { color: Colors.primary, textDecorationLine: 'underline' },
  feeTypeLabel:  { fontSize: 13, color: '#1565C0', fontWeight: '600', marginTop: 4 },
  heroAmount:    { fontSize: 22, fontWeight: '700', color: '#1A1A1A', marginTop: 8 },
  statusBadge: {
    marginTop: 10, paddingHorizontal: 16, paddingVertical: 5,
    borderRadius: 14, borderWidth: 1,
  },
  statusText: { fontSize: 13, fontWeight: '700', letterSpacing: 0.4 },
});
