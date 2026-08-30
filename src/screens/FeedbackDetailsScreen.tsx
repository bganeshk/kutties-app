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
import { feedbackRepository } from '../db/repositories';
import { syncSheet } from '../sync/sync.service';
import ConfirmDialog from '../components/shared/ConfirmDialog';
import InfoRow from '../components/shared/InfoRow';
import AuditRow from '../components/shared/AuditRow';

const PRIMARY = Colors.primary;

const STATUS_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  open:     { bg: '#FFF8E1', border: '#FFD54F', text: '#F57F17' },
  reviewed: { bg: '#E3F2FD', border: '#90CAF9', text: '#1565C0' },
  closed:   { bg: '#F1F8E9', border: '#A5D6A7', text: '#2E7D32' },
};

const STAR_LABELS = ['', '★', '★★', '★★★', '★★★★', '★★★★★'];

type Props = NativeStackScreenProps<HomeStackParamList, 'FeedbackDetails'>;

export default function FeedbackDetailsScreen({ navigation, route }: Props) {
  const [item, setItem] = useState(route.params.item);
  const [deleteVisible, setDeleteVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      feedbackRepository.findById(route.params.item.id).then((fresh) => {
        if (fresh) setItem(fresh);
      });
    }, [route.params.item.id]),
  );

  const handleDelete = useCallback(() => {
    feedbackRepository.delete(item.id).then(() => {
      syncSheet(SHEETS.FEEDBACK).catch(() => {});
      navigation.goBack();
    });
  }, [item.id, navigation]);

  const statusStyle = STATUS_COLORS[item.status ?? 'open'] ?? STATUS_COLORS.open;
  const ratingNum   = Number(item.rating ?? 0);
  const stars       = ratingNum >= 1 && ratingNum <= 5 ? STAR_LABELS[ratingNum] : null;

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
        <Text style={KStyles.headerTitle} numberOfLines={1}>
          Feedback
        </Text>
        <View style={KStyles.headerActions}>
          <TouchableOpacity
            style={KStyles.headerIcon}
            onPress={() => navigation.navigate('FeedbackForm', { mode: 'edit', item })}
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

        {/* ── Hero card ────────────────────────────────────────────────── */}
        <View style={KStyles.detailsHeroCard}>
          <View style={styles.heroIcon}>
            <Ionicons name="chatbubble-ellipses" size={36} color="#fff" />
          </View>
          <Text style={KStyles.detailsHeroName} numberOfLines={1}>
            {item.createdBy ?? 'Unknown Creator'}
          </Text>
          {item.studentName ? (
            <Text style={styles.studentLabel}>Student: {item.studentName}</Text>
          ) : null}
          {item.createdBy ? (
            <Text style={styles.studentLabel}>
             Teacher: {item.teacherName?? ""}
            </Text>
          ) : null}
          {stars ? (
            <Text style={styles.stars}>{stars}</Text>
          ) : null}
          {/* Status badge */}
          <View style={[
            KStyles.detailsStatusBadge,
            { backgroundColor: statusStyle.bg, borderColor: statusStyle.border },
          ]}>
            <Text style={[KStyles.detailsStatusBadgeText, { color: statusStyle.text }]}>
              {(item.status ?? 'open').toUpperCase()}
            </Text>
          </View>
        </View>

        {/* ── Feedback details ─────────────────────────────────────────── */}
        <Text style={KStyles.detailsSection}>Feedback</Text>
        <View style={KStyles.detailsCard}>
          {item.feedbackDate ? (
            <InfoRow icon="calendar-outline" label="Date" value={item.feedbackDate} />
          ) : null}
          {item.subject ? (
            <InfoRow icon="book-outline" label="Subject" value={item.subject} />
          ) : null}
          {item.category ? (
            <InfoRow icon="pricetag-outline" label="Category" value={item.category} />
          ) : null}
          {item.rating ? (
            <InfoRow icon="star-outline" label="Rating" value={`${item.rating} / 5`} />
          ) : null}
        </View>

        {item.feedback ? (
          <>
            <Text style={KStyles.detailsSection}>Feedback Text</Text>
            <View style={[KStyles.detailsCard, styles.textCard]}>
              <Text style={styles.bodyText}>{item.feedback}</Text>
            </View>
          </>
        ) : null}

        {/* ── Follow-up ────────────────────────────────────────────────── */}
        {(item.actionTaken || item.remarks) ? (
          <>
            <Text style={KStyles.detailsSection}>Follow-up</Text>
            <View style={KStyles.detailsCard}>
              {item.actionTaken ? (
                <InfoRow icon="checkmark-circle-outline" label="Action Taken" value={item.actionTaken} />
              ) : null}
              {item.remarks ? (
                <InfoRow icon="document-text-outline" label="Remarks" value={item.remarks} />
              ) : null}
            </View>
          </>
        ) : null}

        {/* ── Audit ────────────────────────────────────────────────────── */}
        {item.lastmodified ? (
          <>
            <Text style={KStyles.detailsSection}>Audit</Text>
            <View style={KStyles.detailsCard}>
              <AuditRow label="Last modified" value={item.lastmodified} />
            </View>
          </>
        ) : null}

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* FAB — edit */}
      <TouchableOpacity
        style={KStyles.fab}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('FeedbackForm', { mode: 'edit', item })}
      >
        <Ionicons name="create" size={26} color="#fff" />
      </TouchableOpacity>

      <ConfirmDialog
        visible={deleteVisible}
        title="Delete Feedback"
        message="Are you sure you want to delete this feedback entry? This cannot be undone."
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
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  studentLabel: {
    fontSize: 13,
    color: Colors.muted,
    marginTop: 4,
  },
  stars: {
    fontSize: 20,
    color: '#F9A825',
    marginTop: 8,
    letterSpacing: 2,
  },
  textCard: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  bodyText: {
    fontSize: 15,
    color: '#1A1A1A',
    lineHeight: 24,
  },
});
