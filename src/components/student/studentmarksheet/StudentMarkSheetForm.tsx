import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View, Text, ScrollView,
  TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { v4 as uuidv4 } from 'uuid';
import { Colors, KStyles } from '../../../styles/kutties-styles';
import { SHEETS, MONTHS } from '../../../utils/constants';
import {
  studentMarkSheetRepository,
  studentRepository,
  courseRepository,
  teacherRepository,
  getRefOptions,
  ensureReftbl,
} from '../../../db/repositories';
import { syncSheet } from '../../../sync/sync.service';
import type { StudentMarkSheetModel } from '../../../db/models/studentmarksheet.model';
import { computeGrade } from '../../../db/models/studentmarksheet.model';
import Snackbar, { useSnackbar } from '../../shared/Snackbar';
import AuditRow from '../../shared/AuditRow';
import ConfirmDialog from '../../shared/ConfirmDialog';
import FormDatePicker from '../../shared/FormDatePicker';
import { Field, InputField } from '../../shared/FormField';
import SingleSelectDropdown from '../../shared/SingleSelectDropdown';
import RefDropdown from '../../shared/RefDropdown';

interface Props {
  navigation: any;
  route: {
    params: {
      mode: 'add' | 'edit';
      item?: StudentMarkSheetModel;
      prefilledRegNumber?: string;
    };
  };
}

export default function StudentMarkSheetForm({ navigation, route }: Props) {
  const { mode, item, prefilledRegNumber } = route.params;
  const isEdit = mode === 'edit';

  // ── Today default ──────────────────────────────────────────────────────────
  const todayStr = useMemo(() => {
    const d = new Date();
    return `${String(d.getDate()).padStart(2, '0')}/${MONTHS[d.getMonth()]}/${d.getFullYear()}`;
  }, []);

  // ── Form state ─────────────────────────────────────────────────────────────
  const [regNumber,      setRegNumber]      = useState(item?.regNumber      ?? prefilledRegNumber ?? '');
  const [examName,       setExamName]       = useState(item?.examName       ?? '');
  const [examDate,       setExamDate]       = useState(item?.examDate       ?? todayStr);
  const [subject,        setSubject]        = useState(item?.subject        ?? '');
  const [subjTeacher,    setSubjTeacher]    = useState(item?.subjTeacher    ?? '');
  const [maxMarksRaw,    setMaxMarksRaw]    = useState(item?.maxMarks       != null ? String(item.maxMarks)       : '');
  const [marksRaw,       setMarksRaw]       = useState(item?.marksObtained  != null ? String(item.marksObtained)  : '');
  const [grade,          setGrade]          = useState(item?.grade          ?? '');
  const [remarks,        setRemarks]        = useState(item?.remarks        ?? '');
  const [recordedBy,     setRecordedBy]     = useState(item?.recordedBy     ?? '');

  const [saving,  setSaving]  = useState(false);
  const [errors,  setErrors]  = useState<Record<string, string>>({});
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const snackbar = useSnackbar();

  // ── Auto-fill grade when marks change ─────────────────────────────────────
  useEffect(() => {
    const max = parseFloat(maxMarksRaw);
    const obt = parseFloat(marksRaw);
    if (!isNaN(max) && !isNaN(obt)) {
      const auto = computeGrade(obt, max);
      if (auto) setGrade(auto);
    }
  }, [marksRaw, maxMarksRaw]);

  // ── Reference data ─────────────────────────────────────────────────────────
  const [examOptions,    setExamOptions]    = useState<string[]>([]);
  const [subjectOptions, setSubjectOptions] = useState<string[]>([]);
  const [gradeOptions,   setGradeOptions]   = useState<string[]>([]);
  const [loadingRefs,    setLoadingRefs]    = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await ensureReftbl();
      const [exams, subjects, grades] = await Promise.all([
        getRefOptions('examref'),
        getRefOptions('subject_ref'),
        getRefOptions('graderef'),
      ]);
      if (!cancelled) {
        setExamOptions(exams);
        setSubjectOptions(subjects);
        setGradeOptions(grades);
        setLoadingRefs(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ── Staff options (value = email, label = name) ────────────────────────────
  // subjTeacher and recordedBy store the teacher's email (unique key).
  const [staffOptions,    setStaffOptions]    = useState<string[]>([]);
  const [staffEmailToName, setStaffEmailToName] = useState<Record<string, string>>({});
  const [loadingStaff,    setLoadingStaff]    = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let rows = await teacherRepository.findAll();
      if (rows.length === 0) {
        await syncSheet(SHEETS.STAFF);
        rows = await teacherRepository.findAll();
      }
      if (!cancelled) {
        const emailToName: Record<string, string> = {};
        const emails: string[] = [];
        rows
          .filter((t) => t.email)
          .sort((a, b) => (a.name ?? a.email ?? '').localeCompare(b.name ?? b.email ?? ''))
          .forEach((t) => {
            emailToName[t.email!] = t.name ?? t.email!;
            emails.push(t.email!);
          });
        setStaffEmailToName(emailToName);
        setStaffOptions(emails);
        setLoadingStaff(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ── Student options ────────────────────────────────────────────────────────
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
        setStudentOptions(rows.filter((s) => s.regNumber && s.status === 'active').map((s) => s.regNumber!).sort());

        const groupMap: Record<string, string[]> = {};
        courses.forEach((c) => { if (c.courseName) groupMap[c.courseName] = []; });
        rows.forEach((s) => {
          if (!s.regNumber || s.status !== 'active') return;
          const course = s.course?.trim() ?? '';
          if (!course) return;
          if (!groupMap[course]) groupMap[course] = [];
          groupMap[course].push(s.regNumber);
        });
        const filtered: Record<string, string[]> = {};
        for (const [course, regs] of Object.entries(groupMap)) {
          if (regs.length === 0) continue;
          filtered[course] = regs.sort((a, b) => (map[a] ?? a).localeCompare(map[b] ?? b));
        }
        setStudentGroups(filtered);
        setLoadingStudents(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ── Validation ─────────────────────────────────────────────────────────────
  const validate = useCallback((): boolean => {
    const errs: Record<string, string> = {};
    if (!regNumber.trim())  errs.regNumber  = 'Student is required';
    if (!examName.trim())   errs.examName   = 'Exam type is required';
    if (!examDate.trim())   errs.examDate   = 'Exam date is required';
    if (!subject.trim())    errs.subject    = 'Subject is required';

    const max = parseFloat(maxMarksRaw);
    const obt = parseFloat(marksRaw);

    if (maxMarksRaw.trim() === '' || isNaN(max) || max <= 0) {
      errs.maxMarks = 'Max marks must be a positive number';
    }
    if (marksRaw.trim() === '' || isNaN(obt) || obt < 0) {
      errs.marksObtained = 'Marks obtained must be 0 or more';
    }
    if (!isNaN(max) && !isNaN(obt) && obt > max) {
      errs.marksObtained = `Marks obtained (${obt}) cannot exceed max marks (${max})`;
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [regNumber, examName, examDate, subject, maxMarksRaw, marksRaw]);

  // ── Save ───────────────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const entry: StudentMarkSheetModel = {
        id:            isEdit ? item!.id : uuidv4(),
        regNumber:     regNumber.trim()   || undefined,
        examName:      examName.trim()    || undefined,
        examDate:      examDate.trim()    || undefined,
        subject:       subject.trim()     || undefined,
        subjTeacher:   subjTeacher.trim() || undefined,
        maxMarks:      parseFloat(maxMarksRaw) || undefined,
        marksObtained: parseFloat(marksRaw)    ?? undefined,
        grade:         grade.trim()       || undefined,
        remarks:       remarks.trim()     || undefined,
        recordedBy:    recordedBy.trim()  || undefined,
        revision:      isEdit ? ((item?.revision ?? 0) + 1) : 1,
      };
      await studentMarkSheetRepository.save(entry);
      syncSheet(SHEETS.STUDENT_MARK_SHEET).catch(() => {});
      snackbar.show(isEdit ? 'Changes saved' : 'Mark entry added', 'success');
      navigation.goBack();
    } catch (e) {
      snackbar.show(`Save failed: ${(e as Error).message}`, 'error');
    } finally {
      setSaving(false);
    }
  }, [validate, isEdit, item, regNumber, examName, examDate, subject, subjTeacher, maxMarksRaw, marksRaw, grade, remarks, recordedBy, navigation, snackbar]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Delete ─────────────────────────────────────────────────────────────────
  const confirmDelete = useCallback(() => {
    setSaving(true);
    studentMarkSheetRepository.delete(item!.id)
      .then(() => {
        syncSheet(SHEETS.STUDENT_MARK_SHEET).catch(() => {});
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
        <Text style={KStyles.headerTitle}>
          {mode === 'add' ? 'Add Mark Entry' : 'Edit Mark Entry'}
        </Text>
        <View style={KStyles.headerActions}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={KStyles.headerIcon} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
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

        {/* ── Exam ─────────────────────────────────────────────────────────── */}
        <Text style={KStyles.formSection}>Exam</Text>

        <Field label="Exam Type" required>
          <RefDropdown
            value={examName}
            options={examOptions}
            onChange={setExamName}
            loading={loadingRefs}
            placeholder="Select exam type…"
            title="Select Exam Type"
          />
          {errors.examName ? <Text style={KStyles.formError}>{errors.examName}</Text> : null}
        </Field>

        <Field label="Exam Date" required>
          <FormDatePicker value={examDate} onChange={setExamDate} format="dmy" />
          {errors.examDate ? <Text style={KStyles.formError}>{errors.examDate}</Text> : null}
        </Field>

        {/* ── Subject ──────────────────────────────────────────────────────── */}
        <Text style={KStyles.formSection}>Subject</Text>

        <Field label="Subject" required>
          <RefDropdown
            value={subject}
            options={subjectOptions}
            onChange={setSubject}
            loading={loadingRefs}
            placeholder="Select subject…"
            title="Select Subject"
          />
          {errors.subject ? <Text style={KStyles.formError}>{errors.subject}</Text> : null}
        </Field>

        <Field label="Subject Teacher">
          <SingleSelectDropdown
            selected={subjTeacher}
            options={staffOptions}
            onChange={setSubjTeacher}
            placeholder="Select teacher…"
            title="Select Subject Teacher"
            loading={loadingStaff}
            renderLabel={(email) => staffEmailToName[email] ?? email}
          />
        </Field>

        {/* ── Marks ────────────────────────────────────────────────────────── */}
        <Text style={KStyles.formSection}>Marks</Text>

        <Field label="Max Marks" required>
          <InputField
            value={maxMarksRaw}
            onChangeText={setMaxMarksRaw}
            placeholder="e.g. 100"
            keyboardType="numeric"
            editable
          />
          {errors.maxMarks ? <Text style={KStyles.formError}>{errors.maxMarks}</Text> : null}
        </Field>

        <Field label="Marks Obtained" required>
          <InputField
            value={marksRaw}
            onChangeText={setMarksRaw}
            placeholder="e.g. 87"
            keyboardType="numeric"
            editable
          />
          {errors.marksObtained ? <Text style={KStyles.formError}>{errors.marksObtained}</Text> : null}
        </Field>

        <Field label="Grade">
          <RefDropdown
            value={grade}
            options={gradeOptions}
            onChange={setGrade}
            loading={loadingRefs}
            placeholder="Auto-computed or select…"
            title="Select Grade"
          />
        </Field>

        {/* ── Recorded By ──────────────────────────────────────────────────── */}
        <Text style={KStyles.formSection}>Recorded By</Text>

        <Field label="Teacher">
          <SingleSelectDropdown
            selected={recordedBy}
            options={staffOptions}
            onChange={setRecordedBy}
            placeholder="Select teacher…"
            title="Select Recorded By"
            loading={loadingStaff}
            renderLabel={(email) => staffEmailToName[email] ?? email}
          />
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
        title="Delete Mark Entry"
        message="Are you sure you want to delete this mark entry? This cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={() => { setDeleteDialogVisible(false); confirmDelete(); }}
        onCancel={() => setDeleteDialogVisible(false)}
      />
    </KeyboardAvoidingView>
  );
}
