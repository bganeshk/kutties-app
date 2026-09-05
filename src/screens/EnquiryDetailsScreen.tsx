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
import { enquiryRepository } from '../db/repositories';
import { syncSheet } from '../sync/sync.service';
import ConfirmDialog from '../components/shared/ConfirmDialog';

const PRIMARY = Colors.primary;

type Props = NativeStackScreenProps<HomeStackParamList, 'EnquiryDetails'>;

function formatDate(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function BoolRow({ label, value }: { label: string; value: boolean }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <View style={[styles.pill, value ? styles.pillYes : styles.pillNo]}>
        <Text style={[styles.pillText, value ? styles.pillTextYes : styles.pillTextNo]}>
          {value ? 'Yes' : 'No'}
        </Text>
      </View>
    </View>
  );
}

export default function EnquiryDetailsScreen({ navigation, route }: Props) {
  const [item, setItem]                   = useState(route.params.item);
  const [deleteVisible, setDeleteVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      enquiryRepository.findById(route.params.item.id).then((fresh) => {
        if (fresh) setItem(fresh);
      });
    }, [route.params.item.id]),
  );

  const handleDelete = useCallback(() => {
    enquiryRepository.delete(item.id).then(() => {
      syncSheet(SHEETS.ENQUIRIES).catch(() => {});
      navigation.goBack();
    });
  }, [item.id, navigation]);

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
        <Text style={KStyles.headerTitle} numberOfLines={1}>Enquiry</Text>
        <View style={KStyles.headerActions}>
          <TouchableOpacity
            style={KStyles.headerIcon}
            onPress={() => navigation.navigate('EnquiryForm', { mode: 'edit', item })}
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

        {/* Hero */}
        <View style={KStyles.detailsHeroCard}>
          <View style={styles.heroIcon}>
            <Ionicons name="mail-open-outline" size={40} color="#fff" />
          </View>
          <Text style={styles.heroName}>{item.studentName || '—'}</Text>
          <Text style={styles.heroSub}>{item.classDivision || ''}</Text>
        </View>

        {/* Enquiry Info */}
        <Text style={KStyles.detailsSection}>Enquiry Details</Text>
        <View style={KStyles.detailsCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Date</Text>
            <Text style={styles.infoValue}>{formatDate(item.enqDate)}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>WhatsApp</Text>
            <Text style={styles.infoValue}>{item.whatsApp || '—'}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Email</Text>
            <Text style={styles.infoValue}>{item.emailId || '—'}</Text>
          </View>
          {item.address ? (
            <>
              <View style={styles.divider} />
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Address</Text>
                <Text style={[styles.infoValue, { flex: 1, textAlign: 'right' }]}>{item.address}</Text>
              </View>
            </>
          ) : null}
        </View>

        {/* Status */}
        <Text style={KStyles.detailsSection}>Status</Text>
        <View style={KStyles.detailsCard}>
          <BoolRow label="WhatsApp Sent"   value={item.whatsAppSend} />
          <View style={styles.divider} />
          <BoolRow label="Mailed"          value={item.mailed} />
          <View style={styles.divider} />
          <BoolRow label="Admission Taken" value={item.admissionTaken} />
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* FAB — edit */}
      <TouchableOpacity
        style={KStyles.fab}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('EnquiryForm', { mode: 'edit', item })}
      >
        <Ionicons name="create" size={26} color="#fff" />
      </TouchableOpacity>

      <ConfirmDialog
        visible={deleteVisible}
        title="Delete Enquiry"
        message={`Are you sure you want to delete the enquiry for "${item.studentName}"? This cannot be undone.`}
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
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: PRIMARY,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 12,
  },
  heroName:  { fontSize: 20, fontWeight: '700', color: '#1A1A1A', textAlign: 'center' },
  heroSub:   { fontSize: 13, color: '#666', marginTop: 4, textAlign: 'center' },
  infoRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 16 },
  infoLabel: { fontSize: 14, color: '#555', fontWeight: '500' },
  infoValue: { fontSize: 14, color: '#1a1a1a' },
  divider:   { height: 1, backgroundColor: '#f0f0f0', marginHorizontal: 16 },
  pill:      { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 2 },
  pillYes:   { backgroundColor: '#e8f5e9' },
  pillNo:    { backgroundColor: '#f5f5f5' },
  pillText:  { fontSize: 12, fontWeight: '700' },
  pillTextYes: { color: '#2e7d32' },
  pillTextNo:  { color: '#999' },
});
