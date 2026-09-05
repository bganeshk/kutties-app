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
import { holidayRepository } from '../db/repositories';
import { syncSheet } from '../sync/sync.service';
import ConfirmDialog from '../components/shared/ConfirmDialog';
import type { TeachersHoliday } from '../db/models/holiday.model';
import { DOT_GREEN, DOT_YELLOW } from '../components/holiday/HolidayRow';

const PRIMARY = Colors.primary;

type Props = NativeStackScreenProps<HomeStackParamList, 'HolidayDetails'>;

function FlagDot({ val }: { val: boolean }) {
  return (
    <View style={[styles.dot, { backgroundColor: val ? DOT_GREEN : '#e0e0e0' }]} />
  );
}

function TeacherDot({ val }: { val: TeachersHoliday }) {
  const color = val === 'yes' ? DOT_GREEN : val === 'opt' ? DOT_YELLOW : '#e0e0e0';
  const label = val === 'yes' ? 'Mandatory' : val === 'opt' ? 'Optional' : 'Not applicable';
  return (
    <View style={styles.dotRow}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={styles.dotLabel}>{label}</Text>
    </View>
  );
}

function formatDate(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

export default function HolidayDetailsScreen({ navigation, route }: Props) {
  const [item, setItem]             = useState(route.params.item);
  const [deleteVisible, setDeleteVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      holidayRepository.findById(route.params.item.id).then((fresh) => {
        if (fresh) setItem(fresh);
      });
    }, [route.params.item.id]),
  );

  const handleDelete = useCallback(() => {
    holidayRepository.delete(item.id).then(() => {
      syncSheet(SHEETS.HOLIDAY_LIST).catch(() => {});
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
        <Text style={KStyles.headerTitle} numberOfLines={1}>Holiday</Text>
        <View style={KStyles.headerActions}>
          <TouchableOpacity
            style={KStyles.headerIcon}
            onPress={() => navigation.navigate('HolidayForm', { mode: 'edit', item })}
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

        {/* ── Hero card ─────────────────────────────────────────────────── */}
        <View style={KStyles.detailsHeroCard}>
          <View style={styles.heroIcon}>
            <Ionicons name="sunny" size={40} color="#fff" />
          </View>
          <Text style={styles.holidayName}>{item.description || '—'}</Text>
          <Text style={styles.holidayDate}>{formatDate(item.date)}</Text>
        </View>

        {/* ── Applicability ─────────────────────────────────────────────── */}
        <Text style={KStyles.detailsSection}>Applies To</Text>
        <View style={[KStyles.detailsCard, styles.flagsCard]}>
          {([
            { label: 'KG',      dot: <FlagDot val={item.kg} /> },
            { label: 'Daycare', dot: <FlagDot val={item.daycare} /> },
            { label: 'Tuition', dot: <FlagDot val={item.tuition} /> },
          ] as const).map(({ label, dot }, i, arr) => (
            <React.Fragment key={label}>
              <View style={styles.flagRow}>
                <Text style={styles.flagLabel}>{label}</Text>
                {dot}
              </View>
              {i < arr.length - 1 && <View style={styles.divider} />}
            </React.Fragment>
          ))}
          <View style={styles.divider} />
          <View style={styles.flagRow}>
            <Text style={styles.flagLabel}>Teachers</Text>
            <TeacherDot val={item.teachers} />
          </View>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* FAB — edit */}
      <TouchableOpacity
        style={KStyles.fab}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('HolidayForm', { mode: 'edit', item })}
      >
        <Ionicons name="create" size={26} color="#fff" />
      </TouchableOpacity>

      <ConfirmDialog
        visible={deleteVisible}
        title="Delete Holiday"
        message={`Are you sure you want to delete "${item.description}"? This cannot be undone.`}
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
  holidayName: { fontSize: 20, fontWeight: '700', color: '#1A1A1A', textAlign: 'center' },
  holidayDate: { fontSize: 13, color: '#666', marginTop: 4, textAlign: 'center' },
  flagsCard:   { paddingHorizontal: 16, paddingVertical: 8 },
  flagRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  flagLabel:   { fontSize: 14, color: '#333', fontWeight: '500' },
  divider:     { height: 1, backgroundColor: '#f0f0f0' },
  dot:         { width: 14, height: 14, borderRadius: 7 },
  dotRow:      { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dotLabel:    { fontSize: 13, color: '#444' },
});
