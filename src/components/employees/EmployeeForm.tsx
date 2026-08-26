import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, Alert, Animated, KeyboardAvoidingView,
  Platform, Switch, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { v4 as uuidv4 } from 'uuid';
import { Colors, KStyles } from '../../styles/kutties-styles';
import { employeeRepository } from '../../db/repositories';
import { syncSheet } from '../../sync/sync.service';
import type { EmployeeModel } from '../../db/models/employee.model';
import ConfirmDialog from '../shared/ConfirmDialog';

const PRIMARY = Colors.primary;

// ── Snackbar ─────────────────────────────────────────────────────────────────
type SnackbarKind = 'success' | 'error' | 'info';

function useSnackbar() {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState('');
  const [kind, setKind] = useState<SnackbarKind>('success');
  const opacity = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((msg: string, k: SnackbarKind = 'success') => {
    if (timer.current) clearTimeout(timer.current);
    setMessage(msg);
    setKind(k);
    setVisible(true);
    Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    timer.current = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }).start(() =>
        setVisible(false),
      );
    }, 2800);
  }, [opacity]);

  return { visible, message, kind, opacity, show };
}

function Snackbar({ visible, message, kind, opacity }: {
  visible: boolean;
  message: string;
  kind: SnackbarKind;
  opacity: Animated.Value;
}) {
  if (!visible) return null;
  const bg = kind === 'success' ? '#2E7D32' : kind === 'error' ? '#B71C1C' : '#1565C0';
  const icon = kind === 'success' ? 'checkmark-circle' : kind === 'error' ? 'alert-circle' : 'information-circle';
  return (
    <Animated.View style={[styles.snackbar, { backgroundColor: bg, opacity }]}>
      <Ionicons name={icon as any} size={18} color="#fff" style={{ marginRight: 8 }} />
      <Text style={styles.snackbarText}>{message}</Text>
    </Animated.View>
  );
}

interface Props {
  navigation: any;
  route: { params: { mode: 'add' | 'view' | 'edit'; item?: EmployeeModel } };
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>
        {label}
        {required && <Text style={styles.required}> *</Text>}
      </Text>
      {children}
    </View>
  );
}

function InputField({
  value, onChangeText, placeholder, keyboardType, autoCapitalize,
  multiline, editable,
}: {
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
  autoCapitalize?: 'none' | 'words' | 'sentences';
  multiline?: boolean;
  editable?: boolean;
}) {
  if (!editable) {
    return (
      <View style={[styles.input, styles.inputReadOnly, multiline && styles.inputMultiline]}>
        <Text style={styles.inputReadOnlyText}>{value || '—'}</Text>
      </View>
    );
  }
  return (
    <TextInput
      style={[styles.input, multiline && styles.inputMultiline]}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor="#bbb"
      keyboardType={keyboardType ?? 'default'}
      autoCapitalize={autoCapitalize ?? 'sentences'}
      multiline={multiline}
      editable={editable}
    />
  );
}

function AuditRow({ label, value }: { label: string; value?: string }) {
  return (
    <View style={styles.auditRow}>
      <Text style={styles.auditLabel}>{label}</Text>
      <Text style={styles.auditValue}>{value ?? '—'}</Text>
    </View>
  );
}

function PhotoPicker({ uri, onChange, editable = true }: { uri: string; onChange: (uri: string) => void; editable?: boolean }) {
  const pickImage = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please allow access to your photo library.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.6,
    });
    if (!result.canceled && result.assets[0]?.uri) {
      onChange(result.assets[0].uri);
    }
  }, [onChange]);

  const takePhoto = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please allow access to your camera.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.6,
    });
    if (!result.canceled && result.assets[0]?.uri) {
      onChange(result.assets[0].uri);
    }
  }, [onChange]);

  return (
    <View style={styles.photoContainer}>
      {uri ? (
        <View style={styles.photoPreviewWrap}>
          <Image source={{ uri }} style={styles.photoPreview} />
          {editable && (
            <TouchableOpacity style={styles.photoRemove} onPress={() => onChange('')}>
              <Ionicons name="close-circle" size={22} color="#B71C1C" />
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <View style={styles.photoPlaceholder}>
          <Ionicons name="person-outline" size={36} color="#ccc" />
          <Text style={styles.photoPlaceholderText}>No photo</Text>
        </View>
      )}
      {editable && (
        <View style={styles.photoBtnRow}>
          <TouchableOpacity style={styles.photoBtn} onPress={pickImage}>
            <Ionicons name="image-outline" size={16} color={PRIMARY} />
            <Text style={styles.photoBtnText}>Gallery</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.photoBtn} onPress={takePhoto}>
            <Ionicons name="camera-outline" size={16} color={PRIMARY} />
            <Text style={styles.photoBtnText}>Camera</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function parseDate(s: string): Date | null {
  if (!s || s.length < 10) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function applyDateMask(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 4) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}`;
}

function DatePicker({ value, onChange, editable = true }: { value: string; onChange: (v: string) => void; editable?: boolean }) {
  const [calOpen, setCalOpen] = useState(false);
  const parsed = parseDate(value);
  const today = new Date();
  const [viewYear,  setViewYear]  = useState(parsed?.getFullYear()  ?? today.getFullYear());
  const [viewMonth, setViewMonth] = useState(parsed?.getMonth()     ?? today.getMonth());

  const selectedDay = parsed?.getDate();
  const selectedMon = parsed?.getMonth();
  const selectedYr  = parsed?.getFullYear();

  const totalDays = daysInMonth(viewYear, viewMonth);
  const firstDow  = new Date(viewYear, viewMonth, 1).getDay();
  const cells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ];
  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const selectDay = (day: number) => {
    const d = new Date(viewYear, viewMonth, day);
    onChange(formatDate(d));
    setCalOpen(false);
  };

  if (!editable) {
    return (
      <View style={[styles.input, styles.inputReadOnly]}>
        <Text style={styles.inputReadOnlyText}>{value || '—'}</Text>
      </View>
    );
  }

  return (
    <View>
      <View style={styles.dateRow}>
        <TextInput
          style={[styles.input, styles.dateInput]}
          value={value}
          onChangeText={v => onChange(applyDateMask(v))}
          placeholder="YYYY-MM-DD"
          placeholderTextColor="#bbb"
          keyboardType="numeric"
          maxLength={10}
        />
        <TouchableOpacity
          style={[styles.dateCalBtn, calOpen && styles.dateCalBtnActive]}
          onPress={() => setCalOpen(o => !o)}
        >
          <Ionicons name="calendar-outline" size={20} color={calOpen ? '#fff' : PRIMARY} />
        </TouchableOpacity>
      </View>
      {calOpen && (
        <View style={styles.cal}>
          <View style={styles.calNav}>
            <TouchableOpacity onPress={prevMonth}>
              <Ionicons name="chevron-back" size={20} color="#555" />
            </TouchableOpacity>
            <Text style={styles.calMonthLabel}>{MONTHS[viewMonth]} {viewYear}</Text>
            <TouchableOpacity onPress={nextMonth}>
              <Ionicons name="chevron-forward" size={20} color="#555" />
            </TouchableOpacity>
          </View>
          <View style={styles.calWeekRow}>
            {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
              <Text key={d} style={styles.calDowCell}>{d}</Text>
            ))}
          </View>
          {weeks.map((week, wi) => (
            <View key={wi} style={styles.calWeekRow}>
              {week.map((day, di) => {
                const isSelected = day !== null && day === selectedDay && viewMonth === selectedMon && viewYear === selectedYr;
                const isToday = day !== null && day === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear();
                return (
                  <TouchableOpacity
                    key={di}
                    style={[styles.calDayCell, isSelected && styles.calDayCellSelected, !isSelected && isToday && styles.calDayCellToday]}
                    onPress={() => day && selectDay(day)}
                    disabled={!day}
                  >
                    <Text style={[styles.calDayText, isSelected && styles.calDayTextSelected, !isSelected && isToday && styles.calDayTextToday]}>
                      {day ?? ''}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

export default function EmployeeForm({ navigation, route }: Props) {
  const { mode, item } = route.params;
  const isRecordEdit = mode === 'view' || mode === 'edit';
  const [editable, setEditable] = useState(mode !== 'view');

  // ── Form state ─────────────────────────────────────────────────────────────
  const [name, setName]               = useState(item?.name ?? '');
  const [designation, setDesignation] = useState(item?.designation ?? '');
  const [department, setDepartment]   = useState(item?.department ?? '');
  const [email, setEmail]             = useState(item?.email ?? '');
  const [phone, setPhone]             = useState(item?.phone ?? '');
  const [address, setAddress]         = useState(item?.address ?? '');
  const [joiningDate, setJoiningDate] = useState(item?.joiningDate ?? '');
  const [idphoto, setIdphoto]         = useState(item?.idphoto ?? '');
  const [isActive, setIsActive]       = useState((item?.status ?? 'active') === 'active');
  const [saving, setSaving]           = useState(false);
  const [errors, setErrors]           = useState<Record<string, string>>({});
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const snackbar = useSnackbar();

  const handleCancelEdit = useCallback(() => {
    setName(item?.name ?? '');
    setDesignation(item?.designation ?? '');
    setDepartment(item?.department ?? '');
    setEmail(item?.email ?? '');
    setPhone(item?.phone ?? '');
    setAddress(item?.address ?? '');
    setJoiningDate(item?.joiningDate ?? '');
    setIdphoto(item?.idphoto ?? '');
    setIsActive((item?.status ?? 'active') === 'active');
    setErrors({});
    setEditable(false);
  }, [item]);

  // ── Validation ─────────────────────────────────────────────────────────────
  const validate = useCallback(async (): Promise<boolean> => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'Name is required';

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      errs.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      errs.email = 'Enter a valid email';
    } else {
      const emailChanged = trimmedEmail.toLowerCase() !== (item?.email ?? '').trim().toLowerCase();
      if (!isRecordEdit || emailChanged) {
        const currentId = isRecordEdit ? item!.id : '';
        const allEmployees = await employeeRepository.findAll();
        const dup = allEmployees.find(
          (e) => e.email?.toLowerCase() === trimmedEmail.toLowerCase() && e.id !== currentId,
        );
        if (dup) {
          errs.email = `Email already used by "${dup.name ?? dup.id}"`;
        }
      }
    }

    const trimmedPhone = phone.trim();
    if (!trimmedPhone) {
      errs.phone = 'Phone number is required';
    } else if (!/^[+\d\s\-()]{7,15}$/.test(trimmedPhone)) {
      errs.phone = 'Enter a valid phone number';
    }

    if (!address.trim()) errs.address = 'Address is required';

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [name, email, phone, address, isRecordEdit, item]);

  // ── Save ───────────────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!(await validate())) return;
    setSaving(true);
    try {
      const newId = isRecordEdit ? item!.id : uuidv4();
      const employee: EmployeeModel = {
        id:          newId,
        txid:        isRecordEdit ? item?.txid : newId,
        name:        name.trim() || undefined,
        designation: designation.trim() || undefined,
        department:  department.trim() || undefined,
        email:       email.trim() || undefined,
        phone:       phone.trim() || undefined,
        address:     address.trim() || undefined,
        joiningDate: joiningDate.trim() || undefined,
        idphoto:     idphoto || undefined,
        status:      isActive ? 'active' : 'inactive',
      };

      await employeeRepository.save(employee);

      syncSheet('employees').catch(() => {/* silent */});

      snackbar.show(isRecordEdit ? 'Changes saved' : 'Employee added', 'success');
      setTimeout(() => navigation.goBack(), 800);
    } catch (e) {
      snackbar.show(`Save failed: ${(e as Error).message}`, 'error');
    } finally {
      setSaving(false);
    }
  }, [validate, isRecordEdit, item, name, designation, department, email, phone, address, joiningDate, idphoto, isActive, navigation, snackbar]);

  const confirmDelete = useCallback(() => {
    setSaving(true);
    employeeRepository.delete(item!.id)
      .then(() => {
        syncSheet('employees').catch(() => {});
        navigation.goBack();
      })
      .catch((e: Error) => {
        setSaving(false);
        snackbar.show(`Delete failed: ${e.message}`, 'error');
      });
  }, [item, navigation, snackbar]);

  const handleDelete = useCallback(() => {
    if (!item) {
      snackbar.show('No employee selected', 'error');
      return;
    }
    setDeleteDialogVisible(true);
  }, [item, snackbar]);

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {mode === 'add' ? 'Add Employee' : editable ? 'Edit Employee' : 'Employee Details'}
        </Text>
        <View style={styles.headerActions}>
          {isRecordEdit && editable && (
            <TouchableOpacity
              onPress={handleCancelEdit}
              style={styles.headerIcon}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close-outline" size={24} color="#fff" />
            </TouchableOpacity>
          )}
          {isRecordEdit && !editable && (
            <TouchableOpacity
              onPress={() => setEditable(true)}
              style={styles.headerIcon}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="create-outline" size={22} color="#fff" />
            </TouchableOpacity>
          )}
          {isRecordEdit && (
            <TouchableOpacity
              onPress={handleDelete}
              style={styles.headerIcon}
              disabled={saving}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="trash-outline" size={22} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        {/* ── Personal ──────────────────────────────────────────────────────── */}
        <Text style={styles.section}>Personal</Text>

        <Field label="Full Name" required>
          <InputField
            value={name}
            onChangeText={setName}
            placeholder="e.g. Rahul Mehta"
            autoCapitalize="words"
            editable={editable}
          />
          {errors.name ? <Text style={styles.error}>{errors.name}</Text> : null}
        </Field>

        <Field label="Designation">
          <InputField
            value={designation}
            onChangeText={setDesignation}
            placeholder="e.g. Office Manager"
            autoCapitalize="words"
            editable={editable}
          />
        </Field>

        <Field label="Department">
          <InputField
            value={department}
            onChangeText={setDepartment}
            placeholder="e.g. Administration"
            autoCapitalize="words"
            editable={editable}
          />
        </Field>

        <Field label="Email" required>
          <InputField
            value={email}
            onChangeText={setEmail}
            placeholder="e.g. rahul@school.com"
            keyboardType="email-address"
            autoCapitalize="none"
            editable={editable}
          />
          {errors.email ? <Text style={styles.error}>{errors.email}</Text> : null}
        </Field>

        <Field label="Phone" required>
          <InputField
            value={phone}
            onChangeText={setPhone}
            placeholder="e.g. +91 98765 43210"
            keyboardType="phone-pad"
            autoCapitalize="none"
            editable={editable}
          />
          {errors.phone ? <Text style={styles.error}>{errors.phone}</Text> : null}
        </Field>

        <Field label="Address" required>
          <InputField
            value={address}
            onChangeText={setAddress}
            placeholder="Street, city…"
            multiline
            editable={editable}
          />
          {errors.address ? <Text style={styles.error}>{errors.address}</Text> : null}
        </Field>

        {/* ── ID Photo ──────────────────────────────────────────────────────── */}
        <Text style={styles.section}>ID Photo</Text>

        <Field label="Photo">
          <PhotoPicker uri={idphoto} onChange={setIdphoto} editable={editable} />
        </Field>

        {/* ── Employment ────────────────────────────────────────────────────── */}
        <Text style={styles.section}>Employment</Text>

        <Field label="Joining Date">
          <DatePicker value={joiningDate} onChange={setJoiningDate} editable={editable} />
        </Field>

        {/* ── Status ────────────────────────────────────────────────────────── */}
        <Text style={styles.section}>Status</Text>

        <View style={styles.statusRow}>
          <View style={styles.statusLeft}>
            <Text style={styles.statusLabel}>{isActive ? 'Active' : 'Inactive'}</Text>
            <Text style={styles.statusSub}>
              {isActive ? 'Employee will appear in the active list' : 'Employee will be archived'}
            </Text>
          </View>
          <Switch
            value={isActive}
            onValueChange={setIsActive}
            disabled={!editable}
            trackColor={{ false: '#ccc', true: Colors.lightPink }}
            thumbColor={isActive ? PRIMARY : '#f4f3f4'}
          />
        </View>

        {/* ── Audit ─────────────────────────────────────────────────────────── */}
        {isRecordEdit && item?.lastmodified && (
          <>
            <Text style={styles.section}>Audit</Text>
            <View style={styles.auditCard}>
              <AuditRow label="Last modified" value={item.lastmodified} />
            </View>
          </>
        )}

        {/* spacer so save button is above keyboard */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Save button — only shown when editable */}
      {editable && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={styles.saveBtnText}>{isRecordEdit ? 'Save Changes' : 'Add Employee'}</Text>}
          </TouchableOpacity>
        </View>
      )}

      <Snackbar
        visible={snackbar.visible}
        message={snackbar.message}
        kind={snackbar.kind}
        opacity={snackbar.opacity}
      />

      <ConfirmDialog
        visible={deleteDialogVisible}
        title="Delete Employee"
        message={`Are you sure you want to delete "${item?.name ?? 'this employee'}"? This cannot be undone.`}
        confirmLabel="Delete"
        destructive
        onConfirm={() => { setDeleteDialogVisible(false); confirmDelete(); }}
        onCancel={() => setDeleteDialogVisible(false)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F5F5F5' },
  header: KStyles.header,
  headerTitle: KStyles.headerTitle,
  headerIcon: KStyles.headerIcon,
  headerActions: { flexDirection: 'row' as const, alignItems: 'center' as const },
  scroll: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 24 },

  section: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 18,
    marginBottom: 8,
  },

  field: { marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '600', color: '#333', marginBottom: 4 },
  required: { color: PRIMARY },

  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1A1A1A',
  },
  inputMultiline: { height: 76, textAlignVertical: 'top' },

  inputReadOnly: {
    backgroundColor: '#FAFAFA',
    borderColor: Colors.border,
  },
  inputReadOnlyText: { fontSize: 14, color: '#1A1A1A' },

  error: { fontSize: 11, color: Colors.errorText, marginTop: 3 },

  // ── Date picker styles ─────────────────────────────────────────────────────
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dateInput: { flex: 1 },
  dateCalBtn: {
    width: 42,
    height: 42,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  dateCalBtnActive: { backgroundColor: PRIMARY },

  cal: {
    marginTop: 6,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: 10,
  },
  calNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  calMonthLabel: { fontSize: 14, fontWeight: '700', color: '#1A1A1A' },
  calWeekRow: { flexDirection: 'row' },
  calDowCell: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    color: Colors.muted,
    paddingVertical: 4,
  },
  calDayCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 34,
    borderRadius: 17,
    margin: 1,
  },
  calDayCellSelected: { backgroundColor: PRIMARY },
  calDayCellToday: { backgroundColor: Colors.lightPink },
  calDayText: { fontSize: 13, color: '#1A1A1A' },
  calDayTextSelected: { color: '#fff', fontWeight: '700' },
  calDayTextToday: { color: PRIMARY, fontWeight: '700' },

  // ── Photo picker styles ─────────────────────────────────────────────────────
  photoContainer: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  photoPreviewWrap: {
    position: 'relative',
    marginBottom: 10,
  },
  photoPreview: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  photoRemove: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#fff',
    borderRadius: 11,
  },
  photoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F0F0F0',
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  photoPlaceholderText: { fontSize: 11, color: Colors.muted, marginTop: 4 },
  photoBtnRow: { flexDirection: 'row', gap: 10 },
  photoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: PRIMARY,
    backgroundColor: '#fff',
  },
  photoBtnText: { fontSize: 13, color: PRIMARY, fontWeight: '600' },

  // ── Status ────────────────────────────────────────────────────────────────
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 12,
  },
  statusLeft: { flex: 1 },
  statusLabel: { fontSize: 14, fontWeight: '700', color: '#1A1A1A' },
  statusSub: { fontSize: 12, color: Colors.muted, marginTop: 2 },

  // ── Audit ─────────────────────────────────────────────────────────────────
  auditCard: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
  },
  auditRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  auditLabel: { fontSize: 12, color: Colors.muted, fontWeight: '600' },
  auditValue: { fontSize: 12, color: '#555', flexShrink: 1, textAlign: 'right', marginLeft: 8 },

  // ── Footer ────────────────────────────────────────────────────────────────
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: '#F5F5F5',
    borderTopWidth: 0.5,
    borderTopColor: Colors.border,
  },
  saveBtn: {
    backgroundColor: PRIMARY,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    elevation: 3,
    boxShadow: `0px 3px 6px ${PRIMARY}59`,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  // ── Snackbar ─────────────────────────────────────────────────────────────
  snackbar: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 13,
    elevation: 8,
    boxShadow: '0px 3px 6px rgba(0,0,0,0.20)',
  },
  snackbarText: { color: '#fff', fontSize: 14, fontWeight: '600', flex: 1 },
});
