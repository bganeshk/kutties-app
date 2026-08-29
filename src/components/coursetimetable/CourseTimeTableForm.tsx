import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { v4 as uuidv4 } from 'uuid';
import { Colors, KStyles } from '../../styles/kutties-styles';
import {
  courseTimeTableRepository,
  teacherRepository,
  courseRepository,
  getRefOptions,
  ensureReftbl,
} from '../../db/repositories';
import { syncSheet } from '../../sync/sync.service';
import type { CourseTimeTableModel } from '../../db/models/coursetimetable.model';
import Snackbar, { useSnackbar } from '../shared/Snackbar';
import AuditRow from '../shared/AuditRow';
import ConfirmDialog from '../shared/ConfirmDialog';
import { Field, InputField } from '../shared/FormField';
import SingleSelectDropdown from '../shared/SingleSelectDropdown';

const PRIMARY = Colors.primary;

interface Props {
  navigation: any;
  route: { params: { mode: 'add' | 'edit'; item?: CourseTimeTableModel } };
}

export default function CourseTimeTableForm({ navigation, route }: Props) {
  const { mode, item } = route.params;
  const isEdit = mode === 'edit';

  // ── Form state ────────────────────────────────────────────────────────────
  const [courseDivision, setCourseDivision] = useState(item?.courseDivision ?? '');
  const [day,            setDay]            = useState(item?.day            ?? '');
  const [subject,        setSubject]        = useState(item?.subject        ?? '');
  const [teacher,        setTeacher]        = useState(item?.teacher        ?? '');
  const [startTime,      setStartTime]      = useState(item?.startTime      ?? '');
  const [endTime,        setEndTime]        = useState(item?.endTime        ?? '');
  const [notes,          setNotes]          = useState(item?.notes          ?? '');

  // ── Reference options ─────────────────────────────────────────────────────
  // Course-Division: built from courses table as "CourseName: Division"
  const [courseDivisionOptions,    setCourseDivisionOptions]    = useState<string[]>([]);
  const [loadingCourseDivisions,   setLoadingCourseDivisions]   = useState(true);

  // Day: from dayref in reftbl
  const [dayOptions,    setDayOptions]    = useState<string[]>([]);
  const [loadingDays,   setLoadingDays]   = useState(true);

  // Subject: from subject_ref in reftbl
  const [subjectOptions,  setSubjectOptions]  = useState<string[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(true);

  // Teacher: from teachers table — stored as email, displayed as "Name (email)"
  const [teacherOptions,      setTeacherOptions]      = useState<string[]>([]);
  const [loadingTeachers,     setLoadingTeachers]     = useState(true);
  const [teacherLabelToEmail, setTeacherLabelToEmail] = useState<Map<string, string>>(new Map());
  const [teacherEmailToLabel, setTeacherEmailToLabel] = useState<Map<string, string>>(new Map());

  const [saving,             setSaving]             = useState(false);
  const [errors,             setErrors]             = useState<Record<string, string>>({});
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const snackbar = useSnackbar();

  // ── Load course-division options ──────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    courseRepository.findAll().then((courses) => {
      if (cancelled) return;
      const options = courses
        .filter((c) => c.courseName && c.division)
        .map((c) => `${c.courseName}: ${c.division}`)
        .sort();
      setCourseDivisionOptions([...new Set(options)]);
      setLoadingCourseDivisions(false);
    });
    return () => { cancelled = true; };
  }, []);

  // ── Load day options from reftbl (dayref) ─────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      await ensureReftbl();
      const opts = await getRefOptions('dayref');
      if (!cancelled) { setDayOptions(opts); setLoadingDays(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  // ── Load subject options from reftbl (subject_ref) ────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      await ensureReftbl();
      const opts = await getRefOptions('subject_ref');
      if (!cancelled) { setSubjectOptions(opts); setLoadingSubjects(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  // ── Load teacher options from teachers table ──────────────────────────────
  useEffect(() => {
    let cancelled = false;
    teacherRepository.findActive().then((teachers) => {
      if (cancelled) return;
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
    });
    return () => { cancelled = true; };
  }, []);

  // Resolve stored teacher email → display label for the dropdown
  const teacherLabel = teacherEmailToLabel.get(teacher) ?? teacher;

  // ── Validation ────────────────────────────────────────────────────────────
  const validate = useCallback((): boolean => {
    const errs: Record<string, string> = {};
    if (!courseDivision.trim()) errs.courseDivision = 'Course / Division is required';
    if (!day.trim())            errs.day            = 'Day is required';
    if (!subject.trim())        errs.subject        = 'Subject is required';
    if (!teacher.trim())        errs.teacher        = 'Teacher is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [courseDivision, day, subject, teacher]);

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const entry: CourseTimeTableModel = {
        id:             isEdit ? item!.id : uuidv4(),
        courseDivision: courseDivision.trim(),
        day:            day.trim(),
        subject:        subject.trim(),
        teacher:        teacher.trim(),
        startTime:      startTime.trim() || undefined,
        endTime:        endTime.trim()   || undefined,
        notes:          notes.trim()     || undefined,
      };
      await courseTimeTableRepository.save(entry);
      syncSheet('coursetimetbl').catch(() => {});
      snackbar.show(isEdit ? 'Changes saved' : 'Entry added', 'success');
      navigation.goBack();
    } catch (e) {
      snackbar.show(`Save failed: ${(e as Error).message}`, 'error');
    } finally {
      setSaving(false);
    }
  }, [validate, isEdit, item, courseDivision, day, subject, teacher, startTime, endTime, notes, navigation, snackbar]);

  const confirmDelete = useCallback(() => {
    setSaving(true);
    courseTimeTableRepository.delete(item!.id)
      .then(() => {
        syncSheet('coursetimetbl').catch(() => {});
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
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={KStyles.headerTitle}>{isEdit ? 'Edit Timetable Entry' : 'Add Timetable Entry'}</Text>
        <View style={KStyles.headerActions}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={KStyles.headerIcon} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="close-outline" size={24} color="#fff" />
          </TouchableOpacity>
          {isEdit && (
            <TouchableOpacity onPress={() => setDeleteDialogVisible(true)} style={KStyles.headerIcon} disabled={saving} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="trash-outline" size={22} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView contentContainerStyle={KStyles.formScroll} keyboardShouldPersistTaps="handled">

        {/* ── Schedule ──────────────────────────────────────────────────── */}
        <Text style={KStyles.formSection}>Schedule</Text>

        <Field label="Course / Division" required>
          <SingleSelectDropdown
            selected={courseDivision}
            options={courseDivisionOptions}
            onChange={setCourseDivision}
            placeholder="Select course / division…"
            title="Course / Division"
            loading={loadingCourseDivisions}
          />
          {errors.courseDivision ? <Text style={KStyles.formError}>{errors.courseDivision}</Text> : null}
        </Field>

        <Field label="Day" required>
          <SingleSelectDropdown
            selected={day}
            options={dayOptions}
            onChange={setDay}
            placeholder="Select day…"
            title="Day"
            loading={loadingDays}
          />
          {errors.day ? <Text style={KStyles.formError}>{errors.day}</Text> : null}
        </Field>

        <Field label="Subject" required>
          <SingleSelectDropdown
            selected={subject}
            options={subjectOptions}
            onChange={setSubject}
            placeholder="Select subject…"
            title="Subject"
            loading={loadingSubjects}
          />
          {errors.subject ? <Text style={KStyles.formError}>{errors.subject}</Text> : null}
        </Field>

        <Field label="Teacher" required>
          <SingleSelectDropdown
            selected={teacherLabel}
            options={teacherOptions}
            onChange={(label) => setTeacher(teacherLabelToEmail.get(label) ?? label)}
            placeholder="Select teacher…"
            title="Teacher"
            loading={loadingTeachers}
          />
          {errors.teacher ? <Text style={KStyles.formError}>{errors.teacher}</Text> : null}
        </Field>

        {/* ── Timing ────────────────────────────────────────────────────── */}
        <Text style={KStyles.formSection}>Timing (optional)</Text>

        <Field label="Start Time">
          <InputField
            value={startTime}
            onChangeText={setStartTime}
            placeholder="e.g. 09:00"
            editable
          />
        </Field>

        <Field label="End Time">
          <InputField
            value={endTime}
            onChangeText={setEndTime}
            placeholder="e.g. 10:00"
            editable
          />
        </Field>

        <Field label="Notes">
          <InputField
            value={notes}
            onChangeText={setNotes}
            placeholder="Any additional notes…"
            multiline
            editable
          />
        </Field>

        {/* ── Audit ─────────────────────────────────────────────────────── */}
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
            : <Text style={KStyles.formSaveBtnText}>{isEdit ? 'Save Changes' : 'Add Entry'}</Text>}
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
        title="Delete Entry"
        message={`Delete this timetable entry (${item?.subject ?? ''} – ${item?.day ?? ''})?`}
        confirmLabel="Delete"
        destructive
        onConfirm={() => { setDeleteDialogVisible(false); confirmDelete(); }}
        onCancel={() => setDeleteDialogVisible(false)}
      />
    </KeyboardAvoidingView>
  );
}
