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
import { formatDisplayDate } from '../utils/dateUtils';
import { expenseRepository } from '../db/repositories';
import { syncSheet } from '../sync/sync.service';
import ConfirmDialog from '../components/shared/ConfirmDialog';
import InfoRow from '../components/shared/InfoRow';

const PRIMARY = Colors.primary;

type Props = NativeStackScreenProps<HomeStackParamList, 'ExpenseDetails'>;

function Section({ title }: { title: string }) {
  return <Text style={KStyles.detailsSection}>{title}</Text>;
}

function fmtCurrency(val: number | undefined): string | undefined {
  if (val == null) return undefined;
  return `₹${val.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
}

export default function ExpenseDetailsScreen({ navigation, route }: Props) {
  const [item, setItem]               = useState(route.params.item);
  const [deleteVisible, setDeleteVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      expenseRepository.findById(route.params.item.id).then((fresh) => {
        if (fresh) setItem(fresh);
      });
    }, [route.params.item.id]),
  );

  const handleDelete = useCallback(() => {
    expenseRepository.delete(item.id).then(() => {
      syncSheet(SHEETS.EXPENSE).catch(() => {});
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
        <Text style={KStyles.headerTitle} numberOfLines={1}>Expense</Text>
        <View style={KStyles.headerActions}>
          <TouchableOpacity
            style={KStyles.headerIcon}
            onPress={() => navigation.navigate('ExpenseForm', { mode: 'edit', item })}
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
          <View style={styles.heroAvatar}>
            <Text style={styles.heroAvatarText}>
              {(item.expenseType ?? '?').charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={KStyles.detailsHeroName} numberOfLines={1}>
            {item.recptNo ?? '—'}
          </Text>
          {item.expenseDate ? (
            <Text style={KStyles.detailsHeroDesignation}>
              {formatDisplayDate(item.expenseDate)}
            </Text>
          ) : null}
          {item.amount != null ? (
            <Text style={styles.heroAmount}>{fmtCurrency(item.amount)}</Text>
          ) : null}
          {item.expenseType ? (
            <View style={styles.typeBadge}>
              <Text style={styles.typeText}>{item.expenseType}</Text>
            </View>
          ) : null}
        </View>

        {/* ── Expense Info ──────────────────────────────────────────────── */}
        <Section title="Expense Info" />
        <View style={KStyles.detailsCard}>
          <InfoRow icon="wallet-outline"          label="Amount"       value={fmtCurrency(item.amount)} iconBg={PRIMARY} />
          <InfoRow icon="receipt-outline"         label="Receipt No"   value={item.recptNo} />
          <InfoRow icon="calendar-outline"        label="Expense Date" value={formatDisplayDate(item.expenseDate)} />
          <InfoRow icon="pricetag-outline"        label="Expense Type" value={item.expenseType} iconBg="#1565C0" />
          <InfoRow icon="card-outline"            label="Payment Mode" value={item.paymentMode} iconBg={PRIMARY} />
          {item.paidTo ? (
            <InfoRow icon="person-outline" label="Paid To" value={item.paidTo} />
          ) : null}
        </View>

        {/* ── Description ───────────────────────────────────────────────── */}
        {item.description ? (
          <>
            <Section title="Description" />
            <View style={KStyles.detailsCard}>
              <InfoRow icon="document-text-outline" label="Description" value={item.description} />
            </View>
          </>
        ) : null}

        {/* ── Remarks ───────────────────────────────────────────────────── */}
        {item.remarks ? (
          <>
            <Section title="Remarks" />
            <View style={KStyles.detailsCard}>
              <InfoRow icon="chatbubble-outline" label="Remarks" value={item.remarks} />
            </View>
          </>
        ) : null}

        {/* ── Audit ─────────────────────────────────────────────────────── */}
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

      {/* FAB — edit */}
      <TouchableOpacity
        style={KStyles.fab}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('ExpenseForm', { mode: 'edit', item })}
      >
        <Ionicons name="create" size={26} color="#fff" />
      </TouchableOpacity>

      <ConfirmDialog
        visible={deleteVisible}
        title="Delete Expense"
        message="Are you sure you want to delete this expense record? This cannot be undone."
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
    backgroundColor: '#1565C0',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 12,
  },
  heroAvatarText: { fontSize: 28, fontWeight: '700', color: '#fff' },
  heroAmount:     { fontSize: 22, fontWeight: '700', color: '#1A1A1A', marginTop: 8 },
  typeBadge: {
    marginTop: 10, paddingHorizontal: 16, paddingVertical: 5,
    borderRadius: 14, borderWidth: 1,
    backgroundColor: '#E3F2FD', borderColor: '#90CAF9',
  },
  typeText: { fontSize: 13, fontWeight: '700', color: '#1565C0', letterSpacing: 0.4 },
});
