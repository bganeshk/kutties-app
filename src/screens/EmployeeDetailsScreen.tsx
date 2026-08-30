import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, Linking, SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '../navigation/HomeStack';
import { Colors, KStyles } from '../styles/kutties-styles';
import { SHEETS } from '../utils/constants';
import { employeeRepository } from '../db/repositories';
import type { EmployeeModel } from '../db/models/employee.model';
import { syncSheet } from '../sync/sync.service';
import ConfirmDialog from '../components/shared/ConfirmDialog';
import InfoRow from '../components/shared/InfoRow';

const PRIMARY = Colors.primary;

type Props = NativeStackScreenProps<HomeStackParamList, 'EmployeeDetails'>;

// ── Small helpers ─────────────────────────────────────────────────────────────

function Avatar({ name, photo }: { name: string; photo?: string }) {
  if (photo) {
    return <Image source={{ uri: photo }} style={KStyles.detailsAvatar} />;
  }
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
  return (
    <View style={KStyles.detailsAvatarPlaceholder}>
      <Text style={KStyles.detailsAvatarText}>{initials || '?'}</Text>
    </View>
  );
}

function Section({ title }: { title: string }) {
  return <Text style={KStyles.detailsSection}>{title}</Text>;
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function EmployeeDetailsScreen({ navigation, route }: Props) {
  const [item, setItem] = useState<EmployeeModel>(route.params.item);
  const [deleteVisible, setDeleteVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      employeeRepository.findById(route.params.item.id).then((fresh) => {
        if (fresh) setItem(fresh);
      });
    }, [route.params.item.id]),
  );

  const name = item.name ?? item.id;

  const handleDelete = useCallback(() => {
    employeeRepository.delete(item.id).then(() => {
      syncSheet(SHEETS.EMPLOYEES).catch(() => {});
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
        <Text style={KStyles.headerTitle} numberOfLines={1}>Employee Details</Text>
        <View style={KStyles.headerActions}>
          <TouchableOpacity
            style={KStyles.headerIcon}
            onPress={() => navigation.navigate('EmployeeForm', { mode: 'edit', item })}
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

        {/* ── Hero card ────────────────────────────────────────────────────── */}
        <View style={KStyles.detailsHeroCard}>
          <Avatar name={String(name)} photo={item.idphoto} />
          <Text style={KStyles.detailsHeroName}>{name}</Text>
          {item.designation ? (
            <Text style={KStyles.detailsHeroDesignation}>{item.designation}</Text>
          ) : null}
          {item.department ? (
            <View style={styles.deptBadge}>
              <Ionicons name="business-outline" size={12} color="#4527A0" style={{ marginRight: 4 }} />
              <Text style={styles.deptBadgeText}>{item.department}</Text>
            </View>
          ) : null}
          <View style={[
            KStyles.detailsStatusBadge,
            item.status === 'active' ? KStyles.detailsStatusActive : KStyles.detailsStatusInactive,
          ]}>
            <Text style={[
              KStyles.detailsStatusBadgeText,
              item.status === 'active' ? KStyles.detailsStatusActiveText : KStyles.detailsStatusInactiveText,
            ]}>
              {item.status === 'active' ? 'Active' : 'Inactive'}
            </Text>
          </View>
        </View>

        {/* ── Quick actions ─────────────────────────────────────────────────── */}
        {(item.phone || item.email) && (
          <View style={KStyles.detailsQuickActions}>
            
            {item.phone && (
              <TouchableOpacity
                style={KStyles.detailsQaBtn}
                onPress={() => Linking.openURL(`whatsapp://send?phone=${item.phone}`)}
                activeOpacity={0.75}
              >
                <Ionicons name="logo-whatsapp" size={20} color="#2E7D32" />
                <Text style={KStyles.detailsQaBtnText}>WhatsApp</Text>
              </TouchableOpacity>
            )}
            {item.email && (
              <TouchableOpacity
                style={KStyles.detailsQaBtn}
                onPress={() => Linking.openURL(`mailto:${item.email}`)}
                activeOpacity={0.75}
              >
                <Ionicons name="mail" size={20} color={PRIMARY} />
                <Text style={KStyles.detailsQaBtnText}>Email</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={KStyles.detailsQaBtn}
              activeOpacity={0.75}
            >
              <Ionicons name="qr-code-outline" size={20} color="#6A1B9A" />
              <Text style={KStyles.detailsQaBtnText}>Clear QR</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Contact ───────────────────────────────────────────────────────── */}
        <Section title="Contact" />
        <View style={KStyles.detailsCard}>
          <InfoRow
            icon="call-outline"
            label="Phone"
            value={item.phone}
            onPress={item.phone ? () => Linking.openURL(`tel:${item.phone}`) : undefined}
            iconBg={PRIMARY}
          />
          <InfoRow
            icon="mail-outline"
            label="Email"
            value={item.email}
            onPress={item.email ? () => Linking.openURL(`mailto:${item.email}`) : undefined}
            iconBg={PRIMARY}
          />
          <InfoRow icon="location-outline" label="Address" value={item.address} />
        </View>

        {/* ── Employment ────────────────────────────────────────────────────── */}
        <Section title="Employment" />
        <View style={KStyles.detailsCard}>
          <InfoRow icon="briefcase-outline" label="Designation" value={item.designation} />
          <InfoRow icon="business-outline"  label="Department"  value={item.department} />
          <InfoRow icon="calendar-outline"  label="Joining Date" value={item.joiningDate} />
        </View>

        {/* ── ID Photo ──────────────────────────────────────────────────────── */}
        {item.idphoto ? (
          <>
            <Section title="ID Photo" />
            <View style={KStyles.detailsPhotoCard}>
              <Image source={{ uri: item.idphoto }} style={KStyles.detailsIdPhoto} resizeMode="cover" />
            </View>
          </>
        ) : null}

        {/* ── Audit ─────────────────────────────────────────────────────────── */}
        {item.lastmodified && (
          <>
            <Section title="Audit" />
            <View style={KStyles.detailsCard}>
              <InfoRow icon="time-outline" label="Last Modified" value={item.lastmodified} />
            </View>
          </>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>

      <TouchableOpacity
        style={KStyles.fab}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('EmployeeForm', { mode: 'edit', item })}
      >
        <Ionicons name="create" size={26} color="#fff" />
      </TouchableOpacity>

      <ConfirmDialog
        visible={deleteVisible}
        title="Delete Employee"
        message={`Are you sure you want to delete "${item.name ?? 'this employee'}"? This cannot be undone.`}
        confirmLabel="Delete"
        destructive
        onConfirm={() => { setDeleteVisible(false); handleDelete(); }}
        onCancel={() => setDeleteVisible(false)}
      />
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Employee-specific
  deptBadge: {
    flexDirection: 'row', alignItems: 'center',
    marginTop: 6, paddingHorizontal: 12, paddingVertical: 4,
    backgroundColor: '#EDE7F6', borderRadius: 12,
  },
  deptBadgeText: { fontSize: 12, fontWeight: '600', color: '#4527A0' },
});
