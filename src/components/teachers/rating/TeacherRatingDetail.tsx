import React, { useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Image, SafeAreaView, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '../../../navigation/HomeStack';
import { Colors, KStyles } from '../../../styles/kutties-styles';
import { useTeacherRatings } from './useTeacherRatings';
import {
  RatingBanner,
  AcademicSection,
  AssignmentSection,
  TaskSection,
  CollapsibleCard,
  ratingStyles,
} from '../../shared/rating/RatingShared';

const PRIMARY = Colors.primary;

type Props = NativeStackScreenProps<HomeStackParamList, 'TeacherRatingDetail'>;

// ── Avatar helper ─────────────────────────────────────────────────────────────

function Avatar({ name, photo }: { name: string; photo?: string }) {
  if (photo) {
    return <Image source={{ uri: photo }} style={styles.avatar} />;
  }
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
  return (
    <View style={styles.avatarPlaceholder}>
      <Text style={styles.avatarText}>{initials || '?'}</Text>
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function TeacherRatingDetail({ navigation, route }: Props) {
  const { teacher } = route.params;
  const { loading, ratings } = useTeacherRatings();

  const data = useMemo(
    () =>
      ratings.find(
        (r) =>
          r.teacher.email === teacher.email ||
          r.teacher.id === teacher.id,
      ) ?? null,
    [ratings, teacher],
  );

  const name   = teacher.name ?? teacher.id;
  const status = teacher.status ?? 'active';

  if (loading) {
    return (
      <SafeAreaView style={KStyles.detailsRoot}>
        <View style={KStyles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={KStyles.headerTitle}>Teacher Rating</Text>
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

  const showNotifications =
    data != null && data.notificationTotal > 0;

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
        <Text style={KStyles.headerTitle} numberOfLines={1}>Teacher Rating</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>

        {/* ── Section 1: Teacher header card ─────────────────────────────── */}
        <TouchableOpacity
          style={styles.heroCard}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('TeacherDetails', { item: teacher })}
        >
          <View style={styles.heroAvatarWrap}>
            <Avatar name={String(name)} photo={teacher.idphoto} />
          </View>
          <View style={styles.heroInfo}>
            <Text style={styles.heroName} numberOfLines={1}>{name}</Text>
            {teacher.email ? (
              <View style={styles.heroEmailRow}>
                <Ionicons name="mail-outline" size={12} color="rgba(255,255,255,0.75)" />
                <Text style={styles.heroEmail} numberOfLines={1}> {teacher.email}</Text>
              </View>
            ) : null}
            <View style={styles.heroDeptRow}>
              <Ionicons name="business-outline" size={12} color="rgba(255,255,255,0.7)" />
              <Text style={styles.heroDept} numberOfLines={1}>
                {' '}{teacher.department ?? '—'} · {status.charAt(0).toUpperCase() + status.slice(1)}
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.5)" />
        </TouchableOpacity>

        {/* ── Section 2: Overall rating banner ───────────────────────────── */}
        <RatingBanner
          overallRating={data?.overallRating ?? null}
          academicRating={data?.academicRating ?? null}
          activityRating={data?.activityRating ?? null}
        />

        {data == null ? (
          <Text style={[KStyles.emptyText, { textAlign: 'center', marginTop: 24 }]}>
            No rating data found for this teacher.
          </Text>
        ) : (
          <>
            {/* ── Section 3: Academic ──────────────────────────────────── */}
            <AcademicSection
              academicRating={data.academicRating}
              subjectRatings={data.subjectRatings}
              totalExams={totalExams}
              emptyMessage="No mark sheet records found for this teacher."
            />

            {/* ── Section 4: Assignments ───────────────────────────────── */}
            <AssignmentSection
              avgRating={data.assignmentAvgRating}
              closed={data.assignmentClosed}
              overdue={data.assignmentOverdue}
              total={data.assignmentTotal}
              categories={data.assignmentCategories}
              emptyMessage="No assignments recorded for this teacher."
            />

            {/* ── Section 5: Tasks ─────────────────────────────────────── */}
            <TaskSection
              avgRating={data.taskAvgRating}
              closed={data.taskClosed}
              overdue={data.taskOverdue}
              total={data.taskTotal}
              categories={data.taskCategories}
              emptyMessage="No tasks recorded for this teacher."
            />

            {/* ── Section 6: Notifications ─────────────────────────────── */}
            {showNotifications && (
              <CollapsibleCard
                header={
                  <View>
                    <Text style={ratingStyles.cardTitle}>🔔 Notifications</Text>
                    <View style={ratingStyles.cardMeta}>
                      <Text style={ratingStyles.cardMetaItem}>
                        Total <Text style={ratingStyles.cardMetaVal}>{data.notificationTotal}</Text>
                      </Text>
                      <Text style={ratingStyles.cardMetaSep}>|</Text>
                      <Text style={ratingStyles.cardMetaItem}>
                        Open <Text style={ratingStyles.cardMetaVal}>{data.notificationOpen}</Text>
                      </Text>
                      <Text style={ratingStyles.cardMetaSep}>|</Text>
                      <Text style={ratingStyles.cardMetaItem}>
                        Closed <Text style={ratingStyles.cardMetaVal}>{data.notificationClosed}</Text>
                      </Text>
                    </View>
                  </View>
                }
                defaultOpen={false}
              >
                <Text style={ratingStyles.emptyText}>
                  Notifications are informational and do not affect the rating score.
                </Text>
              </CollapsibleCard>
            )}
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
  heroEmailRow:  { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  heroEmail:     { fontSize: 12, color: 'rgba(255,255,255,0.75)', fontWeight: '600' },
  heroDeptRow:   { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  heroDept:      { fontSize: 12, color: 'rgba(255,255,255,0.7)' },
});
