import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View, Text, ScrollView,
  TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { v4 as uuidv4 } from 'uuid';
import { Colors, KStyles } from '../../styles/kutties-styles';
import { SHEETS, MONTHS } from '../../utils/constants';
import { studentDiaryRepository, studentRepository, courseRepository, teacherRepository } from '../../db/repositories';
import { syncSheet } from '../../sync/sync.service';
import type { StudentDiaryModel } from '../../db/models/studentdiary.model';
import Snackbar, { useSnackbar } from '../shared/Snackbar';
import AuditRow from '../shared/AuditRow';
import ConfirmDialog from '../shared/ConfirmDialog';
import FormDatePicker from '../shared/FormDatePicker';
import { Field, InputField } from '../shared/FormField';
import SingleSelectDropdown from '../shared/SingleSelectDropdown';

interface Props {
  navigation: any;
  route: { params: { mode: 'add' | 'edit'; item?: StudentDiaryModel; prefilledRegNumber?: string } };
}

const DIARY_CATEGORIES = ['Homework', 'Behaviour', 'Achievement', 'Note', 'Warning', 'Other'];

export default function StudentDiaryForm({ navigation, route }: Props) {
  const { mode, item, prefilledRegNumber } = route.params;
  const isEdit = mode === 'edit';

  // ── Today default ───────────────────────────────────────────────────────────
  const todayStr = useMemo(() => {
    const d = new Date();
    return `${String(d.getDate()).padStart(2, '0')}/${MONTHS[d.getMonth()]}/${d.getFullYear()}`;
  }, []);

  // ── Form state ──────────────────────────────────────────────────────────────
  const [regNumber,    setRegNumber]    = useState(item?.regNumber    ?? prefilledRegNumber ?? '');
  const [diaryDate,    setDiaryDate]    = useState(item?.diaryDate    ?? todayStr);
  const [response,     setResponse]     = useState(item?.response     ?? '');
  const [teacherNote,  setTeacherNote]  = useState(item?.teacherNote  ?? '');
  const [category,     setCategory]     = useState(item?.category     ?? '');
  const [rating,       setRating]       = useState<number>(item?.rating ?? 0);
  const [remarks,      setRemarks]      = useState(item?.remarks      ?? '');
  const [createdBy,    setCreatedBy]    = useState(item?.createdBy    ?? '');

  const [saving,  setSaving]  = useState(false);
  const [errors,  setErrors]  = useState<Record<string, string>>({});
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const snackbar = useSnackbar();

  // ── Teacher options ──────────────────────────────────────────────────────────
  const [teacherOptions,  setTeacherOptions]  = useState<string[]>([]);
  const [loadingTeachers, setLoadingTeachers] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let rows = await teacherRepository.findAll();
      if (rows.length === 0) {
        await syncSheet(SHEETS.STAFF);
        rows = await teacherRepository.findAll();
      }
      if (!cancelled) {
        setTeacherOptions(rows.map((t) => t.name ?? '').filter(Boolean).sort());
        setLoadingTeachers(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ── Student options ──────────────────────────────────────────────────────────
  const [studentOptions,  setStudentOptions]  = useState<string[]>([]);
  const [regToName,       setRegToName]       = useState<Record<string, string>>({});
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
      const courses = await courseRepository.findAll();
      if (!cancelled) {
        const map: Record<string, string> = {};
        rows.forEach((s) => { if (s.regNumber) map[s.regNumber] = s.fullName ?? s.regNumber; });
        setRegToName(map);
        setStudentOptions(rows.filter((s) => s.regNumber).map((s) => s.regNumber!).sort());

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
    if (!regNumber.trim())   errs.regNumber   = 'Student is required';
    if (!diaryDate.trim())   errs.diaryDate   = 'Date is required';
    if (!category.trim())    errs.category    = 'Category is required';
    if (!teacherNote.trim()) errs.teacherNote = 'Teacher Note is required';
    if (!createdBy.trim())   errs.createdBy   = 'Created by is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [regNumber, diaryDate, category, teacherNote, createdBy]);

  // ── Save ────────────────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const entry: StudentDiaryModel = {
        id:          isEdit ? item!.id : uuidv4(),
        regNumber:   regNumber.trim()   || undefined,
        diaryDate:   diaryDate.trim()   || undefined,
        response:    response.trim()    || undefined,
        teacherNote: teacherNote.trim() || undefined,
        category:    category           || undefined,
        rating:      rating > 0         ? rating : undefined,
        remarks:     remarks.trim()     || undefined,
        createdBy:   createdBy.trim()   || undefined,
      };
      await studentDiaryRepository.save(entry);
      syncSheet(SHEETS.STUDENT_DIARY).catch(() => {});
      snackbar.show(isEdit ? 'Changes saved' : 'Diary entry added', 'success');
      navigation.goBack();
    } catch (e) {
      snackbar.show(`Save failed: ${(e as Error).message}`, 'error');
    } finally {
      setSaving(false);
    }
  }, [validate, isEdit, item, regNumber, diaryDate, response, teacherNote, category, rating, remarks, createdBy, navigation, snackbar]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Delete ──────────────────────────────────────────────────────────────────
  const confirmDelete = useCallback(() => {
    setSaving(true);
    studentDiaryRepository.delete(item!.id)
      .then(() => {
        syncSheet(SHEETS.STUDENT_DIARY).catch(() => {});
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
          {mode === 'add' ? 'Add Diary Entry' : 'Edit Diary Entry'}
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

        {/* ── Student ──────────────────────────────────────────────────────── */}
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

        {/* ── Entry Details ─────────────────────────────────────────────────── */}
        <Text style={KStyles.formSection}>Entry Details</Text>

        <Field label="Date" required>
          <FormDatePicker value={diaryDate} onChange={setDiaryDate} format="dmy" />
          {errors.diaryDate ? <Text style={KStyles.formError}>{errors.diaryDate}</Text> : null}
        </Field>

        <Field label="Category" required>
          <SingleSelectDropdown
            selected={category}
            options={DIARY_CATEGORIES}
            onChange={setCategory}
            placeholder="Select category…"
            title="Category"
          />
          {errors.category ? <Text style={KStyles.formError}>{errors.category}</Text> : null}
        </Field>


        

        {/* ── Teacher Note ──────────────────────────────────────────────────── */}
        <Text style={KStyles.formSection}>Teacher Note</Text>

        <Field label="Teacher Note" required>
          <InputField
            value={teacherNote}
            onChangeText={setTeacherNote}
            placeholder="Teacher's note or response…"
            multiline
            editable
          />
          {errors.teacherNote ? <Text style={KStyles.formError}>{errors.teacherNote}</Text> : null}
        </Field>

        <Field label="Response">
          <InputField
            value={response}
            onChangeText={setResponse}
            placeholder="Write the diary entry here…"
            multiline
            editable
          />
        </Field>

        <Field label="Rating">
          <View style={{ flexDirection: 'row', gap: 8, paddingVertical: 4 }}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity
                key={star}
                onPress={() => setRating(rating === star ? 0 : star)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons
                  name={star <= rating ? 'star' : 'star-outline'}
                  size={32}
                  color={star <= rating ? '#FBC02D' : '#BDBDBD'}
                />
              </TouchableOpacity>
            ))}
          </View>
        </Field>
        
        {/* ── Created By ───────────────────────────────────────────────────── */}
        <Text style={KStyles.formSection}>Created By</Text>

        <Field label="Teacher" required>
          <SingleSelectDropdown
            selected={createdBy}
            options={teacherOptions}
            onChange={setCreatedBy}
            placeholder="Select teacher…"
            title="Select Teacher"
            loading={loadingTeachers}
          />
          {errors.createdBy ? <Text style={KStyles.formError}>{errors.createdBy}</Text> : null}
        </Field>

        {/* ── Remarks ──────────────────────────────────────────────────────── */}
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

        {/* ── Audit ────────────────────────────────────────────────────────── */}
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
            : <Text style={KStyles.formSaveBtnText}>{isEdit ? 'Save Changes' : 'Save Entry'}</Text>}
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
        title="Delete Diary Entry"
        message="Are you sure you want to delete this diary entry? This cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={() => { setDeleteDialogVisible(false); confirmDelete(); }}
        onCancel={() => setDeleteDialogVisible(false)}
      />
    </KeyboardAvoidingView>
  );
}
