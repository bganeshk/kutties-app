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
import { handbookRepository } from '../db/repositories';
import { syncSheet } from '../sync/sync.service';
import ConfirmDialog from '../components/shared/ConfirmDialog';

const PRIMARY = Colors.primary;

type Props = NativeStackScreenProps<HomeStackParamList, 'HandbookDetails'>;

export default function HandbookDetailsScreen({ navigation, route }: Props) {
  const [item, setItem] = useState(route.params.item);
  const [deleteVisible, setDeleteVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      handbookRepository.findById(route.params.item.id).then((fresh) => {
        if (fresh) setItem(fresh);
      });
    }, [route.params.item.id]),
  );

  const handleDelete = useCallback(() => {
    handbookRepository.delete(item.id).then(() => {
      syncSheet(SHEETS.HANDBOOK).catch(() => {});
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
        <Text style={KStyles.headerTitle} numberOfLines={1}>
          Handbook
        </Text>
        <View style={KStyles.headerActions}>
          <TouchableOpacity
            style={KStyles.headerIcon}
            onPress={() => navigation.navigate('HandbookForm', { mode: 'edit', item })}
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
            <Ionicons name="book" size={40} color="#fff" />
          </View>
          <Text style={styles.itemNumber}>Rule #{item.id}</Text>
        </View>

        {/* ── Remarks ───────────────────────────────────────────────────── */}
        {item.remarks ? (
          <>
            <Text style={KStyles.detailsSection}>Guideline</Text>
            <View style={[KStyles.detailsCard, styles.remarksCard]}>
              <Text style={styles.remarksText}>{item.remarks}</Text>
            </View>
          </>
        ) : null}

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* FAB — edit */}
      <TouchableOpacity
        style={KStyles.fab}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('HandbookForm', { mode: 'edit', item })}
      >
        <Ionicons name="create" size={26} color="#fff" />
      </TouchableOpacity>

      <ConfirmDialog
        visible={deleteVisible}
        title="Delete Entry"
        message={`Are you sure you want to delete rule #${item.id}? This cannot be undone.`}
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
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  itemNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  remarksCard: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  remarksText: {
    fontSize: 15,
    color: '#1A1A1A',
    lineHeight: 24,
  },
});
