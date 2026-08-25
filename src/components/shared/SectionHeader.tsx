import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../styles/kutties-styles';

interface SectionHeaderProps {
  label: string;
  count: number;
  collapsed: boolean;
  onToggle: () => void;
  dotColor?: string;
  bgColor?: string;
}

export default function SectionHeader({
  label,
  count,
  collapsed,
  onToggle,
  dotColor = Colors.primary,
  bgColor = '#F5F5F5',
}: SectionHeaderProps) {
  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: bgColor }]}
      onPress={onToggle}
      activeOpacity={0.8}
    >
      <View style={[styles.dot, { backgroundColor: dotColor }]} />
      <Text style={styles.label}>{label}</Text>
      <View style={styles.badge}>
        <Text style={styles.count}>{count}</Text>
      </View>
      <Ionicons
        name={collapsed ? 'chevron-down' : 'chevron-up'}
        size={16}
        color="#555"
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
  },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  label: { fontSize: 13, fontWeight: '700', color: '#333', flex: 1 },
  badge: {
    backgroundColor: '#E0E0E0',
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 1,
    marginRight: 6,
  },
  count: { fontSize: 11, fontWeight: '700', color: '#555' },
});
