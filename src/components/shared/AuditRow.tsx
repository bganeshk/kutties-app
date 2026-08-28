import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../styles/kutties-styles';

interface AuditRowProps {
  label: string;
  value?: string;
}

export default function AuditRow({ label, value }: AuditRowProps) {
  if (!value) return null;
  const display = (() => {
    try {
      return new Date(value).toLocaleString();
    } catch {
      return value;
    }
  })();
  return (
    <View style={auditRowStyles.auditRow}>
      <Text style={auditRowStyles.auditLabel}>{label}</Text>
      <Text style={auditRowStyles.auditValue}>{display}</Text>
    </View>
  );
}

const auditRowStyles = StyleSheet.create({
  auditRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  auditLabel: { fontSize: 12, color: Colors.muted, fontWeight: '600' },
  auditValue: { fontSize: 12, color: '#555', flexShrink: 1, textAlign: 'right', marginLeft: 8 },
});
