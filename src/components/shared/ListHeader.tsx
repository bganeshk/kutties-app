import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ColMeta } from './ColMeta';
import { Colors } from '../../styles/kutties-styles';

interface ListHeaderProps {
  cols: ColMeta[];
}

export default function ListHeader({ cols }: ListHeaderProps) {
  return (
    <View style={styles.header}>
      {cols.map((col, i) => (
        <Text key={i} style={[styles.label, { flex: col.flex ?? 1 }]} numberOfLines={1}>
          {col.label ?? ''}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
