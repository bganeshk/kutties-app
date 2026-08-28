import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, Linking, SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '../navigation/HomeStack';
import { Colors, KStyles } from '../styles/kutties-styles';
import { STUDENT_STATUS_COLOR, STUDENT_STATUS_BG, STUDENT_STATUS_BORDER } from '../utils/constants';
import { studentRepository, courseRepository, teacherRepository } from '../db/repositories';
import type { StudentModel } from '../db/models/student.model';
import type { TeacherModel } from '../db/models/teacher.model';
import type { CourseModel } from '../db/models/course.model';
import { syncSheet } from '../sync/sync.service';
import ConfirmDialog from '../components/shared/ConfirmDialog';
import InfoRow from '../components/shared/InfoRow';

const PRIMARY = Colors.primary;

type Props = NativeStackScreenProps<HomeStackParamList, 'StudentDetails'>;

// ── Small helpers ─────────────────────────────────────────────────────────────

function Avatar({ name, photo }: { name: string; photo?: string }) {
  if (photo) {
    return <Image source={{ uri: photo }} style={KStyles.detailsAvatar} />;
  }
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
  return (
    <View style={KStyles.detailsAvatarPlaceholder}>
      <Text style={KStyles.detailsAvatarText}>{initials || '?'}</Text>
    </View>
  );
}

function Section({ title }: { title: string }) {
  return <Text style={KStyles.detailsSection}>{title}</Text>;
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function StudentDetailsScreen({ navigation, route }: Props) {
  const [item, setItem] = useState<StudentModel>(route.params.item);
  const [matchedCourse, setMatchedCourse] = useState<CourseModel | null>(null);
  const [classTeacher, setClassTeacher] = useState<TeacherModel | null>(null);
  const [deleteVisible, setDeleteVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      studentRepository.findById(route.params.item.id).then(async (fresh) => {
        if (fresh) {
          setItem(fresh);
          if (fresh.course) {
            const allCourses = await courseRepository.findAll();
            const matched = allCourses.find(
              (c) => `${c.courseName}: ${c.division}` === fresh.course,
            ) ?? null;
            setMatchedCourse(matched);
            if (matched?.classTeacher) {
              const teachers = await teacherRepository.findWhere(
                (t) => t.email === matched.classTeacher,
              );
              setClassTeacher(teachers[0] ?? null);
            } else {
              setClassTeacher(null);
            }
          } else {
            setMatchedCourse(null);
            setClassTeacher(null);
          }
        }
      });
    }, [route.params.item.id]),
  );

  const name = item.fullName ?? item.id;

  const handleDelete = useCallback(() => {
    studentRepository.delete(item.id).then(() => {
      syncSheet('students').catch(() => {});
      navigation.goBack();
    });
  }, [item.id, navigation]);

  const status = item.status ?? 'active';

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
        <Text style={KStyles.headerTitle} numberOfLines={1}>Student Details</Text>
        <View style={KStyles.headerActions}>
          <TouchableOpacity
            style={KStyles.headerIcon}
            onPress={() => navigation.navigate('StudentForm', { mode: 'edit', item })}
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

        {/* ── Hero card ────────────────────────────────────────────────────── */}
        <View style={KStyles.detailsHeroCard}>
          <Avatar name={String(name)} photo={item.idphoto} />
          <Text style={KStyles.detailsHeroName}>{name}</Text>
          {item.regNumber ? (
            <Text style={styles.heroReg}>Reg: {item.regNumber}</Text>
          ) : null}
          <View style={[
            KStyles.detailsStatusBadge,
            { backgroundColor: STUDENT_STATUS_BG[status] ?? '#F5F5F5', borderColor: STUDENT_STATUS_BORDER[status] ?? '#BDBDBD' },
          ]}>
            <Text style={[KStyles.detailsStatusBadgeText, { color: STUDENT_STATUS_COLOR[status] ?? '#757575' }]}>
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Text>
          </View>
        </View>

        {/* ── Quick actions ─────────────────────────────────────────────────── */}
        {(item.phone || item.email) && (
          <View style={KStyles.detailsQuickActions}>

            {item.phone && (
              <TouchableOpacity
                style={KStyles.detailsQaBtn}
                onPress={() => Linking.openURL(`whatsapp://send?phone=${item.phone}`)}
                activeOpacity={0.75}
              >
                <Ionicons name="logo-whatsapp" size={20} color="#2E7D32" />
                <Text style={KStyles.detailsQaBtnText}>WhatsApp</Text>
              </TouchableOpacity>
            )}
            {item.email && (
              <TouchableOpacity
                style={KStyles.detailsQaBtn}
                onPress={() => Linking.openURL(`mailto:${item.email}`)}
                activeOpacity={0.75}
              >
                <Ionicons name="mail" size={20} color={PRIMARY} />
                <Text style={KStyles.detailsQaBtnText}>Email</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* ── Contact ───────────────────────────────────────────────────────── */}
        <Section title="Contact" />
        <View style={KStyles.detailsCard}>
          <InfoRow
            icon="call-outline"
            label="Phone"
            value={item.phone}
            onPress={item.phone ? () => Linking.openURL(`tel:${item.phone}`) : undefined}
            iconBg={PRIMARY}
          />
          <InfoRow
            icon="call-outline"
            label="Phone 2"
            value={item.phone2}
            onPress={item.phone2 ? () => Linking.openURL(`tel:${item.phone2}`) : undefined}
            iconBg={PRIMARY}
          />
          <InfoRow
            icon="mail-outline"
            label="Email"
            value={item.email}
            onPress={item.email ? () => Linking.openURL(`mailto:${item.email}`) : undefined}
            iconBg={PRIMARY}
          />
          <InfoRow icon="location-outline" label="Address" value={item.address} />
        </View>

        {/* ── Personal ──────────────────────────────────────────────────────── */}
        <Section title="Personal" />
        <View style={KStyles.detailsCard}>
          <InfoRow icon="people-outline" label="Mother's Name" value={item.motherName} />
          <InfoRow icon="people-outline" label="Father's Name" value={item.fatherName} />
          <InfoRow icon="calendar-outline" label="Date of Birth" value={item.dob} />
        </View>

        {/* ── Academic ──────────────────────────────────────────────────────── */}
        <Section title="Academic" />
        <View style={KStyles.detailsCard}>
          <InfoRow
            icon="school-outline"
            label="Course"
            value={item.course}
            onPress={matchedCourse ? () => navigation.navigate('CourseDetails', { item: matchedCourse }) : undefined}
            iconBg={PRIMARY}
          />
          <InfoRow
            icon="person-outline"
            label="Class Teacher"
            value={
              classTeacher
                ? classTeacher.name
                  ? `${classTeacher.name} (${classTeacher.email})`
                  : classTeacher.email
                : undefined
            }
            onPress={
              classTeacher
                ? () => navigation.navigate('TeacherDetails', { item: classTeacher })
                : undefined
            }
            iconBg={PRIMARY}
          />
          <InfoRow icon="calendar-outline" label="Admission Date" value={item.admissionDate} />
          <InfoRow icon="time-outline" label="After School" value={item.afterSchool} />
          <InfoRow icon="sunny-outline" label="Opt Weekend" value={item.optWeekend} />
        </View>

        {/* ── ID Photo ──────────────────────────────────────────────────────── */}
        {item.idphoto ? (
          <>
            <Section title="ID Photo" />
            <View style={KStyles.detailsPhotoCard}>
              <Image source={{ uri: item.idphoto }} style={KStyles.detailsIdPhoto} resizeMode="cover" />
            </View>
          </>
        ) : null}

        {/* ── Audit ─────────────────────────────────────────────────────────── */}
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
        style={KStyles.fab}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('StudentForm', { mode: 'edit', item })}
      >
        <Ionicons name="create" size={26} color="#fff" />
      </TouchableOpacity>

      <ConfirmDialog
        visible={deleteVisible}
        title="Delete Student"
        message={`Are you sure you want to delete "${item.fullName ?? 'this student'}"? This cannot be undone.`}
        confirmLabel="Delete"
        destructive
        onConfirm={() => { setDeleteVisible(false); handleDelete(); }}
        onCancel={() => setDeleteVisible(false)}
      />
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Student-specific
  heroReg: { fontSize: 13, color: '#4A148C', fontWeight: '600', marginTop: 4 },
});
