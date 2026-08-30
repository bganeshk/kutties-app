import React, { memo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { FeedbackModel } from '../../db/models/feedback.model';
import { Colors, KStyles } from '../../styles/kutties-styles';

const PRIMARY = Colors.primary;

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  open:     { bg: '#FFF8E1', text: '#F57F17' },
  reviewed: { bg: '#E3F2FD', text: '#1565C0' },
  closed:   { bg: '#F1F8E9', text: '#2E7D32' },
};

const STAR_LABELS = ['', '★', '★★', '★★★', '★★★★', '★★★★★'];

interface FeedbackRowProps {
  item: FeedbackModel;
  onPress: (item: FeedbackModel) => void;
}

const FeedbackRow = memo(({ item, onPress }: FeedbackRowProps) => {
  const statusStyle = STATUS_COLORS[item.status ?? 'open'] ?? STATUS_COLORS.open;
  const ratingNum   = Number(item.rating ?? 0);
  const stars       = ratingNum >= 1 && ratingNum <= 5 ? STAR_LABELS[ratingNum] : null;

  return (
    <Pressable
      onPress={() => onPress(item)}
      android_ripple={{ color: 'rgba(194,24,91,0.1)' }}
      style={({ pressed }) => [
        KStyles.rowContainer,
        pressed && KStyles.rowPressed,
      ]}
    >
      {/* Avatar initials */}
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {(item.createdBy ?? 'T').charAt(0).toUpperCase()}
        </Text>
      </View>

      <View style={KStyles.rowInfo}>
        {/* Name row */}
        <View style={KStyles.rowTwoCol}>
          <View style={KStyles.rowLeftCol}>
            <Text style={KStyles.rowName} numberOfLines={1}>
              {item.createdBy ?? '—'}
            </Text>

             {item.teacherName ? (
                         <Text style={styles.studentLabel} numberOfLines={1}>
              Student: {item.teacherName ?? '—'}
            </Text>
                      ) : null}
            {item.studentName ? (
                         <Text style={styles.studentLabel} numberOfLines={1}>
              Student: {item.studentName ?? '—'}
            </Text>
                      ) : null}
           
          </View>
          <View style={KStyles.rowRightCol}>
            {/* Status badge */}
            <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
              <Text style={[styles.statusText, { color: statusStyle.text }]}>
                {(item.status ?? 'open').toUpperCase()}
              </Text>
            </View>
            {/* Star rating */}
            {stars && (
              <Text style={styles.stars}>{stars}</Text>
            )}
          </View>
        </View>

        {/* Feedback snippet */}
        {item.feedback ? (
          <Text style={styles.feedbackSnippet} numberOfLines={2}>
            {item.feedback}
          </Text>
        ) : null}

        {/* Category + Date row */}
        <View style={styles.metaRow}>
          {item.category ? (
            <Text style={styles.metaTag}>{item.category}</Text>
          ) : null}
          {item.feedbackDate ? (
            <Text style={styles.metaDate}>{item.feedbackDate}</Text>
          ) : null}
        </View>
      </View>

      <Ionicons name="chevron-forward" size={16} color="#ccc" style={{ marginLeft: 8, flexShrink: 0 }} />
    </Pressable>
  );
});

export default FeedbackRow;

const styles = StyleSheet.create({
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
    flexShrink: 0,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  studentLabel: {
    fontSize: 12,
    color: Colors.muted,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    alignSelf: 'flex-end',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  stars: {
    fontSize: 12,
    color: '#F9A825',
    marginTop: 2,
    alignSelf: 'flex-end',
  },
  feedbackSnippet: {
    fontSize: 13,
    color: '#555',
    lineHeight: 18,
    marginTop: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 8,
    flexWrap: 'wrap',
  },
  metaTag: {
    fontSize: 11,
    color: PRIMARY,
    backgroundColor: Colors.lightPink,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    fontWeight: '600',
  },
  metaDate: {
    fontSize: 11,
    color: Colors.muted,
  },
});
