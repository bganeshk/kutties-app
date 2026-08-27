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
import { studentRepository, getRefOptions, ensureReftbl } from '../../db/repositories';
import { syncSheet } from '../../sync/sync.service';
import type { StudentModel } from '../../db/models/student.model';
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
  visible: boolean; message: string; kind: SnackbarKind; opacity: Animated.Value;
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
  route: { params: { mode: 'add' | 'edit'; item?: StudentModel } };
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}{required && <Text style={styles.required}> *</Text>}</Text>
      {children}
    </View>
  );
}

function InputField({ value, onChangeText, placeholder, keyboardType, autoCapitalize, multiline, editable = true }: {
  value: string; onChangeText: (v: string) => void; placeholder?: string;
  keyboardType?: any; autoCapitalize?: any; multiline?: boolean; editable?: boolean;
}) {
  if (!editable) {
    return (
      <View style={[styles.input, multiline && styles.inputMultiline, styles.inputReadOnly]}>
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
      numberOfLines={multiline ? 3 : 1}
    />
  );
}

function AuditRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  const display = (() => {
    try { return new Date(value).toLocaleString(); } catch { return value; }
  })();
  return (
    <View style={styles.auditRow}>
      <Text style={styles.auditLabel}>{label}</Text>
      <Text style={styles.auditValue}>{display}</Text>
    </View>
  );
}

function PhotoPicker({ uri, onChange, editable = true }: { uri: string; onChange: (uri: string) => void; editable?: boolean }) {
  const pickFromGallery = useCallback(async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('Permission required', 'Please allow access to your photo library.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.7 });
    if (!result.canceled && result.assets[0]?.uri) onChange(result.assets[0].uri);
  }, [onChange]);

  const pickFromCamera = useCallback(async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) { Alert.alert('Permission required', 'Please allow camera access.'); return; }
    const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.7 });
    if (!result.canceled && result.assets[0]?.uri) onChange(result.assets[0].uri);
  }, [onChange]);

  return (
    <View style={styles.photoContainer}>
      {uri ? (
        <View style={styles.photoPreviewWrap}>
          <Image source={{ uri }} style={styles.photoPreview} resizeMode="cover" />
          {editable && (
            <TouchableOpacity style={styles.photoRemove}
              onPress={() => Alert.alert('Remove photo', 'Remove the photo?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Remove', style: 'destructive', onPress: () => onChange('') },
              ])}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
              <Ionicons name="close-circle" size={22} color={Colors.errorText} />
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <View style={styles.photoPlaceholder}>
          <Ionicons name="person-outline" size={40} color={Colors.muted} />
          <Text style={styles.photoPlaceholderText}>No photo</Text>
        </View>
      )}
      {editable && (
        <View style={styles.photoBtnRow}>
          <TouchableOpacity style={styles.photoBtn} onPress={pickFromCamera} activeOpacity={0.8}>
            <Ionicons name="camera-outline" size={18} color={PRIMARY} />
            <Text style={styles.photoBtnText}>Camera</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.photoBtn} onPress={pickFromGallery} activeOpacity={0.8}>
            <Ionicons name="image-outline" size={18} color={PRIMARY} />
            <Text style={styles.photoBtnText}>Gallery</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// ── Date helpers ──────────────────────────────────────────────────────────────
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}
function parseDate(s: string): Date | null {
  // accepts dd/MMM/yyyy  e.g. 15/Jan/2010
  const m = s.match(/^(\d{1,2})\/([A-Za-z]{3})\/(\d{4})$/);
  if (!m) return null;
  const month = MONTHS.findIndex(mo => mo.toLowerCase() === m[2].toLowerCase());
  if (month === -1) return null;
  const d = new Date(Number(m[3]), month, Number(m[1]));
  return isNaN(d.getTime()) ? null : d;
}
function formatDate(d: Date): string {
  return `${String(d.getDate()).padStart(2, '0')}/${MONTHS[d.getMonth()]}/${d.getFullYear()}`;
}
function applyDateMask(raw: string): string {
  // Allow digits, letters (for month abbr) and slashes; build dd/MMM/yyyy progressively
  const cleaned = raw.replace(/[^0-9a-zA-Z/]/g, '');
  // Strip all slashes then re-insert at correct positions
  const bare = cleaned.replace(/\//g, '');
  if (bare.length <= 2) return bare;
  // After day digits, insert first slash before month letters
  const day = bare.slice(0, 2);
  const rest = bare.slice(2);
  if (rest.length <= 3) return `${day}/${rest}`;
  // After 3-char month, insert second slash before year digits
  const mon = rest.slice(0, 3);
  const yr  = rest.slice(3, 7);
  return `${day}/${mon}/${yr}`;
}

function DatePicker({ value, onChange, editable = true }: { value: string; onChange: (v: string) => void; editable?: boolean }) {
  const today = new Date();
  const parsed = parseDate(value);
  const [calOpen, setCalOpen] = useState(false);
  const [viewYear, setViewYear] = useState(parsed?.getFullYear() ?? today.getFullYear());
  const [viewMonth, setViewMonth] = useState(parsed?.getMonth() ?? today.getMonth());

  useEffect(() => {
    if (parsed) { setViewYear(parsed.getFullYear()); setViewMonth(parsed.getMonth()); }
  }, [value]);

  const prevMonth = useCallback(() => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  }, [viewMonth]);

  const nextMonth = useCallback(() => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  }, [viewMonth]);

  const firstDow = new Date(viewYear, viewMonth, 1).getDay();
  const totalDays = daysInMonth(viewYear, viewMonth + 1);
  const cells: (number | null)[] = [...Array(firstDow).fill(null), ...Array.from({ length: totalDays }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);

  const selectedDay = parsed?.getFullYear() === viewYear && parsed?.getMonth() === viewMonth ? parsed.getDate() : null;
  const todayDay    = today.getFullYear() === viewYear && today.getMonth() === viewMonth ? today.getDate() : null;

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
          onChangeText={(raw) => onChange(applyDateMask(raw))}
          placeholder="DD/MMM/YYYY"
          placeholderTextColor="#bbb"
          keyboardType="default"
          autoCapitalize="words"
          maxLength={11}
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
            <TouchableOpacity onPress={prevMonth}><Ionicons name="chevron-back" size={18} color={PRIMARY} /></TouchableOpacity>
            <Text style={styles.calMonthLabel}>{MONTHS[viewMonth]} {viewYear}</Text>
            <TouchableOpacity onPress={nextMonth}><Ionicons name="chevron-forward" size={18} color={PRIMARY} /></TouchableOpacity>
          </View>
          <View style={styles.calWeekRow}>
            {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
              <Text key={d} style={styles.calDowCell}>{d}</Text>
            ))}
          </View>
          {Array.from({ length: cells.length / 7 }, (_, row) => (
            <View key={row} style={styles.calWeekRow}>
              {cells.slice(row * 7, row * 7 + 7).map((day, col) => {
                const isSel = day !== null && day === selectedDay;
                const isTod = day !== null && day === todayDay;
                return (
                  <TouchableOpacity
                    key={col}
                    style={[styles.calDayCell, isSel && styles.calDayCellSelected, !isSel && isTod && styles.calDayCellToday]}
                    onPress={() => { if (day !== null) { onChange(formatDate(new Date(viewYear, viewMonth, day))); setCalOpen(false); } }}
                    disabled={day === null}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.calDayText, isSel && styles.calDayTextSelected, !isSel && isTod && styles.calDayTextToday]}>
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

// ── Course dropdown ────────────────────────────────────────────────────────────
function CourseDropdown({ value, options, onChange, loading }: {
  value: string; options: string[]; onChange: (v: string) => void; loading: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <View>
      <TouchableOpacity
        style={[styles.input, styles.dropdownBtn]}
        onPress={() => setOpen(o => !o)}
      >
        {loading
          ? <ActivityIndicator size="small" color={PRIMARY} />
          : <Text style={value ? styles.dropdownValue : styles.dropdownPlaceholder} numberOfLines={1}>
              {value || 'Select course…'}
            </Text>
        }
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={Colors.muted} />
      </TouchableOpacity>
      {open && (
        <View style={styles.dropdownList}>
          {options.map(opt => (
            <TouchableOpacity
              key={opt}
              style={[styles.dropdownItem, value === opt && styles.dropdownItemSelected]}
              onPress={() => { onChange(opt); setOpen(false); }}
            >
              <Text style={[styles.dropdownItemText, value === opt && styles.dropdownItemTextSelected]}>{opt}</Text>
              {value === opt && <Ionicons name="checkmark" size={16} color={PRIMARY} />}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

// ── Main form ─────────────────────────────────────────────────────────────────
export default function StudentForm({ navigation, route }: Props) {
  const { mode, item } = route.params;
  const isEdit = mode === 'edit';

  const [fullName, setFullName]       = useState(item?.fullName      ? String(item.fullName)      : '');
  const [regNumber, setRegNumber]     = useState(item?.regNumber     ? String(item.regNumber)     : '');
  const [motherName, setMotherName]   = useState(item?.motherName    ? String(item.motherName)    : '');
  const [fatherName, setFatherName]   = useState(item?.fatherName    ? String(item.fatherName)    : '');
  const [email, setEmail]             = useState(item?.email         ? String(item.email)         : '');
  const [phone, setPhone]             = useState(item?.phone         ? String(item.phone)         : '');
  const [address, setAddress]         = useState(item?.address       ? String(item.address)       : '');
  const [dob, setDob]                 = useState(item?.dob           ? String(item.dob)           : '');
  const [admissionDate, setAdmissionDate] = useState(item?.admissionDate ? String(item.admissionDate) : '');
  const [course, setCourse]           = useState(item?.course        ? String(item.course)        : '');
  const [afterSchool, setAfterSchool] = useState(item?.afterSchool === 'Y');
  const [optWeekend, setOptWeekend]   = useState(item?.optWeekend === 'Y');
  const [isActive, setIsActive]       = useState((item?.status ?? 'active') === 'active');
  const [idphoto, setIdphoto]         = useState(item?.idphoto ?? '');
  const [saving, setSaving]           = useState(false);
  const [errors, setErrors]           = useState<Record<string, string>>({});
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const snackbar = useSnackbar();

  const [courseOptions, setCourseOptions] = useState<string[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await ensureReftbl();
      const opts = await getRefOptions('graderef');
      if (!cancelled) { setCourseOptions(opts); setLoadingCourses(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  const validate = useCallback(async (): Promise<boolean> => {
    const errs: Record<string, string> = {};
    if (!fullName.trim())       errs.fullName     = 'Full name is required';
    if (!regNumber.trim())      errs.regNumber    = 'Reg number is required';
    if (!motherName.trim())     errs.motherName   = "Mother's name is required";
    if (!dob.trim())            errs.dob          = 'Date of birth is required';
    if (!address.trim())        errs.address      = 'Address is required';
    if (!phone.trim())          errs.phone        = 'Phone is required';
    else if (!/^[+\d\s\-()]{7,15}$/.test(phone.trim())) errs.phone = 'Enter a valid phone number';
    if (!email.trim())          errs.email        = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errs.email = 'Enter a valid email';
    if (!course)                errs.course       = 'Course / class is required';
    if (!admissionDate.trim())  errs.admissionDate = 'Admission date is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [fullName, regNumber, motherName, fatherName, dob, address, phone, email, course, admissionDate]);

  const handleSave = useCallback(async () => {
    if (!(await validate())) return;
    setSaving(true);
    try {
      const student: StudentModel = {
        id:           isEdit ? item!.id : uuidv4(),
        fullName:     fullName.trim() || undefined,
        regNumber:    regNumber.trim() || undefined,
        motherName:   motherName.trim() || undefined,
        fatherName:   fatherName.trim() || undefined,
        email:        email.trim() || undefined,
        phone:        phone.trim() || undefined,
        address:      address.trim() || undefined,
        dob:          dob.trim() || undefined,
        admissionDate: admissionDate.trim() || undefined,
        course:       course || undefined,
        afterSchool:  afterSchool ? 'Y' : 'N',
        optWeekend:   optWeekend ? 'Y' : 'N',
        status:       isActive ? 'active' : 'inactive',
        idphoto:      idphoto || undefined,
      };
      await studentRepository.save(student);
      syncSheet('students').catch(() => {});
      snackbar.show(isEdit ? 'Changes saved' : 'Student added', 'success');
      navigation.goBack();
    } catch (e) {
      snackbar.show(`Save failed: ${(e as Error).message}`, 'error');
    } finally {
      setSaving(false);
    }
  }, [validate, isEdit, item, fullName, regNumber, motherName, fatherName, email, phone, address, dob, admissionDate, course, afterSchool, optWeekend, isActive, idphoto, navigation, snackbar]);

  const confirmDelete = useCallback(() => {
    setSaving(true);
    studentRepository.delete(item!.id)
      .then(() => {
        syncSheet('students').catch(() => {});
        navigation.goBack();
      })
      .catch((e: Error) => {
        setSaving(false);
        snackbar.show(`Delete failed: ${e.message}`, 'error');
      });
  }, [item, navigation, snackbar]);

  const handleDelete = useCallback(() => {
    if (!item) { snackbar.show('No student selected', 'error'); return; }
    setDeleteDialogVisible(true);
  }, [item, snackbar]);

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{mode === 'add' ? 'Add Student' : 'Edit Student'}</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerIcon} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="close-outline" size={24} color="#fff" />
          </TouchableOpacity>
          {isEdit && (
            <TouchableOpacity onPress={handleDelete} style={styles.headerIcon} disabled={saving} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="trash-outline" size={22} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        {/* ID Photo */}
        <Text style={styles.section}>Photo</Text>
        <Field label="ID Photo">
          <PhotoPicker uri={idphoto} onChange={setIdphoto} editable={true} />
        </Field>

        {/* Personal */}
        <Text style={styles.section}>Personal</Text>

        <Field label="Full Name" required>
          <InputField value={fullName} onChangeText={setFullName} placeholder="e.g. Ayaan S Sarath" autoCapitalize="words" />
          {errors.fullName ? <Text style={styles.error}>{errors.fullName}</Text> : null}
        </Field>

        <Field label="Reg Number" required>
          <InputField value={regNumber} onChangeText={setRegNumber} placeholder="e.g. 24KRDA/102" autoCapitalize="characters" />
          {errors.regNumber ? <Text style={styles.error}>{errors.regNumber}</Text> : null}
        </Field>

        <Field label="Mother's Name" required>
          <InputField value={motherName} onChangeText={setMotherName} placeholder="e.g. Swathi Lakshmi" autoCapitalize="words" />
          {errors.motherName ? <Text style={styles.error}>{errors.motherName}</Text> : null}
        </Field>

        <Field label="Father's Name">
          <InputField value={fatherName} onChangeText={setFatherName} placeholder="e.g. Rajesh Kumar" autoCapitalize="words" />
          {errors.fatherName ? <Text style={styles.error}>{errors.fatherName}</Text> : null}
        </Field>

        <Field label="Email" required>
          <InputField value={email} onChangeText={setEmail} placeholder="e.g. parent@email.com" keyboardType="email-address" autoCapitalize="none" />
          {errors.email ? <Text style={styles.error}>{errors.email}</Text> : null}
        </Field>

        <Field label="Phone" required>
          <InputField value={phone} onChangeText={setPhone} placeholder="e.g. +91 98765 43210" keyboardType="phone-pad" autoCapitalize="none" />
          {errors.phone ? <Text style={styles.error}>{errors.phone}</Text> : null}
        </Field>

        <Field label="Address" required>
          <InputField value={address} onChangeText={setAddress} placeholder="Street, city…" multiline />
          {errors.address ? <Text style={styles.error}>{errors.address}</Text> : null}
        </Field>

        <Field label="Date of Birth" required>
          <DatePicker value={dob} onChange={setDob} />
          {errors.dob ? <Text style={styles.error}>{errors.dob}</Text> : null}
        </Field>

        {/* Academic */}
        <Text style={styles.section}>Academic</Text>

        <Field label="Course / Class" required>
          <CourseDropdown value={course} options={courseOptions} onChange={setCourse} loading={loadingCourses} />
          {errors.course ? <Text style={styles.error}>{errors.course}</Text> : null}
        </Field>

        <Field label="Admission Date" required>
          <DatePicker value={admissionDate} onChange={setAdmissionDate} />
          {errors.admissionDate ? <Text style={styles.error}>{errors.admissionDate}</Text> : null}
        </Field>

        <View style={styles.switchRow}>
          <View style={styles.switchLeft}>
            <Text style={styles.switchLabel}>After School</Text>
            <Text style={styles.switchSub}>Enrolled in after-school programme</Text>
          </View>
          <Switch value={afterSchool} onValueChange={setAfterSchool}
            trackColor={{ false: '#ccc', true: Colors.lightPink }} thumbColor={afterSchool ? PRIMARY : '#f4f3f4'} />
        </View>

        <View style={styles.switchRow}>
          <View style={styles.switchLeft}>
            <Text style={styles.switchLabel}>Weekend Classes</Text>
            <Text style={styles.switchSub}>Opted for weekend sessions</Text>
          </View>
          <Switch value={optWeekend} onValueChange={setOptWeekend}
            trackColor={{ false: '#ccc', true: Colors.lightPink }} thumbColor={optWeekend ? PRIMARY : '#f4f3f4'} />
        </View>

        {/* Status */}
        <Text style={styles.section}>Status</Text>

        <View style={styles.switchRow}>
          <View style={styles.switchLeft}>
            <Text style={styles.switchLabel}>{isActive ? 'Active' : 'Inactive'}</Text>
            <Text style={styles.switchSub}>
              {isActive ? 'Student appears in the active list' : 'Student will be archived'}
            </Text>
          </View>
          <Switch value={isActive} onValueChange={setIsActive}
            trackColor={{ false: '#ccc', true: Colors.lightPink }} thumbColor={isActive ? PRIMARY : '#f4f3f4'} />
        </View>

        {/* Audit */}
        {isEdit && item?.lastmodified && (
          <>
            <Text style={styles.section}>Audit</Text>
            <View style={styles.auditCard}>
              <AuditRow label="Last modified" value={item.lastmodified} />
            </View>
          </>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Save button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={styles.saveBtnText}>{isEdit ? 'Save Changes' : 'Add Student'}</Text>}
        </TouchableOpacity>
      </View>

      <Snackbar visible={snackbar.visible} message={snackbar.message} kind={snackbar.kind} opacity={snackbar.opacity} />

      <ConfirmDialog
        visible={deleteDialogVisible}
        title="Delete Student"
        message={`Are you sure you want to delete "${item?.fullName ?? 'this student'}"? This cannot be undone.`}
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
    fontSize: 12, fontWeight: '700', color: Colors.muted,
    textTransform: 'uppercase', letterSpacing: 0.8,
    marginTop: 18, marginBottom: 8,
  },
  field: { marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '600', color: '#333', marginBottom: 4 },
  required: { color: PRIMARY },

  input: {
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 14, color: '#1A1A1A',
  },
  inputMultiline: { height: 76, textAlignVertical: 'top' },
  inputReadOnly: { backgroundColor: '#FAFAFA', borderColor: Colors.border },
  inputReadOnlyText: { fontSize: 14, color: '#1A1A1A' },
  error: { fontSize: 11, color: Colors.errorText, marginTop: 3 },

  // Course dropdown
  dropdownBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dropdownValue: { fontSize: 14, color: '#1A1A1A', flex: 1 },
  dropdownPlaceholder: { fontSize: 14, color: '#bbb', flex: 1 },
  dropdownList: {
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 8, marginTop: 4, maxHeight: 200, overflow: 'hidden',
  },
  dropdownItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 10 },
  dropdownItemSelected: { backgroundColor: Colors.lightPink },
  dropdownItemText: { fontSize: 14, color: '#1A1A1A' },
  dropdownItemTextSelected: { color: PRIMARY, fontWeight: '700' },

  // Date picker
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dateInput: { flex: 1 },
  dateCalBtn: { width: 42, height: 42, borderRadius: 8, borderWidth: 1, borderColor: PRIMARY, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  dateCalBtnActive: { backgroundColor: PRIMARY },
  cal: { marginTop: 6, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 10, padding: 10 },
  calNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, paddingHorizontal: 4 },
  calMonthLabel: { fontSize: 14, fontWeight: '700', color: '#1A1A1A' },
  calWeekRow: { flexDirection: 'row' },
  calDowCell: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '700', color: Colors.muted, paddingVertical: 4 },
  calDayCell: { flex: 1, alignItems: 'center', justifyContent: 'center', height: 34, borderRadius: 17, margin: 1 },
  calDayCellSelected: { backgroundColor: PRIMARY },
  calDayCellToday: { backgroundColor: Colors.lightPink },
  calDayText: { fontSize: 13, color: '#1A1A1A' },
  calDayTextSelected: { color: '#fff', fontWeight: '700' },
  calDayTextToday: { color: PRIMARY, fontWeight: '700' },

  // Photo picker
  photoContainer: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 10, padding: 12, alignItems: 'center' },
  photoPreviewWrap: { position: 'relative', marginBottom: 10 },
  photoPreview: { width: 100, height: 100, borderRadius: 50, borderWidth: 2, borderColor: Colors.border },
  photoRemove: { position: 'absolute', top: -4, right: -4, backgroundColor: '#fff', borderRadius: 11 },
  photoPlaceholder: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#F0F0F0', borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  photoPlaceholderText: { fontSize: 11, color: Colors.muted, marginTop: 4 },
  photoBtnRow: { flexDirection: 'row', gap: 10 },
  photoBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: PRIMARY, backgroundColor: '#fff' },
  photoBtnText: { fontSize: 13, color: PRIMARY, fontWeight: '600' },

  // Switch rows
  switchRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: 10, padding: 14, borderWidth: 1, borderColor: Colors.border, marginBottom: 12 },
  switchLeft: { flex: 1 },
  switchLabel: { fontSize: 14, fontWeight: '700', color: '#1A1A1A' },
  switchSub: { fontSize: 12, color: Colors.muted, marginTop: 2 },

  // Audit
  auditCard: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 12 },
  auditRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  auditLabel: { fontSize: 12, color: Colors.muted, fontWeight: '600' },
  auditValue: { fontSize: 12, color: '#555', flexShrink: 1, textAlign: 'right', marginLeft: 8 },

  // Footer
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, backgroundColor: '#F5F5F5', borderTopWidth: 0.5, borderTopColor: Colors.border },
  saveBtn: { backgroundColor: PRIMARY, borderRadius: 10, paddingVertical: 14, alignItems: 'center', elevation: 3, boxShadow: `0px 3px 6px ${PRIMARY}59` },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  // Snackbar
  snackbar: { position: 'absolute', bottom: 24, left: 16, right: 16, flexDirection: 'row', alignItems: 'center', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 13, elevation: 8, boxShadow: '0px 3px 6px rgba(0,0,0,0.20)' },
  snackbarText: { color: '#fff', fontSize: 14, fontWeight: '600', flex: 1 },
});
