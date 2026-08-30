import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, ScrollView,
  TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { v4 as uuidv4 } from 'uuid';
import { Colors, KStyles } from '../../styles/kutties-styles';
import { SHEETS } from '../../utils/constants';
import { feedbackRepository, getRefOptions, ensureReftbl, studentRepository, teacherRepository } from '../../db/repositories';
import { syncSheet } from '../../sync/sync.service';
import type { FeedbackModel } from '../../db/models/feedback.model';
import Snackbar, { useSnackbar } from '../shared/Snackbar';
import AuditRow from '../shared/AuditRow';
import ConfirmDialog from '../shared/ConfirmDialog';
import FormDatePicker from '../shared/FormDatePicker';
import { Field, InputField } from '../shared/FormField';
import SingleSelectDropdown from '../shared/SingleSelectDropdown';

const PRIMARY = Colors.primary;

const RATING_OPTIONS      = ['1', '2', '3', '4', '5'];
const CATEGORY_OPTIONS    = ['Communication', 'Punctuality', 'Subject Knowledge', 'Behaviour', 'Overall'];
const STATUS_OPTIONS      = ['open', 'reviewed', 'closed'];

interface Props {
  navigation: any;
  route: { params: { mode: 'add' | 'edit'; item?: FeedbackModel } };
}

export default function FeedbackForm({ navigation, route }: Props) {
  const { mode, item } = route.params;
  const isEdit = mode === 'edit';

  // ── Form state ─────────────────────────────────────────────────────────────
  const [studentName,  setStudentName]  = useState(item?.studentName  ?? '');
  const [teacherName,  setTeacherName]  = useState(item?.teacherName  ?? '');
  const [subject,      setSubject]      = useState(item?.subject      ?? '');
  const [feedbackDate, setFeedbackDate] = useState(item?.feedbackDate ?? '');
  const [rating,       setRating]       = useState(item?.rating       ?? '');
  const [category,     setCategory]     = useState(item?.category     ?? '');
  const [feedback,     setFeedback]     = useState(item?.feedback     ?? '');
  const [actionTaken,  setActionTaken]  = useState(item?.actionTaken  ?? '');
  const [status,       setStatus]       = useState<string>(item?.status ?? 'open');
  const [remarks,      setRemarks]      = useState(item?.remarks      ?? '');
  const [createdBy,    setCreatedBy]    = useState<string>(item?.createdBy ?? '');

  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const snackbar = useSnackbar();

  // ── Students — load once, build groups map for the dropdown ───────────────
  const [studentOptions,  setStudentOptions]  = useState<string[]>([]);
  const [studentGroups,   setStudentGroups]   = useState<Record<string, string[]>>({});
  const [loadingStudents, setLoadingStudents] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let rows = await studentRepository.findAll();
      if (rows.length === 0) {
        await syncSheet(SHEETS.STUDENTS);
        rows = await studentRepository.findAll();
      }
      if (!cancelled) {
        const mapped = rows
          .filter(s => s.fullName)
          .map(s => ({ fullName: s.fullName!, course: s.course ?? '' }));

        // All names sorted (used by the dropdown when no chip is active)
        setStudentOptions(mapped.map(s => s.fullName).sort());

        // groups map: { courseName → [studentName, …] }
        const groups: Record<string, string[]> = {};
        for (const s of mapped) {
          if (!s.course) continue;
          if (!groups[s.course]) groups[s.course] = [];
          groups[s.course].push(s.fullName);
        }
        for (const key of Object.keys(groups)) groups[key].sort();
        setStudentGroups(groups);

        setLoadingStudents(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ── Teacher options ────────────────────────────────────────────────────────
  const [teacherOptions,  setTeacherOptions]  = useState<string[]>([]);
  const [loadingTeachers, setLoadingTeachers] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Use local cache first; sync only if empty
      let rows = await teacherRepository.findAll();
      if (rows.length === 0) {
        await syncSheet(SHEETS.TEACHERS);
        rows = await teacherRepository.findAll();
      }
      if (!cancelled) {
        setTeacherOptions(rows.map(t => t.name ?? '').filter(Boolean).sort());
        setLoadingTeachers(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ── Subject options from reftbl ────────────────────────────────────────────
  const [subjectOptions, setSubjectOptions] = useState<string[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await ensureReftbl();
      const opts = await getRefOptions('subject');
      if (!cancelled) {
        setSubjectOptions(opts);
        setLoadingSubjects(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ── Validation ─────────────────────────────────────────────────────────────
  const validate = useCallback((): boolean => {
    const errs: Record<string, string> = {};
    if (!studentName.trim()) errs.studentName = 'Student name is required';
    if (!teacherName.trim()) errs.teacherName = 'Teacher name is required';
    if (!feedback.trim())    errs.feedback    = 'Feedback text is required';
    if (!createdBy)          errs.createdBy   = 'Creator role is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [studentName, teacherName, feedback, createdBy]);

  // ── Save ───────────────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const entry: FeedbackModel = {
        id:           isEdit ? item!.id : uuidv4(),
        studentName:  studentName.trim()  || undefined,
        teacherName:  teacherName.trim()  || undefined,
        subject:      subject.trim()      || undefined,
        feedbackDate: feedbackDate.trim() || undefined,
        rating:       rating              || undefined,
        category:     category            || undefined,
        feedback:     feedback.trim()     || undefined,
        actionTaken:  actionTaken.trim()  || undefined,
        status:       (status as FeedbackModel['status']) || 'open',
        remarks:      remarks.trim()      || undefined,
        createdBy:    createdBy.trim() || undefined,
      };
      await feedbackRepository.save(entry);
      syncSheet(SHEETS.FEEDBACK).catch(() => {/* silent */});
      snackbar.show(isEdit ? 'Changes saved' : 'Feedback submitted', 'success');
      navigation.goBack();
    } catch (e) {
      snackbar.show(`Save failed: ${(e as Error).message}`, 'error');
    } finally {
      setSaving(false);
    }
  }, [validate, isEdit, item, studentName, teacherName, subject, feedbackDate, rating, category, feedback, actionTaken, status, remarks, createdBy, navigation, snackbar]);

  // ── Delete ─────────────────────────────────────────────────────────────────
  const confirmDelete = useCallback(() => {
    setSaving(true);
    feedbackRepository.delete(item!.id)
      .then(() => {
        syncSheet(SHEETS.FEEDBACK).catch(() => {});
        navigation.goBack();
      })
      .catch((e: Error) => {
        setSaving(false);
        snackbar.show(`Delete failed: ${e.message}`, 'error');
      });
  }, [item, navigation, snackbar]);

  const handleDelete = useCallback(() => {
    if (!item) {
      snackbar.show('No entry selected', 'error');
      return;
    }
    setDeleteDialogVisible(true);
  }, [item, snackbar]);

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
          {mode === 'add' ? 'New Feedback' : 'Edit Feedback'}
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
              onPress={handleDelete}
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

        {/* ── Participants ────────────────────────────────────────────────── */}
        <Text style={KStyles.formSection}>Participants</Text>

        <Field label="Student Name" required>
          <SingleSelectDropdown
            selected={studentName}
            options={studentOptions}
            onChange={setStudentName}
            placeholder="Select a student…"
            title="Select Student"
            loading={loadingStudents}
            groups={studentGroups}
          />
          {errors.studentName ? <Text style={KStyles.formError}>{errors.studentName}</Text> : null}
        </Field>

        <Field label="Teacher Name" required>
          <SingleSelectDropdown
            selected={teacherName}
            options={teacherOptions}
            onChange={setTeacherName}
            placeholder="Select a teacher…"
            title="Select Teacher"
            loading={loadingTeachers}
          />
          {errors.teacherName ? <Text style={KStyles.formError}>{errors.teacherName}</Text> : null}
        </Field>

        <Field label="Created By" required>
          <SingleSelectDropdown
            selected={createdBy}
            options={['Teacher', 'Employee']}
            onChange={setCreatedBy}
            placeholder="Select creator role…"
            title="Select Creator"
          />
          {errors.createdBy ? <Text style={KStyles.formError}>{errors.createdBy}</Text> : null}
        </Field>

        {/* ── Feedback ────────────────────────────────────────────────────── */}
        <Text style={KStyles.formSection}>Feedback</Text>

        <Field label="Subject">
          <SingleSelectDropdown
            selected={subject}
            options={subjectOptions}
            onChange={setSubject}
            placeholder="Select a subject…"
            title="Select Subject"
            loading={loadingSubjects}
          />
        </Field>

        <Field label="Feedback Date">
          <FormDatePicker value={feedbackDate} onChange={setFeedbackDate} format="iso" />
        </Field>

        <Field label="Category">
          <SingleSelectDropdown
            selected={category}
            options={CATEGORY_OPTIONS}
            onChange={setCategory}
            placeholder="Select a category…"
            title="Select Category"
          />
        </Field>

        <Field label="Rating">
          <SingleSelectDropdown
            selected={rating}
            options={RATING_OPTIONS}
            onChange={setRating}
            placeholder="Select rating (1 = lowest, 5 = highest)…"
            title="Select Rating"
          />
        </Field>

        <Field label="Feedback" required>
          <InputField
            value={feedback}
            onChangeText={setFeedback}
            placeholder="Describe the feedback…"
            multiline
            editable
          />
          {errors.feedback ? <Text style={KStyles.formError}>{errors.feedback}</Text> : null}
        </Field>

        {/* ── Follow-up ───────────────────────────────────────────────────── */}
        <Text style={KStyles.formSection}>Follow-up</Text>

        <Field label="Action Taken">
          <InputField
            value={actionTaken}
            onChangeText={setActionTaken}
            placeholder="Any action taken by the school…"
            multiline
            editable
          />
        </Field>

        <Field label="Status">
          <SingleSelectDropdown
            selected={status}
            options={STATUS_OPTIONS}
            onChange={setStatus}
            placeholder="Select status…"
            title="Select Status"
          />
        </Field>

        <Field label="Remarks">
          <InputField
            value={remarks}
            onChangeText={setRemarks}
            placeholder="Any additional notes…"
            multiline
            editable
          />
        </Field>

        {/* ── Audit ───────────────────────────────────────────────────────── */}
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
            : <Text style={KStyles.formSaveBtnText}>{isEdit ? 'Save Changes' : 'Submit Feedback'}</Text>}
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
        title="Delete Feedback"
        message="Are you sure you want to delete this feedback entry? This cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={() => { setDeleteDialogVisible(false); confirmDelete(); }}
        onCancel={() => setDeleteDialogVisible(false)}
      />
    </KeyboardAvoidingView>
  );
}
