import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, ScrollView,
  TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { v4 as uuidv4 } from 'uuid';
import { Colors, KStyles } from '../../../styles/kutties-styles';
import { SHEETS } from '../../../utils/constants';
import { studentHealthRepository, studentRepository, courseRepository } from '../../../db/repositories';
import { syncSheet } from '../../../sync/sync.service';
import type { StudentHealthModel } from '../../../db/models/studenthealth.model';
import Snackbar, { useSnackbar } from '../../shared/Snackbar';
import AuditRow from '../../shared/AuditRow';
import ConfirmDialog from '../../shared/ConfirmDialog';
import FormDatePicker from '../../shared/FormDatePicker';
import { Field, InputField } from '../../shared/FormField';
import SingleSelectDropdown from '../../shared/SingleSelectDropdown';

interface Props {
  navigation: any;
  route: { params: { mode: 'add' | 'edit'; item?: StudentHealthModel; prefilledRegNumber?: string } };
}

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];

export default function StudentHealthForm({ navigation, route }: Props) {
  const { mode, item, prefilledRegNumber } = route.params;
  const isEdit = mode === 'edit';

  // ── Form state ──────────────────────────────────────────────────────────────
  const [regNumber,          setRegNumber]          = useState(item?.regNumber          ?? prefilledRegNumber ?? '');
  const [checkupDate,        setCheckupDate]        = useState(item?.checkupDate        ?? '');
  const [height,             setHeight]             = useState(item?.height?.toString() ?? '');
  const [weight,             setWeight]             = useState(item?.weight?.toString() ?? '');
  const [bloodGroup,         setBloodGroup]         = useState(item?.bloodGroup         ?? '');
  const [prescription,       setPrescription]       = useState(item?.prescription       ?? '');
  const [allergies,          setAllergies]          = useState(item?.allergies          ?? '');
  const [medicalConditions,  setMedicalConditions]  = useState(item?.medicalConditions  ?? '');
  const [medications,        setMedications]        = useState(item?.medications        ?? '');
  const [remarks,            setRemarks]            = useState(item?.remarks            ?? '');

  const [saving,  setSaving]  = useState(false);
  const [errors,  setErrors]  = useState<Record<string, string>>({});
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const snackbar = useSnackbar();

  // ── Student options (keyed by regNumber) ────────────────────────────────────
  const [studentOptions,   setStudentOptions]   = useState<string[]>([]);
  const [regToName,        setRegToName]        = useState<Record<string, string>>({});
  const [studentGroups,    setStudentGroups]    = useState<Record<string, string[]>>({});
  const [loadingStudents,  setLoadingStudents]  = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let rows = await studentRepository.findAll();
      if (rows.length === 0) {
        await syncSheet(SHEETS.STUDENTS);
        rows = await studentRepository.findAll();
      }
      const courses = await courseRepository.findAll();
      if (!cancelled) {
        // regNumber → display name
        const map: Record<string, string> = {};
        rows.forEach((s) => { if (s.regNumber) map[s.regNumber] = s.fullName ?? s.regNumber; });
        setRegToName(map);
        setStudentOptions(rows.filter((s) => s.regNumber).map((s) => s.regNumber!).sort());

        // Build course → regNumber[] groups, ordered by course table sequence
        const courseNames = courses.map((c) => c.courseName ?? '').filter(Boolean);
        const groupMap: Record<string, string[]> = {};
        courseNames.forEach((name) => { groupMap[name] = []; });
        rows.forEach((s) => {
          if (!s.regNumber) return;
          const course = s.course?.trim() ?? '';
          if (!course) return;
          if (!groupMap[course]) groupMap[course] = [];
          groupMap[course].push(s.regNumber);
        });
        // Drop empty groups and sort by display name within each group
        const filtered: Record<string, string[]> = {};
        for (const [course, regs] of Object.entries(groupMap)) {
          if (regs.length === 0) continue;
          filtered[course] = regs.sort((a, b) =>
            (map[a] ?? a).localeCompare(map[b] ?? b),
          );
        }
        setStudentGroups(filtered);
        setLoadingStudents(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ── Validation ──────────────────────────────────────────────────────────────
  const validate = useCallback((): boolean => {
    const errs: Record<string, string> = {};
    if (!regNumber.trim()) errs.regNumber   = 'Student is required';
    if (!checkupDate.trim()) errs.checkupDate = 'Date is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [regNumber, checkupDate]);

  // ── Save ────────────────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const entry: StudentHealthModel = {
        id:                isEdit ? item!.id : uuidv4(),
        regNumber:         regNumber.trim()         || undefined,
        checkupDate:       checkupDate.trim()       || undefined,
        height:            height.trim()            ? Number(height.trim())  : undefined,
        weight:            weight.trim()            ? Number(weight.trim())  : undefined,
        bloodGroup:        bloodGroup               || undefined,
        prescription:      prescription.trim()      || undefined,
        allergies:         allergies.trim()         || undefined,
        medicalConditions: medicalConditions.trim() || undefined,
        medications:       medications.trim()       || undefined,
        remarks:           remarks.trim()           || undefined,
      };
      await studentHealthRepository.save(entry);
      syncSheet(SHEETS.STUDENT_HEALTH).catch(() => {});
      snackbar.show(isEdit ? 'Changes saved' : 'Health record added', 'success');
      navigation.goBack();
    } catch (e) {
      snackbar.show(`Save failed: ${(e as Error).message}`, 'error');
    } finally {
      setSaving(false);
    }
  }, [validate, isEdit, item, regNumber, checkupDate, height, weight, bloodGroup, prescription, allergies, medicalConditions, medications, remarks, navigation, snackbar]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Delete ──────────────────────────────────────────────────────────────────
  const confirmDelete = useCallback(() => {
    setSaving(true);
    studentHealthRepository.delete(item!.id)
      .then(() => {
        syncSheet(SHEETS.STUDENT_HEALTH).catch(() => {});
        navigation.goBack();
      })
      .catch((e: Error) => {
        setSaving(false);
        snackbar.show(`Delete failed: ${e.message}`, 'error');
      });
  }, [item, navigation, snackbar]);

  return (
    <KeyboardAvoidingView
      style={KStyles.formRoot}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={KStyles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={KStyles.headerTitle}>
          {mode === 'add' ? 'Add Health Record' : 'Edit Health Record'}
        </Text>
        <View style={KStyles.headerActions}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={KStyles.headerIcon}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close-outline" size={24} color="#fff" />
          </TouchableOpacity>
          {isEdit && (
            <TouchableOpacity
              onPress={() => setDeleteDialogVisible(true)}
              style={KStyles.headerIcon}
              disabled={saving}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="trash-outline" size={22} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView contentContainerStyle={KStyles.formScroll} keyboardShouldPersistTaps="handled">

        {/* ── Student ────────────────────────────────────────────────────────── */}
        <Text style={KStyles.formSection}>Student</Text>

        <Field label="Student" required>
          <SingleSelectDropdown
            selected={regNumber}
            options={studentOptions}
            onChange={setRegNumber}
            placeholder="Select a student…"
            title="Select Student"
            loading={loadingStudents}
            groups={Object.keys(studentGroups).length > 0 ? studentGroups : undefined}
            renderLabel={(reg) => regToName[reg] ? `${regToName[reg]} (${reg})` : reg}
          />
          {errors.regNumber ? <Text style={KStyles.formError}>{errors.regNumber}</Text> : null}
        </Field>

        {/* ── Record ─────────────────────────────────────────────────────────── */}
        <Text style={KStyles.formSection}>Record Details</Text>

        <Field label="Checkup Date" required>
          <FormDatePicker value={checkupDate} onChange={setCheckupDate} format="iso" />
          {errors.checkupDate ? <Text style={KStyles.formError}>{errors.checkupDate}</Text> : null}
        </Field>

        <Field label="Blood Group">
          <SingleSelectDropdown
            selected={bloodGroup}
            options={BLOOD_GROUPS}
            onChange={setBloodGroup}
            placeholder="Select blood group…"
            title="Blood Group"
          />
        </Field>

        <Field label="Height (cm)">
          <InputField
            value={height}
            onChangeText={setHeight}
            placeholder="e.g. 165"
            keyboardType="numeric"
            editable
          />
        </Field>

        <Field label="Weight (kg)">
          <InputField
            value={weight}
            onChangeText={setWeight}
            placeholder="e.g. 55"
            keyboardType="numeric"
            editable
          />
        </Field>

        {/* ── Medical ────────────────────────────────────────────────────────── */}
        <Text style={KStyles.formSection}>Medical</Text>

        <Field label="Prescription">
          <InputField
            value={prescription}
            onChangeText={setPrescription}
            placeholder="Prescribed treatments…"
            multiline
            editable
          />
        </Field>

        <Field label="Allergies">
          <InputField
            value={allergies}
            onChangeText={setAllergies}
            placeholder="List any allergies…"
            multiline
            editable
          />
        </Field>

        <Field label="Medical Conditions">
          <InputField
            value={medicalConditions}
            onChangeText={setMedicalConditions}
            placeholder="Any medical conditions…"
            multiline
            editable
          />
        </Field>

        <Field label="Medications">
          <InputField
            value={medications}
            onChangeText={setMedications}
            placeholder="Current medications…"
            multiline
            editable
          />
        </Field>

        {/* ── Remarks ────────────────────────────────────────────────────────── */}
        <Text style={KStyles.formSection}>Remarks</Text>

        <Field label="Remarks">
          <InputField
            value={remarks}
            onChangeText={setRemarks}
            placeholder="Any additional remarks…"
            multiline
            editable
          />
        </Field>

        {/* ── Audit ──────────────────────────────────────────────────────────── */}
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
            : <Text style={KStyles.formSaveBtnText}>{isEdit ? 'Save Changes' : 'Save Record'}</Text>}
        </TouchableOpacity>
      </View>

      <Snackbar
        visible={snackbar.visible}
        message={snackbar.message}
        kind={snackbar.kind}
        opacity={snackbar.opacity}
      />

      <ConfirmDialog
        visible={deleteDialogVisible}
        title="Delete Health Record"
        message="Are you sure you want to delete this health record? This cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={() => { setDeleteDialogVisible(false); confirmDelete(); }}
        onCancel={() => setDeleteDialogVisible(false)}
      />
    </KeyboardAvoidingView>
  );
}
