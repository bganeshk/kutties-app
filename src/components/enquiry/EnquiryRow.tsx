import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { EnquiryModel } from '../../db/models/enquiry.model';
import { Colors } from '../../styles/kutties-styles';

const PRIMARY = Colors.primary;

interface Props {
  item: EnquiryModel;
  index: number;
  onPress: (item: EnquiryModel) => void;
}

function formatDate(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function EnquiryRow({ item, index, onPress }: Props) {
  const isEven = index % 2 === 0;

  const openWhatsApp = useCallback(() => {
    const raw = item.whatsApp.replace(/\D/g, '');
    if (!raw) return;
    const url = `whatsapp://send?phone=${raw}`;
    Linking.canOpenURL(url).then(supported => {
      if (supported) Linking.openURL(url);
      else Alert.alert('WhatsApp not installed');
    });
  }, [item.whatsApp]);

  const openPhone = useCallback(() => {
    const raw = item.whatsApp.replace(/\D/g, '');
    if (!raw) return;
    Linking.openURL(`tel:${raw}`);
  }, [item.whatsApp]);

  return (
    <TouchableOpacity
      style={[styles.row, isEven ? styles.rowEven : styles.rowOdd]}
      onPress={() => onPress(item)}
      activeOpacity={0.75}
    >
      <View style={styles.left}>
        <Text style={styles.name} numberOfLines={1}>{item.studentName || '—'}</Text>
        <Text style={styles.meta} numberOfLines={1}>
          {item.classDivision ? `${item.classDivision}  ·  ` : ''}{formatDate(item.enqDate)}
        </Text>
        {item.whatsApp ? (
          <Text style={styles.phone} numberOfLines={1}>{item.whatsApp}</Text>
        ) : null}
      </View>

      <View style={styles.right}>
        {item.admissionTaken && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Admitted</Text>
          </View>
        )}

        {/* Quick-action icons — only shown when a number exists */}
        {item.whatsApp ? (
          <>
            <TouchableOpacity
              onPress={openWhatsApp}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 4 }}
              style={styles.iconBtn}
            >
              <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={openPhone}
              hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}
              style={styles.iconBtn}
            >
              <Ionicons name="call-outline" size={19} color={PRIMARY} />
            </TouchableOpacity>
          </>
        ) : null}

        <Ionicons name="chevron-forward" size={16} color="#ccc" />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  rowEven:   { backgroundColor: '#fff' },
  rowOdd:    { backgroundColor: '#f9f9fb' },
  left:      { flex: 1, gap: 2 },
  name:      { fontSize: 15, fontWeight: '600', color: '#1a1a1a' },
  meta:      { fontSize: 12, color: '#777' },
  phone:     { fontSize: 12, color: '#555' },
  right:     { flexDirection: 'row', alignItems: 'center', gap: 4 },
  iconBtn:   { padding: 2 },
  badge:     { backgroundColor: '#e8f5e9', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontSize: 10, fontWeight: '700', color: '#2e7d32' },
});
