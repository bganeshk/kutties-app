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
import { STUDENT_STATUS_COLOR, STUDENT_STATUS_BG, STUDENT_STATUS_BORDER } from '../utils/constants';
import { studentRepository } from '../db/repositories';
import type { StudentModel } from '../db/models/student.model';
import { syncSheet } from '../sync/sync.service';
import ConfirmDialog from '../components/shared/ConfirmDialog';

const PRIMARY = Colors.primary;

type Props = NativeStackScreenProps<HomeStackParamList, 'StudentDetails'>;

// ── Small helpers ─────────────────────────────────────────────────────────────

function Avatar({ name, photo }: { name: string; photo?: string }) {
  if (photo) {
    return <Image source={{ uri: photo }} style={styles.avatar} />;
  }
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
  return (
    <View style={styles.avatarPlaceholder}>
      <Text style={styles.avatarText}>{initials || '?'}</Text>
    </View>
  );
}

function InfoRow({ icon, label, value, onPress }: {
  icon: string;
  label: string;
  value?: string;
  onPress?: () => void;
}) {
  if (!value) return null;
  return (
    <TouchableOpacity
      style={styles.infoRow}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.6 : 1}
    >
      <View style={styles.infoIconWrap}>
        <Ionicons name={icon as any} size={18} color={PRIMARY} />
      </View>
      <View style={styles.infoText}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={[styles.infoValue, onPress && styles.infoValueLink]}>{value}</Text>
      </View>
      {onPress && <Ionicons name="chevron-forward" size={16} color="#bbb" />}
    </TouchableOpacity>
  );
}

function Section({ title }: { title: string }) {
  return <Text style={styles.section}>{title}</Text>;
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function StudentDetailsScreen({ navigation, route }: Props) {
  const [item, setItem] = useState<StudentModel>(route.params.item);
  const [deleteVisible, setDeleteVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      studentRepository.findById(route.params.item.id).then((fresh) => {
        if (fresh) setItem(fresh);
      });
    }, [route.params.item.id]),
  );

  const name = item.fullName ?? item.id;

  const handleDelete = useCallback(() => {
    studentRepository.delete(item.id).then(() => {
      syncSheet('students').catch(() => {});
      navigation.goBack();
    });
  }, [item.id, navigation]);

  const status = item.status ?? 'active';

  return (
    <SafeAreaView style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>Student Details</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerIcon}
            onPress={() => navigation.navigate('StudentForm', { mode: 'edit', item })}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="create-outline" size={22} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerIcon}
            onPress={() => setDeleteVisible(true)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="trash-outline" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>

        {/* ── Hero card ────────────────────────────────────────────────────── */}
        <View style={styles.heroCard}>
          <Avatar name={String(name)} photo={item.idphoto} />
          <Text style={styles.heroName}>{name}</Text>
          {item.regNumber ? (
            <Text style={styles.heroReg}>Reg: {item.regNumber}</Text>
          ) : null}
          <View style={[
            styles.statusBadge,
            { backgroundColor: STUDENT_STATUS_BG[status] ?? '#F5F5F5', borderColor: STUDENT_STATUS_BORDER[status] ?? '#BDBDBD' },
          ]}>
            <Text style={[styles.statusBadgeText, { color: STUDENT_STATUS_COLOR[status] ?? '#757575' }]}>
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Text>
          </View>
        </View>

        {/* ── Quick actions ─────────────────────────────────────────────────── */}
        {(item.phone || item.email) && (
          <View style={styles.quickActions}>
            {item.phone && (
              <TouchableOpacity
                style={styles.qaBtn}
                onPress={() => Linking.openURL(`tel:${item.phone}`)}
                activeOpacity={0.75}
              >
                <Ionicons name="call" size={20} color="#1565C0" />
                <Text style={styles.qaBtnText}>Call</Text>
              </TouchableOpacity>
            )}
            {item.phone && (
              <TouchableOpacity
                style={styles.qaBtn}
                onPress={() => Linking.openURL(`whatsapp://send?phone=${item.phone}`)}
                activeOpacity={0.75}
              >
                <Ionicons name="logo-whatsapp" size={20} color="#2E7D32" />
                <Text style={styles.qaBtnText}>WhatsApp</Text>
              </TouchableOpacity>
            )}
            {item.email && (
              <TouchableOpacity
                style={styles.qaBtn}
                onPress={() => Linking.openURL(`mailto:${item.email}`)}
                activeOpacity={0.75}
              >
                <Ionicons name="mail" size={20} color={PRIMARY} />
                <Text style={styles.qaBtnText}>Email</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* ── Contact ───────────────────────────────────────────────────────── */}
        <Section title="Contact" />
        <View style={styles.card}>
          <InfoRow
            icon="call-outline"
            label="Phone"
            value={item.phone}
            onPress={item.phone ? () => Linking.openURL(`tel:${item.phone}`) : undefined}
          />
          <InfoRow
            icon="call-outline"
            label="Phone 2"
            value={item.phone2}
            onPress={item.phone2 ? () => Linking.openURL(`tel:${item.phone2}`) : undefined}
          />
          <InfoRow
            icon="mail-outline"
            label="Email"
            value={item.email}
            onPress={item.email ? () => Linking.openURL(`mailto:${item.email}`) : undefined}
          />
          <InfoRow icon="location-outline" label="Address" value={item.address} />
        </View>

        {/* ── Personal ──────────────────────────────────────────────────────── */}
        <Section title="Personal" />
        <View style={styles.card}>
          <InfoRow icon="people-outline" label="Mother's Name" value={item.motherName} />
          <InfoRow icon="people-outline" label="Father's Name" value={item.fatherName} />
          <InfoRow icon="calendar-outline" label="Date of Birth" value={item.dob} />
        </View>

        {/* ── Academic ──────────────────────────────────────────────────────── */}
        <Section title="Academic" />
        <View style={styles.card}>
          <InfoRow icon="school-outline" label="Course" value={item.course} />
          <InfoRow icon="calendar-outline" label="Admission Date" value={item.admissionDate} />
          <InfoRow icon="time-outline" label="After School" value={item.afterSchool} />
          <InfoRow icon="sunny-outline" label="Opt Weekend" value={item.optWeekend} />
        </View>

        {/* ── ID Photo ──────────────────────────────────────────────────────── */}
        {item.idphoto ? (
          <>
            <Section title="ID Photo" />
            <View style={styles.photoCard}>
              <Image source={{ uri: item.idphoto }} style={styles.idPhoto} resizeMode="cover" />
            </View>
          </>
        ) : null}

        {/* ── Audit ─────────────────────────────────────────────────────────── */}
        {item.lastmodified && (
          <>
            <Section title="Audit" />
            <View style={styles.card}>
              <InfoRow icon="time-outline" label="Last Modified" value={item.lastmodified} />
            </View>
          </>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>

      <TouchableOpacity
        style={KStyles.fab}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('StudentForm', { mode: 'edit', item })}
      >
        <Ionicons name="create" size={26} color="#fff" />
      </TouchableOpacity>

      <ConfirmDialog
        visible={deleteVisible}
        title="Delete Student"
        message={`Are you sure you want to delete "${item.fullName ?? 'this student'}"? This cannot be undone.`}
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
  root:           { flex: 1, backgroundColor: '#F5F5F5' },
  header:         KStyles.header,
  headerTitle:    KStyles.headerTitle,
  headerIcon:     KStyles.headerIcon,
  headerActions:  { flexDirection: 'row' as const, alignItems: 'center' as const },

  scroll: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 24 },

  heroCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 16,
    marginBottom: 12,
    elevation: 2,
    boxShadow: '0px 2px 6px rgba(0,0,0,0.08)',
  },
  avatar: { width: 88, height: 88, borderRadius: 44, marginBottom: 14 },
  avatarPlaceholder: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: PRIMARY,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 14,
  },
  avatarText:      { fontSize: 30, fontWeight: '700', color: '#fff' },
  heroName:        { fontSize: 20, fontWeight: '700', color: '#1A1A1A', textAlign: 'center' },
  heroReg:         { fontSize: 13, color: '#4A148C', fontWeight: '600', marginTop: 4 },
  statusBadge: {
    marginTop: 10, paddingHorizontal: 14, paddingVertical: 4,
    borderRadius: 12, borderWidth: 1,
  },
  statusBadgeText: { fontSize: 12, fontWeight: '700' },

  quickActions: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  qaBtn: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.surface, borderRadius: 12,
    paddingVertical: 12, gap: 6,
    elevation: 1, boxShadow: '0px 1px 3px rgba(0,0,0,0.06)',
  },
  qaBtnText: { fontSize: 12, fontWeight: '600', color: '#333' },

  section: {
    fontSize: 12, fontWeight: '700', color: Colors.muted,
    textTransform: 'uppercase', letterSpacing: 0.8,
    marginTop: 16, marginBottom: 8,
  },
  card: {
    backgroundColor: Colors.surface, borderRadius: 12,
    borderWidth: 0.5, borderColor: Colors.border,
    overflow: 'hidden', marginBottom: 4,
  },
  photoCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: Colors.border,
    overflow: 'hidden',
    marginBottom: 4,
    alignItems: 'center',
    paddingVertical: 16,
  },
  idPhoto: { width: 200, height: 200, borderRadius: 8 },

  infoRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: 0.5, borderBottomColor: Colors.border,
  },
  infoIconWrap: { width: 28, marginTop: 2, marginRight: 10 },
  infoText:     { flex: 1 },
  infoLabel:    { fontSize: 11, fontWeight: '600', color: Colors.muted, marginBottom: 2 },
  infoValue:    { fontSize: 14, color: '#1A1A1A' },
  infoValueLink:{ color: PRIMARY },
});
