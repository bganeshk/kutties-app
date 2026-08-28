import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '../navigation/HomeStack';
import { Colors, KStyles } from '../styles/kutties-styles';
import { courseRepository, teacherRepository, studentRepository } from '../db/repositories';
import type { CourseModel } from '../db/models/course.model';
import type { TeacherModel } from '../db/models/teacher.model';
import { syncSheet } from '../sync/sync.service';
import ConfirmDialog from '../components/shared/ConfirmDialog';
import InfoRow from '../components/shared/InfoRow';

const PRIMARY = Colors.primary;

type Props = NativeStackScreenProps<HomeStackParamList, 'CourseDetails'>;

function Section({ title }: { title: string }) {
  return <Text style={KStyles.detailsSection}>{title}</Text>;
}

function FeeRow({ label, amount }: { label: string; amount?: number }) {
  if (!amount) return null;
  return (
    <View style={styles.feeRow}>
      <Text style={styles.feeLabel}>{label}</Text>
      <Text style={styles.feeAmount}>₹{amount.toLocaleString()}</Text>
    </View>
  );
}

export default function CourseDetailsScreen({ navigation, route }: Props) {
  const [item, setItem] = useState<CourseModel>(route.params.item);
  const [deleteVisible, setDeleteVisible] = useState(false);
  const [classTeacherLabel, setClassTeacherLabel] = useState<string | undefined>();
  const [classTeacher, setClassTeacher] = useState<TeacherModel | null>(null);
  const [studentCount, setStudentCount] = useState(0);

  useFocusEffect(
    useCallback(() => {
      courseRepository.findById(route.params.item.id).then(async (fresh) => {
        const current = fresh ?? item;
        if (fresh) setItem(fresh);
        // Resolve class teacher
        if (current.classTeacher) {
          const teachers = await teacherRepository.findAll();
          const match = teachers.find((t) => t.email === current.classTeacher) ?? null;
          setClassTeacher(match);
          setClassTeacherLabel(
            match?.name ? `${match.name} (${current.classTeacher})` : current.classTeacher,
          );
        } else {
          setClassTeacher(null);
          setClassTeacherLabel(undefined);
        }
        // Count enrolled students
        const courseKey = `${current.courseName}: ${current.division}`;
        const enrolled = await studentRepository.findByCourse(courseKey);
        setStudentCount(enrolled.length);
      });
    }, [route.params.item.id]),
  );

  const subjectList = item.subjectList ?? [];

  const handleDelete = useCallback(() => {
    courseRepository.delete(item.id).then(() => {
      syncSheet('courses').catch(() => {});
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
        <Text style={KStyles.headerTitle} numberOfLines={1}>Course Details</Text>
        <View style={KStyles.headerActions}>
          <TouchableOpacity
            style={KStyles.headerIcon}
            onPress={() => navigation.navigate('CourseForm', { mode: 'edit', item })}
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

        {/* ── Hero card ─────────────────────────────────────────────────── */}
        <View style={KStyles.detailsHeroCard}>
          <View style={styles.heroIcon}>
            <Ionicons name="school" size={40} color="#fff" />
          </View>
          <Text style={KStyles.detailsHeroName}>{item.courseName ?? item.id}</Text>
          {item.division ? (
            <Text style={KStyles.detailsHeroDesignation}>Division : {item.division}</Text>
          ) : null}
        </View>

        {/* ── Course Info ────────────────────────────────────────────────── */}
        <Section title="Details" />
        <View style={KStyles.detailsCard}>
          <InfoRow icon="document-text-outline" label="Description"   value={item.description} />
          <InfoRow
            icon="person-outline"
            label="Class Teacher"
            value={classTeacherLabel}
            onPress={classTeacher ? () => navigation.navigate('TeacherDetails', { item: classTeacher }) : undefined}
            iconBg={PRIMARY}
          />
          <InfoRow icon="grid-outline"          label="Division"      value={item.division} />
        </View>

        {/* ── Subjects ──────────────────────────────────────────────────── */}
        {subjectList.length > 0 && (
          <>
            <Section title="Subjects" />
            <View style={KStyles.detailsCard}>
              <View style={styles.subjectWrap}>
                {subjectList.map((s, i) => (
                  <View key={i} style={styles.subjectChip}>
                    <Text style={styles.subjectChipText}>{s}</Text>
                  </View>
                ))}
              </View>
            </View>
          </>
        )}

        {/* ── Fees ──────────────────────────────────────────────────────── */}
        <Section title="Fees" />
        <View style={[KStyles.detailsCard, { paddingHorizontal: 14, paddingVertical: 10 }]}>
          <FeeRow label="Course Fee"      amount={item.courseFee} />
          <FeeRow label="Admission Fee"   amount={item.admissionFee} />
          <FeeRow label="After School Fee" amount={item.afterSchoolFee} />
          <FeeRow label="Weekend Fee"     amount={item.weekEndFee} />
          {item.bookFee ? (
            <View style={styles.feeRow}>
              <Text style={styles.feeLabel}>Book Fee</Text>
              <Text style={styles.feeAmount}>{item.bookFee}</Text>
            </View>
          ) : null}
        </View>

        {/* ── Students ──────────────────────────────────────────────────── */}
        <Section title="Students" />
        <View style={KStyles.detailsCard}>
          <InfoRow
            icon="people-outline"
            label="Student List"
            value={studentCount > 0 ? `${studentCount} enrolled` : 'No students yet'}
            onPress={() => navigation.navigate('StudentList', {
              initialSearch: `${item.courseName}: ${item.division}`,
            })}
            iconBg={PRIMARY}
          />
        </View>

        {/* ── Audit ─────────────────────────────────────────────────────── */}
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

      {/* FAB — edit */}
      <TouchableOpacity
        style={KStyles.fab}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('CourseForm', { mode: 'edit', item })}
      >
        <Ionicons name="create" size={26} color="#fff" />
      </TouchableOpacity>

      <ConfirmDialog
        visible={deleteVisible}
        title="Delete Course"
        message={`Are you sure you want to delete "${item.courseName ?? 'this course'}"? This cannot be undone.`}
        confirmLabel="Delete"
        destructive
        onConfirm={() => { setDeleteVisible(false); handleDelete(); }}
        onCancel={() => setDeleteVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  heroIcon: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: PRIMARY,
    justifyContent: 'center', alignItems: 'center', marginBottom: 14,
  },
  subjectWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, padding: 14 },
  subjectChip: {
    backgroundColor: '#E8F5E9', borderRadius: 12,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  subjectChipText: { fontSize: 13, color: '#2E7D32', fontWeight: '600' },
  feeRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 0.5, borderBottomColor: Colors.border,
  },
  feeLabel:  { fontSize: 13, color: Colors.muted, fontWeight: '600' },
  feeAmount: { fontSize: 14, color: '#1A1A1A', fontWeight: '700' },
});
