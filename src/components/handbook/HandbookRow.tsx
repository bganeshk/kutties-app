import React, { memo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { HandbookModel } from '../../db/models/handbook.model';
import { Colors, KStyles } from '../../styles/kutties-styles';

const PRIMARY = Colors.primary;

interface HandbookRowProps {
  item: HandbookModel;
  onPress: (item: HandbookModel) => void;
}

const HandbookRow = memo(({ item, onPress }: HandbookRowProps) => (
  <Pressable
    onPress={() => onPress(item)}
    android_ripple={{ color: 'rgba(194,24,91,0.1)' }}
    style={({ pressed }) => [
      KStyles.rowContainer,
      pressed && KStyles.rowPressed,
    ]}
  >
    {/* Number badge */}
    <View style={styles.numBadge}>
      <Text style={styles.numText}>{item.id}</Text>
    </View>

    {/* Remarks text */}
    <Text style={styles.remarks}>{item.remarks ?? '—'}</Text>

    <Ionicons name="chevron-forward" size={16} color="#ccc" style={{ marginLeft: 8, flexShrink: 0 }} />
  </Pressable>
));

export default HandbookRow;

const styles = StyleSheet.create({
  numBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    flexShrink: 0,
  },
  numText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
  remarks: {
    flex: 1,
    fontSize: 14,
    color: '#1A1A1A',
    lineHeight: 20,
  },
});
