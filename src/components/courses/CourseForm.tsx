import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { v4 as uuidv4 } from 'uuid';
import { Colors, KStyles } from '../../styles/kutties-styles';
import { SHEETS } from '../../utils/constants';
import { courseRepository, teacherRepository, getRefOptions, ensureReftbl } from '../../db/repositories';
import { syncSheet } from '../../sync/sync.service';
import type { CourseModel } from '../../db/models/course.model';
import Snackbar, { useSnackbar } from '../shared/Snackbar';
import AuditRow from '../shared/AuditRow';
import ConfirmDialog from '../shared/ConfirmDialog';
import { Field, InputField } from '../shared/FormField';
import MultiSelectDropdown from '../shared/MultiSelectDropdown';
import SingleSelectDropdown from '../shared/SingleSelectDropdown';

const PRIMARY = Colors.primary;

interface Props {
  navigation: any;
  route: { params: { mode: 'add' | 'edit'; item?: CourseModel } };
}

export default function CourseForm({ navigation, route }: Props) {
  const { mode, item } = route.params;
  const isEdit = mode === 'edit';

  // ── Form state ─────────────────────────────────────────────────────────────
  const [courseName,    setCourseName]    = useState(item?.courseName    ?? '');
  const [description,   setDescription]   = useState(item?.description   ?? '');
  const [subjectList,   setSubjectList]   = useState<string[]>(item?.subjectList ?? []);
  const [division,      setDivision]      = useState(item?.division      ?? '');
  const [classTeacher,  setClassTeacher]  = useState(item?.classTeacher  ?? '');
  const [courseFee,     setCourseFee]     = useState(String(item?.courseFee     ?? ''));
  const [admissionFee,  setAdmissionFee]  = useState(String(item?.admissionFee  ?? ''));
  const [afterSchoolFee,setAfterSchoolFee]= useState(String(item?.afterSchoolFee ?? ''));
  const [weekEndFee,    setWeekEndFee]    = useState(String(item?.weekEndFee     ?? ''));
  const [bookFee,       setBookFee]       = useState(item?.bookFee       ?? '');

  const [subjectOptions,    setSubjectOptions]    = useState<string[]>([]);
  const [loadingSubjects,   setLoadingSubjects]   = useState(true);
  const [teacherOptions,    setTeacherOptions]    = useState<string[]>([]);
  const [loadingTeachers,   setLoadingTeachers]   = useState(true);

  const [saving,  setSaving]  = useState(false);
  const [errors,  setErrors]  = useState<Record<string, string>>({});
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const snackbar = useSnackbar();

  // ── Load subject options from reftbl ───────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      await ensureReftbl();
      const opts = await getRefOptions('subject_ref');
      if (!cancelled) { setSubjectOptions(opts); setLoadingSubjects(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  // ── Load teacher options from teachers table ────────────────────────────────
  // Store email (unique) in DB; display "Name (email)" in the picker.
  const [teacherLabelToEmail, setTeacherLabelToEmail] = useState<Map<string, string>>(new Map());
  const [teacherEmailToLabel, setTeacherEmailToLabel] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let teachers = await teacherRepository.findActive();
      if (teachers.length === 0) {
        await syncSheet(SHEETS.STAFF);
        teachers = await teacherRepository.findActive();
      }
      if (!cancelled) {
        const labelToEmail = new Map<string, string>();
        const emailToLabel = new Map<string, string>();
        const labels: string[] = [];
        teachers
          .filter((t) => t.email)
          .sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''))
          .forEach((t) => {
            const label = t.name ? `${t.name} (${t.email})` : t.email!;
            labelToEmail.set(label, t.email!);
            emailToLabel.set(t.email!, label);
            labels.push(label);
          });
        setTeacherLabelToEmail(labelToEmail);
        setTeacherEmailToLabel(emailToLabel);
        setTeacherOptions(labels);
        setLoadingTeachers(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Resolve the stored email → display label for the dropdown's current value
  const classTeacherLabel = teacherEmailToLabel.get(classTeacher) ?? classTeacher;

  // ── Validation ─────────────────────────────────────────────────────────────
  const validate = useCallback(async (): Promise<boolean> => {
    const errs: Record<string, string> = {};
    if (!courseName.trim())    errs.courseName    = 'Course name is required';
    if (!division.trim())         errs.division     = 'Division is required';
    if (subjectList.length === 0) errs.subjects     = 'At least one subject is required';
    const fee = parseFloat(courseFee);
    if (!courseFee.trim() || isNaN(fee) || fee <= 0)
                                  errs.courseFee    = 'Course fee is required and must be greater than 0';
    const admFee = parseFloat(admissionFee);
    if (!admissionFee.trim() || isNaN(admFee) || admFee <= 0)
                                  errs.admissionFee = 'Admission fee is required and must be greater than 0';

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [courseName, division, subjectList, courseFee, admissionFee]);

  // ── Save ───────────────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!(await validate())) return;
    setSaving(true);
    try {
      const newId = isEdit ? item!.id : uuidv4();
      const subjectsStr = subjectList.join(', ');
      const course: CourseModel = {
        id:             newId,
        courseName:     courseName.trim()     || undefined,
        description:    description.trim()    || undefined,
        subjects:       subjectsStr,
        subjectList,
        division:       division.trim(),
        classTeacher:   classTeacher.trim()   || undefined,
        courseFee:      parseFloat(courseFee),
        admissionFee:   parseFloat(admissionFee),
        afterSchoolFee: afterSchoolFee.trim() ? parseFloat(afterSchoolFee) : undefined,
        weekEndFee:     weekEndFee.trim()     ? parseFloat(weekEndFee)     : undefined,
        bookFee:        bookFee.trim()        || undefined,
      };

      await courseRepository.save(course);
      syncSheet(SHEETS.COURSES).catch(() => {});

      snackbar.show(isEdit ? 'Changes saved' : 'Course added', 'success');
      navigation.goBack();
    } catch (e) {
      snackbar.show(`Save failed: ${(e as Error).message}`, 'error');
    } finally {
      setSaving(false);
    }
  }, [validate, isEdit, item, courseName, description, subjectList, division, classTeacher, courseFee, admissionFee, afterSchoolFee, weekEndFee, bookFee, navigation, snackbar]);

  const confirmDelete = useCallback(() => {
    setSaving(true);
    courseRepository.delete(item!.id)
      .then(() => {
        syncSheet(SHEETS.COURSES).catch(() => {});
        navigation.goBack();
      })
      .catch((e: Error) => {
        setSaving(false);
        snackbar.show(`Delete failed: ${e.message}`, 'error');
      });
  }, [item, navigation, snackbar]);

  const handleDelete = useCallback(() => {
    if (!item) { snackbar.show('No course selected', 'error'); return; }
    setDeleteDialogVisible(true);
  }, [item, snackbar]);

  return (
    <KeyboardAvoidingView
      style={KStyles.formRoot}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={KStyles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={KStyles.headerTitle}>{isEdit ? 'Edit Course' : 'Add Course'}</Text>
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

        {/* ── Course Details ──────────────────────────────────────────────── */}
        <Text style={KStyles.formSection}>Course Details</Text>

        <Field label="Course Name" required>
          <InputField value={courseName} onChangeText={setCourseName} placeholder="e.g. LKG" autoCapitalize="words" editable={true} />
          {errors.courseName ? <Text style={KStyles.formError}>{errors.courseName}</Text> : null}
        </Field>

        <Field label="Description">
          <InputField value={description} onChangeText={setDescription} placeholder="Brief description…" multiline editable={true} />
        </Field>

        <Field label="Division" required>
          <InputField value={division} onChangeText={setDivision} placeholder="e.g. A" autoCapitalize="characters" editable={true} />
        </Field>

        <Field label="Class Teacher">
          <SingleSelectDropdown
            selected={classTeacherLabel}
            options={teacherOptions}
            onChange={(label) => setClassTeacher(teacherLabelToEmail.get(label) ?? label)}
            placeholder="Select class teacher…"
            title="Class Teacher"
            loading={loadingTeachers}
          />
        </Field>

        <Field label="Subjects" required>
          <MultiSelectDropdown
            selected={subjectList}
            options={subjectOptions}
            onChange={setSubjectList}
            placeholder="Select subjects…"
            title="Subjects"
            loading={loadingSubjects}
          />
          {errors.subjects ? <Text style={KStyles.formError}>{errors.subjects}</Text> : null}
        </Field>

        {/* ── Fees ───────────────────────────────────────────────────────── */}
        <Text style={KStyles.formSection}>Fees</Text>

        <Field label="Course Fee (₹)" required>
          <InputField value={courseFee} onChangeText={setCourseFee} placeholder="e.g. 1500" keyboardType="numeric" editable={true} />
          {errors.courseFee ? <Text style={KStyles.formError}>{errors.courseFee}</Text> : null}
        </Field>

        <Field label="Admission Fee (₹)" required>
          <InputField value={admissionFee} onChangeText={setAdmissionFee} placeholder="e.g. 3000" keyboardType="numeric" editable={true} />
          {errors.admissionFee ? <Text style={KStyles.formError}>{errors.admissionFee}</Text> : null}
        </Field>

        <Field label="After School Fee (₹)">
          <InputField value={afterSchoolFee} onChangeText={setAfterSchoolFee} placeholder="e.g. 1000" keyboardType="numeric" editable={true} />
        </Field>

        <Field label="Weekend Fee (₹)">
          <InputField value={weekEndFee} onChangeText={setWeekEndFee} placeholder="e.g. 500" keyboardType="numeric" editable={true} />
        </Field>

        <Field label="Book Fee">
          <InputField value={bookFee} onChangeText={setBookFee} placeholder="e.g. Included" editable={true} />
        </Field>

        {/* ── Audit ──────────────────────────────────────────────────────── */}
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
            : <Text style={KStyles.formSaveBtnText}>{isEdit ? 'Save Changes' : 'Add Course'}</Text>}
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
        title="Delete Course"
        message={`Are you sure you want to delete "${item?.courseName ?? 'this course'}"? This cannot be undone.`}
        confirmLabel="Delete"
        destructive
        onConfirm={() => { setDeleteDialogVisible(false); confirmDelete(); }}
        onCancel={() => setDeleteDialogVisible(false)}
      />
    </KeyboardAvoidingView>
  );
}
