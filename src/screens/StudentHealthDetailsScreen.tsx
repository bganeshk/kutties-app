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
import { studentHealthRepository, studentRepository } from '../db/repositories';
import type { StudentHealthModel } from '../db/models/studenthealth.model';
import type { StudentModel } from '../db/models/student.model';
import { syncSheet } from '../sync/sync.service';
import ConfirmDialog from '../components/shared/ConfirmDialog';
import InfoRow from '../components/shared/InfoRow';

const PRIMARY = Colors.primary;

type Props = NativeStackScreenProps<HomeStackParamList, 'StudentHealthDetails'>;

const BLOOD_COLORS: Record<string, { bg: string; text: string }> = {
  'A+':  { bg: '#FFEBEE', text: '#C62828' },
  'A-':  { bg: '#FFEBEE', text: '#C62828' },
  'B+':  { bg: '#E3F2FD', text: '#1565C0' },
  'B-':  { bg: '#E3F2FD', text: '#1565C0' },
  'O+':  { bg: '#F1F8E9', text: '#2E7D32' },
  'O-':  { bg: '#F1F8E9', text: '#2E7D32' },
  'AB+': { bg: '#FFF3E0', text: '#E65100' },
  'AB-': { bg: '#FFF3E0', text: '#E65100' },
};

function Section({ title }: { title: string }) {
  return <Text style={KStyles.detailsSection}>{title}</Text>;
}

export default function StudentHealthDetailsScreen({ navigation, route }: Props) {
  const [item, setItem] = useState<StudentHealthModel>(route.params.item);
  const [deleteVisible, setDeleteVisible] = useState(false);
  const [studentRecord, setStudentRecord] = useState<StudentModel | undefined>(undefined);

  useFocusEffect(
    useCallback(() => {
      studentHealthRepository.findById(route.params.item.id).then((fresh) => {
        if (fresh) setItem(fresh);
      });
    }, [route.params.item.id]),
  );

  // Resolve student record from regNumber
  React.useEffect(() => {
    if (!item.regNumber) return;
    studentRepository.findAll().then((students) => {
      const match = students.find((s) => s.regNumber === item.regNumber);
      setStudentRecord(match ?? undefined);
    });
  }, [item.regNumber]);

  const studentName = studentRecord?.fullName ?? studentRecord?.regNumber;

  const bloodStyle = (item.bloodGroup && BLOOD_COLORS[item.bloodGroup]) ?? null;

  const handleDelete = useCallback(() => {
    studentHealthRepository.delete(item.id).then(() => {
      syncSheet(SHEETS.STUDENT_HEALTH).catch(() => {});
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
        <Text style={KStyles.headerTitle} numberOfLines={1}>Health Record</Text>
        <View style={KStyles.headerActions}>
          <TouchableOpacity
            style={KStyles.headerIcon}
            onPress={() => navigation.navigate('StudentHealthForm', { mode: 'edit', item })}
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
            <Ionicons name="medkit" size={36} color="#00796B" />
          </View>
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
          {item.checkupDate ? (
            <Text style={KStyles.detailsHeroDesignation}>{item.checkupDate}</Text>
          ) : null}
          {bloodStyle && item.bloodGroup ? (
            <View style={[styles.bloodBadge, { backgroundColor: bloodStyle.bg }]}>
              <Text style={[styles.bloodText, { color: bloodStyle.text }]}>
                {item.bloodGroup}
              </Text>
            </View>
          ) : null}
        </View>

        {/* ── Vitals ─────────────────────────────────────────────────────── */}
        <Section title="Vitals" />
        <View style={KStyles.detailsCard}>
          <InfoRow
            icon="person-outline"
            label="Student"
            value={studentName ?? item.regNumber}
            iconBg={PRIMARY}
            onPress={studentRecord ? () => navigation.navigate('StudentDetails', { item: studentRecord }) : undefined}
          />
          <InfoRow icon="calendar-outline" label="Checkup Date" value={item.checkupDate} iconBg={PRIMARY} />
          <InfoRow icon="water-outline"    label="Blood Group"  value={item.bloodGroup}  iconBg={PRIMARY} />
          <InfoRow icon="resize-outline"   label="Height"       value={item.height != null ? `${item.height} cm` : undefined} />
          <InfoRow icon="barbell-outline"  label="Weight"       value={item.weight != null ? `${item.weight} kg` : undefined} />
        </View>

        {/* ── Medical ────────────────────────────────────────────────────── */}
        {(item.prescription || item.allergies || item.medicalConditions || item.medications) ? (
          <>
            <Section title="Medical" />
            <View style={KStyles.detailsCard}>
              {item.prescription ? (
                <InfoRow icon="document-text-outline" label="Prescription"       value={item.prescription} />
              ) : null}
              {item.allergies ? (
                <InfoRow icon="warning-outline"       label="Allergies"          value={item.allergies} />
              ) : null}
              {item.medicalConditions ? (
                <InfoRow icon="fitness-outline"       label="Medical Conditions" value={item.medicalConditions} />
              ) : null}
              {item.medications ? (
                <InfoRow icon="medical-outline"       label="Medications"        value={item.medications} />
              ) : null}
            </View>
          </>
        ) : null}

        {/* ── Remarks ────────────────────────────────────────────────────── */}
        {item.remarks ? (
          <>
            <Section title="Remarks" />
            <View style={KStyles.detailsCard}>
              <InfoRow icon="chatbubble-outline" label="Remarks" value={item.remarks} />
            </View>
          </>
        ) : null}

        {/* ── Audit ──────────────────────────────────────────────────────── */}
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
        onPress={() => navigation.navigate('StudentHealthForm', { mode: 'edit', item })}
      >
        <Ionicons name="create" size={26} color="#fff" />
      </TouchableOpacity>

      <ConfirmDialog
        visible={deleteVisible}
        title="Delete Health Record"
        message="Are you sure you want to delete this health record? This cannot be undone."
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
    backgroundColor: '#E0F2F1',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  bloodBadge: {
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 5,
    borderRadius: 14,
  },
  bloodText:    { fontSize: 14, fontWeight: '700', letterSpacing: 0.5 },
  heroNameLink: { color: Colors.primary, textDecorationLine: 'underline' },
});
