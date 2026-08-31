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
import { staffPayRepository } from '../db/repositories';
import type { StaffPayModel } from '../db/models/staffpay.model';
import { syncSheet } from '../sync/sync.service';
import ConfirmDialog from '../components/shared/ConfirmDialog';
import InfoRow from '../components/shared/InfoRow';

const PRIMARY = Colors.primary;

type Props = NativeStackScreenProps<HomeStackParamList, 'StaffPayDetails'>;

function Section({ title }: { title: string }) {
  return <Text style={KStyles.detailsSection}>{title}</Text>;
}

function fmtCurrency(val: number | undefined): string | undefined {
  if (val == null) return undefined;
  return `₹${val.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
}

export default function StaffPayDetailsScreen({ navigation, route }: Props) {
  const [item, setItem]         = useState<StaffPayModel>(route.params.item);
  const [deleteVisible, setDeleteVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      staffPayRepository.findById(route.params.item.id).then((fresh) => {
        if (fresh) setItem(fresh);
      });
    }, [route.params.item.id]),
  );

  const handleDelete = useCallback(() => {
    staffPayRepository.delete(item.id).then(() => {
      syncSheet(SHEETS.STAFF_PAY).catch(() => {});
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
        <Text style={KStyles.headerTitle} numberOfLines={1}>Pay Record</Text>
        <View style={KStyles.headerActions}>
          <TouchableOpacity
            style={KStyles.headerIcon}
            onPress={() => navigation.navigate('StaffPayForm', { mode: 'edit', item })}
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

        {/* ── Hero card ──────────────────────────────────────────────────── */}
        <View style={KStyles.detailsHeroCard}>
          <View style={styles.heroAvatar}>
            <Ionicons name="wallet" size={36} color="#2E7D32" />
          </View>
          <Text style={KStyles.detailsHeroName} numberOfLines={1}>
            {item.staff ?? '—'}
          </Text>
          {item.payMonth ? (
            <Text style={KStyles.detailsHeroDesignation}>{item.payMonth}</Text>
          ) : null}
          {item.amount != null ? (
            <Text style={styles.heroAmount}>{fmtCurrency(item.amount)}</Text>
          ) : null}
          {item.payMode ? (
            <View style={styles.modeBadge}>
              <Text style={styles.modeText}>{item.payMode}</Text>
            </View>
          ) : null}
        </View>

        {/* ── Pay Info ────────────────────────────────────────────────────── */}
        <Section title="Pay Info" />
        <View style={KStyles.detailsCard}>
          <InfoRow icon="wallet-outline"          label="Amount"    value={fmtCurrency(item.amount)} iconBg={PRIMARY} />
          <InfoRow icon="receipt-outline"         label="Receipt No" value={item.recptNo} />
          <InfoRow icon="calendar-number-outline" label="Pay Month" value={item.payMonth} />
          <InfoRow icon="calendar-outline"        label="Pay Date"  value={item.payDate} />
          <InfoRow icon="card-outline"            label="Pay Mode"  value={item.payMode} iconBg={PRIMARY} />
        </View>

        {/* ── Remarks ─────────────────────────────────────────────────────── */}
        {item.remarks ? (
          <>
            <Section title="Remarks" />
            <View style={KStyles.detailsCard}>
              <InfoRow icon="chatbubble-outline" label="Remarks" value={item.remarks} />
            </View>
          </>
        ) : null}

        {/* ── Audit ───────────────────────────────────────────────────────── */}
        {item.lastmodified ? (
          <>
            <Section title="Audit" />
            <View style={KStyles.detailsCard}>
              <InfoRow icon="time-outline" label="Last Modified" value={item.lastmodified} />
            </View>
          </>
        ) : null}

        <View style={{ height: 32 }} />
      </ScrollView>

      <TouchableOpacity
        style={KStyles.fab}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('StaffPayForm', { mode: 'edit', item })}
      >
        <Ionicons name="create" size={26} color="#fff" />
      </TouchableOpacity>

      <ConfirmDialog
        visible={deleteVisible}
        title="Delete Pay Record"
        message="Are you sure you want to delete this pay record? This cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={() => { setDeleteVisible(false); handleDelete(); }}
        onCancel={() => setDeleteVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  heroAvatar: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 12,
  },
  heroAmount: { fontSize: 22, fontWeight: '700', color: '#1A1A1A', marginTop: 8 },
  modeBadge: {
    marginTop: 10, paddingHorizontal: 16, paddingVertical: 5,
    borderRadius: 14, borderWidth: 1,
    backgroundColor: '#E8F5E9', borderColor: '#A5D6A7',
  },
  modeText: { fontSize: 13, fontWeight: '700', color: '#2E7D32', letterSpacing: 0.4 },
});
