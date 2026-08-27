import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../styles/kutties-styles';

interface Props {
  label: string;
  count: number;
  collapsed: boolean;
  onToggle: () => void;
  dotColor?: string;
  bgColor?: string;
}

export default function SubSectionHeader({
  label,
  count,
  collapsed,
  onToggle,
  dotColor = '#1565C0',
  bgColor = '#E3F2FD',
}: Props) {
  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: bgColor }]}
      onPress={onToggle}
      activeOpacity={0.8}
    >
      <View style={styles.indent} />
      <View style={[styles.dot, { backgroundColor: dotColor }]} />
      <Text style={styles.label}>{label}</Text>
      <View style={styles.badge}>
        <Text style={styles.count}>{count}</Text>
      </View>
      <Ionicons
        name={collapsed ? 'chevron-down' : 'chevron-up'}
        size={14}
        color="#666"
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 28,
    paddingRight: 14,
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
  },
  indent: { width: 0 },
  dot: { width: 6, height: 6, borderRadius: 3, marginRight: 7 },
  label: { fontSize: 12, fontWeight: '600', color: '#444', flex: 1 },
  badge: {
    backgroundColor: '#BBDEFB',
    borderRadius: 9,
    paddingHorizontal: 6,
    paddingVertical: 1,
    marginRight: 6,
  },
  count: { fontSize: 10, fontWeight: '700', color: '#1565C0' },
});
