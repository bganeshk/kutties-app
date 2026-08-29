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
import { courseTimeTableRepository, teacherRepository } from '../db/repositories';
import type { CourseTimeTableModel } from '../db/models/coursetimetable.model';
import type { TeacherModel } from '../db/models/teacher.model';
import { syncSheet } from '../sync/sync.service';
import ConfirmDialog from '../components/shared/ConfirmDialog';
import InfoRow from '../components/shared/InfoRow';

const PRIMARY = Colors.primary;

type Props = NativeStackScreenProps<HomeStackParamList, 'CourseTimeTableDetails'>;

function Section({ title }: { title: string }) {
  return <Text style={KStyles.detailsSection}>{title}</Text>;
}

export default function CourseTimeTableDetailsScreen({ navigation, route }: Props) {
  const [item, setItem] = useState<CourseTimeTableModel>(route.params.item);
  const [deleteVisible, setDeleteVisible] = useState(false);
  const [teacher, setTeacher] = useState<TeacherModel | null>(null);
  const [teacherLabel, setTeacherLabel] = useState<string | undefined>();

  useFocusEffect(
    useCallback(() => {
      courseTimeTableRepository.findById(route.params.item.id).then(async (fresh) => {
        const current = fresh ?? item;
        if (fresh) setItem(fresh);

        // Resolve teacher label
        if (current.teacher) {
          const teachers = await teacherRepository.findAll();
          const match = teachers.find((t) => t.email === current.teacher) ?? null;
          setTeacher(match);
          setTeacherLabel(match?.name ? `${match.name} (${current.teacher})` : current.teacher);
        } else {
          setTeacher(null);
          setTeacherLabel(undefined);
        }
      });
    }, [route.params.item.id]),
  );

  const handleDelete = useCallback(() => {
    courseTimeTableRepository.delete(item.id).then(() => {
      syncSheet('coursetimetbl').catch(() => {});
      navigation.goBack();
    });
  }, [item.id, navigation]);

  const timeLabel =
    item.startTime && item.endTime
      ? `${item.startTime} – ${item.endTime}`
      : item.startTime ?? item.endTime;

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
        <Text style={KStyles.headerTitle} numberOfLines={1}>Timetable Entry</Text>
        <View style={KStyles.headerActions}>
          <TouchableOpacity
            style={KStyles.headerIcon}
            onPress={() => navigation.navigate('CourseTimeTableForm', { mode: 'edit', item })}
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

        {/* ── Hero ──────────────────────────────────────────────────────── */}
        <View style={KStyles.detailsHeroCard}>
          <View style={styles.heroIcon}>
            <Ionicons name="calendar" size={40} color="#fff" />
          </View>
          <Text style={KStyles.detailsHeroName}>{item.subject || '—'}</Text>
          <Text style={KStyles.detailsHeroDesignation}>{item.courseDivision}</Text>
        </View>

        {/* ── Schedule ──────────────────────────────────────────────────── */}
        <Section title="Schedule" />
        <View style={KStyles.detailsCard}>
          <InfoRow icon="sunny-outline"     label="Day"              value={item.day} />
          <InfoRow icon="time-outline"      label="Time"             value={timeLabel} />
          <InfoRow icon="layers-outline"    label="Course / Division" value={item.courseDivision} />
        </View>

        {/* ── Teacher ───────────────────────────────────────────────────── */}
        <Section title="Teacher" />
        <View style={KStyles.detailsCard}>
          <InfoRow
            icon="person-outline"
            label="Teacher"
            value={teacherLabel ?? item.teacher}
            onPress={teacher ? () => navigation.navigate('TeacherDetails', { item: teacher }) : undefined}
            iconBg={PRIMARY}
          />
        </View>

        {/* ── Notes ─────────────────────────────────────────────────────── */}
        {item.notes ? (
          <>
            <Section title="Notes" />
            <View style={KStyles.detailsCard}>
              <InfoRow icon="document-text-outline" label="Notes" value={item.notes} />
            </View>
          </>
        ) : null}

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
        onPress={() => navigation.navigate('CourseTimeTableForm', { mode: 'edit', item })}
      >
        <Ionicons name="create" size={26} color="#fff" />
      </TouchableOpacity>

      <ConfirmDialog
        visible={deleteVisible}
        title="Delete Entry"
        message={`Delete timetable entry "${item.subject} – ${item.day}"? This cannot be undone.`}
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
});
