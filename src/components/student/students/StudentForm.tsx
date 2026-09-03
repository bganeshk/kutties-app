import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, ScrollView,
  TouchableOpacity, ActivityIndicator, KeyboardAvoidingView,
  Platform, Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { v4 as uuidv4 } from 'uuid';
import { Colors, KStyles } from '../../../styles/kutties-styles';
import { studentRepository, courseRepository } from '../../../db/repositories';
import { syncSheet } from '../../../sync/sync.service';
import { SHEETS } from '../../../utils/constants';
import type { StudentModel } from '../../../db/models/student.model';
import Snackbar, { useSnackbar } from '../../shared/Snackbar';
import AuditRow from '../../shared/AuditRow';
import PhotoPicker from '../../shared/PhotoPicker';
import ConfirmDialog from '../../shared/ConfirmDialog';
import FormDatePicker from '../../shared/FormDatePicker';
import RefDropdown from '../../shared/RefDropdown';
import { Field, InputField } from '../../shared/FormField';

const PRIMARY = Colors.primary;

interface Props {
  navigation: any;
  route: { params: { mode: 'add' | 'edit'; item?: StudentModel } };
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
  const [phone2, setPhone2]           = useState(item?.phone2        ? String(item.phone2)        : '');
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
      const courses = await courseRepository.findAll();
      if (!cancelled) {
        const opts = courses
          .filter((c) => c.courseName && c.division)
          .map((c) => `${c.courseName}: ${c.division}`);
        setCourseOptions(opts);
        setLoadingCourses(false);
      }
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
    if (phone2.trim() && !/^[+\d\s\-()]{7,15}$/.test(phone2.trim())) errs.phone2 = 'Enter a valid phone number';
    if (!email.trim())          errs.email        = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errs.email = 'Enter a valid email';
    if (!course)                errs.course       = 'Course / class is required';
    if (!admissionDate.trim())  errs.admissionDate = 'Admission date is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [fullName, regNumber, motherName, fatherName, dob, address, phone, phone2, email, course, admissionDate]);

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
        phone2:       phone2.trim() || undefined,
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
      syncSheet(SHEETS.STUDENTS).catch(() => {});
      snackbar.show(isEdit ? 'Changes saved' : 'Student added', 'success');
      navigation.goBack();
    } catch (e) {
      snackbar.show(`Save failed: ${(e as Error).message}`, 'error');
    } finally {
      setSaving(false);
    }
  }, [validate, isEdit, item, fullName, regNumber, motherName, fatherName, email, phone, phone2, address, dob, admissionDate, course, afterSchool, optWeekend, isActive, idphoto, navigation, snackbar]);

  const confirmDelete = useCallback(() => {
    setSaving(true);
    studentRepository.delete(item!.id)
      .then(() => {
        syncSheet(SHEETS.STUDENTS).catch(() => {});
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
    <KeyboardAvoidingView style={KStyles.formRoot} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

      {/* Header */}
      <View style={KStyles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={KStyles.headerTitle}>{mode === 'add' ? 'Add Student' : 'Edit Student'}</Text>
        <View style={KStyles.headerActions}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={KStyles.headerIcon} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="close-outline" size={24} color="#fff" />
          </TouchableOpacity>
          {isEdit && (
            <TouchableOpacity onPress={handleDelete} style={KStyles.headerIcon} disabled={saving} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="trash-outline" size={22} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView contentContainerStyle={KStyles.formScroll} keyboardShouldPersistTaps="handled">

        {/* ID Photo */}
        <Text style={KStyles.formSection}>Photo</Text>
        <Field label="ID Photo">
          <PhotoPicker uri={idphoto} onChange={setIdphoto} editable={true} />
        </Field>

        {/* Personal */}
        <Text style={KStyles.formSection}>Personal</Text>

        <Field label="Full Name" required>
          <InputField value={fullName} onChangeText={setFullName} placeholder="e.g. Ayaan S Sarath" autoCapitalize="words" />
          {errors.fullName ? <Text style={KStyles.formError}>{errors.fullName}</Text> : null}
        </Field>

        <Field label="Reg Number" required>
          <InputField value={regNumber} onChangeText={setRegNumber} placeholder="e.g. 24KRDA/102" autoCapitalize="characters" />
          {errors.regNumber ? <Text style={KStyles.formError}>{errors.regNumber}</Text> : null}
        </Field>

        <Field label="Mother's Name" required>
          <InputField value={motherName} onChangeText={setMotherName} placeholder="e.g. Swathi Lakshmi" autoCapitalize="words" />
          {errors.motherName ? <Text style={KStyles.formError}>{errors.motherName}</Text> : null}
        </Field>

        <Field label="Father's Name">
          <InputField value={fatherName} onChangeText={setFatherName} placeholder="e.g. Rajesh Kumar" autoCapitalize="words" />
          {errors.fatherName ? <Text style={KStyles.formError}>{errors.fatherName}</Text> : null}
        </Field>

        <Field label="Email" required>
          <InputField value={email} onChangeText={setEmail} placeholder="e.g. parent@email.com" keyboardType="email-address" autoCapitalize="none" />
          {errors.email ? <Text style={KStyles.formError}>{errors.email}</Text> : null}
        </Field>

        <Field label="Phone" required>
          <InputField value={phone} onChangeText={setPhone} placeholder="e.g. +91 98765 43210" keyboardType="phone-pad" autoCapitalize="none" />
          {errors.phone ? <Text style={KStyles.formError}>{errors.phone}</Text> : null}
        </Field>

        <Field label="Phone 2">
          <InputField value={phone2} onChangeText={setPhone2} placeholder="e.g. +91 98765 43210" keyboardType="phone-pad" autoCapitalize="none" />
          {errors.phone2 ? <Text style={KStyles.formError}>{errors.phone2}</Text> : null}
        </Field>

        <Field label="Address" required>
          <InputField value={address} onChangeText={setAddress} placeholder="Street, city…" multiline />
          {errors.address ? <Text style={KStyles.formError}>{errors.address}</Text> : null}
        </Field>

        <Field label="Date of Birth" required>
          <FormDatePicker value={dob} onChange={setDob} format="dmy" />
          {errors.dob ? <Text style={KStyles.formError}>{errors.dob}</Text> : null}
        </Field>

        {/* Academic */}
        <Text style={KStyles.formSection}>Academic</Text>

        <Field label="Course / Class" required>
          <RefDropdown
            value={course}
            options={courseOptions}
            onChange={setCourse}
            loading={loadingCourses}
            placeholder="Select course…"
            title="Course / Class"
          />
          {errors.course ? <Text style={KStyles.formError}>{errors.course}</Text> : null}
        </Field>

        <Field label="Admission Date" required>
          <FormDatePicker value={admissionDate} onChange={setAdmissionDate} format="dmy" />
          {errors.admissionDate ? <Text style={KStyles.formError}>{errors.admissionDate}</Text> : null}
        </Field>

        <View style={KStyles.formStatusRow}>
          <View style={KStyles.formStatusLeft}>
            <Text style={KStyles.formStatusLabel}>After School</Text>
            <Text style={KStyles.formStatusSub}>Enrolled in after-school programme</Text>
          </View>
          <Switch value={afterSchool} onValueChange={setAfterSchool}
            trackColor={{ false: '#ccc', true: Colors.lightPink }} thumbColor={afterSchool ? PRIMARY : '#f4f3f4'} />
        </View>

        <View style={KStyles.formStatusRow}>
          <View style={KStyles.formStatusLeft}>
            <Text style={KStyles.formStatusLabel}>Weekend Classes</Text>
            <Text style={KStyles.formStatusSub}>Opted for weekend sessions</Text>
          </View>
          <Switch value={optWeekend} onValueChange={setOptWeekend}
            trackColor={{ false: '#ccc', true: Colors.lightPink }} thumbColor={optWeekend ? PRIMARY : '#f4f3f4'} />
        </View>

        {/* Status */}
        <Text style={KStyles.formSection}>Status</Text>

        <View style={KStyles.formStatusRow}>
          <View style={KStyles.formStatusLeft}>
            <Text style={KStyles.formStatusLabel}>{isActive ? 'Active' : 'Inactive'}</Text>
            <Text style={KStyles.formStatusSub}>
              {isActive ? 'Student appears in the active list' : 'Student will be archived'}
            </Text>
          </View>
          <Switch value={isActive} onValueChange={setIsActive}
            trackColor={{ false: '#ccc', true: Colors.lightPink }} thumbColor={isActive ? PRIMARY : '#f4f3f4'} />
        </View>

        {/* Audit */}
        {isEdit && item?.lastmodified && (
          <>
            <Text style={KStyles.formSection}>Audit</Text>
            <View style={KStyles.formAuditCard}>
              <AuditRow label="Last modified" value={item.lastmodified} />
            </View>
          </>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Save button */}
      <View style={KStyles.formFooter}>
        <TouchableOpacity
          style={[KStyles.formSaveBtn, saving && KStyles.formSaveBtnDisabled]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={KStyles.formSaveBtnText}>{isEdit ? 'Save Changes' : 'Add Student'}</Text>}
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

