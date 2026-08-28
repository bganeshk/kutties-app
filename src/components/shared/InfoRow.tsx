import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../styles/kutties-styles';

const PRIMARY = Colors.primary;

interface InfoRowProps {
  icon: string;
  label: string;
  value?: string;
  onPress?: () => void;
  /** Optional background colour for the icon bubble. When provided the icon renders white on a filled circle. */
  iconBg?: string;
}

export default function InfoRow({ icon, label, value, onPress, iconBg }: InfoRowProps) {
  if (!value) return null;
  return (
    <TouchableOpacity
      style={styles.infoRow}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.6 : 1}
    >
      <View
        style={[
          styles.infoIconWrap,
          iconBg
            ? { backgroundColor: iconBg, borderRadius: 20, width: 26, height: 26, justifyContent: 'center', alignItems: 'center', marginRight: 12 }
            : undefined,
        ]}
      >
        <Ionicons name={icon as any} size={18} color={iconBg ? '#fff' : PRIMARY} />
      </View>
      <View style={styles.infoText}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={[styles.infoValue, onPress && styles.infoValueLink]}>{value}</Text>
      </View>
      {onPress && <Ionicons name="chevron-forward" size={16} color="#bbb" />}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
  },
  infoIconWrap: { width: 28, marginTop: 2, marginRight: 10 },
  infoText:     { flex: 1 },
  infoLabel:    { fontSize: 11, fontWeight: '600', color: Colors.muted, marginBottom: 2 },
  infoValue:    { fontSize: 14, color: '#1A1A1A' },
  infoValueLink:{ color: PRIMARY },
});
