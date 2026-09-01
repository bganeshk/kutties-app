import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { v4 as uuidv4 } from 'uuid';
import { Colors, KStyles } from '../../styles/kutties-styles';
import { SHEETS, MONTHS } from '../../utils/constants';
import { parentNoteRepository, studentRepository, courseRepository, teacherRepository } from '../../db/repositories';
import { syncSheet } from '../../sync/sync.service';
import type { ParentNoteModel } from '../../db/models/parentnote.model';
import Snackbar, { useSnackbar } from '../shared/Snackbar';
import AuditRow from '../shared/AuditRow';
import ConfirmDialog from '../shared/ConfirmDialog';
import FormDatePicker from '../shared/FormDatePicker';
import { Field, InputField } from '../shared/FormField';
import SingleSelectDropdown from '../shared/SingleSelectDropdown';

interface Props {
  navigation: any;
  route: {
    params: {
      mode: 'add' | 'edit' | 'acknowledge';  // 'acknowledge' = teacher reply flow
      item?: ParentNoteModel;
      prefilledRegNumber?: string;
    };
  };
}

const NOTE_CATEGORIES = ['Absence', 'Health', 'Behaviour', 'Academic', 'General'];

export default function ParentNoteForm({ navigation, route }: Props) {
  const { mode, item, prefilledRegNumber } = route.params;
  const isEdit        = mode === 'edit';
  const isAcknowledge = mode === 'acknowledge'; // teacher-only: reply/acknowledge

  const todayStr = useMemo(() => {
    const d = new Date();
    return `${String(d.getDate()).padStart(2, '0')}/${MONTHS[d.getMonth()]}/${d.getFullYear()}`;
  }, []);

  // ── Parent fields (editable only in add/edit by parent) ────────────────────
  const [regNumber,  setRegNumber]  = useState(item?.regNumber  ?? prefilledRegNumber ?? '');
  const [noteDate,   setNoteDate]   = useState(item?.noteDate   ?? todayStr);
  const [noteText,   setNoteText]   = useState(item?.noteText   ?? '');
  const [category,   setCategory]   = useState(item?.category   ?? '');
  const [parentName, setParentName] = useState(item?.parentName ?? '');

  // ── Teacher fields (editable only in acknowledge mode) ─────────────────────
  const [teacherReply,   setTeacherReply]   = useState(item?.teacherReply   ?? '');
  const [acknowledgedBy, setAcknowledgedBy] = useState(item?.acknowledgedBy ?? '');

  const [saving,  setSaving]  = useState(false);
  const [errors,  setErrors]  = useState<Record<string, string>>({});
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const snackbar = useSnackbar();

  // ── Teacher options ────────────────────────────────────────────────────────
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
        setStudentOptions(rows.filter((s) => s.regNumber).map((s) => s.regNumber!).sort());
        const groupMap: Record<string, string[]> = {};
        courses.forEach((c) => { const n = c.courseName ?? ''; if (n) groupMap[n] = []; });
        rows.forEach((s) => {
          if (!s.regNumber) return;
          const course = s.course?.trim() ?? '';
          if (!course) return;
          if (!groupMap[course]) groupMap[course] = [];
          groupMap[course].push(s.regNumber);
        });
        const filtered: Record<string, string[]> = {};
        for (const [course, regs] of Object.entries(groupMap)) {
          if (regs.length) filtered[course] = regs.sort((a, b) => (map[a] ?? a).localeCompare(map[b] ?? b));
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
    if (isAcknowledge) {
      if (!acknowledgedBy.trim()) errs.acknowledgedBy = 'Teacher name is required';
    } else {
      if (!regNumber.trim())  errs.regNumber  = 'Student is required';
      if (!noteDate.trim())   errs.noteDate   = 'Date is required';
      if (!noteText.trim())   errs.noteText   = 'Note text is required';
      if (!category.trim())   errs.category   = 'Category is required';
      if (!parentName.trim()) errs.parentName = 'Parent name is required';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [isAcknowledge, acknowledgedBy, regNumber, noteDate, noteText, category, parentName]);

  // ── Save ───────────────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      let entry: ParentNoteModel;

      if (isAcknowledge && item) {
        // Teacher flow: keep all parent fields, only update reply fields + status
        const hasReply = teacherReply.trim().length > 0;
        entry = {
          ...item,
          acknowledgedBy: acknowledgedBy.trim() || undefined,
          acknowledgedAt: todayStr,
          teacherReply:   teacherReply.trim() || undefined,
          status:         hasReply ? 'replied' : 'acknowledged',
        };
      } else {
        entry = {
          id:          isEdit ? item!.id : uuidv4(),
          regNumber:   regNumber.trim()  || undefined,
          noteDate:    noteDate.trim()   || undefined,
          noteText:    noteText.trim()   || undefined,
          category:    category          || undefined,
          parentName:  parentName.trim() || undefined,
          status:      item?.status ?? 'pending',
          // preserve existing teacher fields if re-editing
          acknowledgedBy: item?.acknowledgedBy,
          acknowledgedAt: item?.acknowledgedAt,
          teacherReply:   item?.teacherReply,
        };
      }

      await parentNoteRepository.save(entry);
      syncSheet(SHEETS.PARENT_NOTE).catch(() => {});
      snackbar.show(
        isAcknowledge ? 'Note acknowledged' : isEdit ? 'Changes saved' : 'Note added',
        'success',
      );
      navigation.goBack();
    } catch (e) {
      snackbar.show(`Save failed: ${(e as Error).message}`, 'error');
    } finally {
      setSaving(false);
    }
  }, [validate, isAcknowledge, isEdit, item, regNumber, noteDate, noteText,
      category, parentName, teacherReply, acknowledgedBy, todayStr, navigation, snackbar]);

  // ── Delete ─────────────────────────────────────────────────────────────────
  const confirmDelete = useCallback(() => {
    setSaving(true);
    parentNoteRepository.delete(item!.id)
      .then(() => {
        syncSheet(SHEETS.PARENT_NOTE).catch(() => {});
        navigation.goBack();
      })
      .catch((e: Error) => {
        setSaving(false);
        snackbar.show(`Delete failed: ${e.message}`, 'error');
      });
  }, [item, navigation, snackbar]);

  const screenTitle = isAcknowledge
    ? 'Acknowledge Note'
    : mode === 'add' ? 'Add Parent Note' : 'Edit Parent Note';

  return (
    <KeyboardAvoidingView style={KStyles.formRoot} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

      {/* Header */}
      <View style={KStyles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={KStyles.headerTitle}>{screenTitle}</Text>
        <View style={KStyles.headerActions}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={KStyles.headerIcon} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="close-outline" size={24} color="#fff" />
          </TouchableOpacity>
          {isEdit && !isAcknowledge && (
            <TouchableOpacity onPress={() => setDeleteDialogVisible(true)} style={KStyles.headerIcon} disabled={saving} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="trash-outline" size={22} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView contentContainerStyle={KStyles.formScroll} keyboardShouldPersistTaps="handled">

        {/* ── In acknowledge mode: show read-only note summary ───────────── */}
        {isAcknowledge && item ? (
          <>
            <Text style={KStyles.formSection}>Parent Note (Read Only)</Text>
            <View style={[KStyles.formAuditCard, { marginBottom: 12 }]}>
              <View style={KStyles.formAuditRow}>
                <Text style={KStyles.formAuditLabel}>Student</Text>
                <Text style={KStyles.formAuditValue}>{item.regNumber ?? '—'}</Text>
              </View>
              <View style={KStyles.formAuditRow}>
                <Text style={KStyles.formAuditLabel}>Date</Text>
                <Text style={KStyles.formAuditValue}>{item.noteDate ?? '—'}</Text>
              </View>
              <View style={KStyles.formAuditRow}>
                <Text style={KStyles.formAuditLabel}>Category</Text>
                <Text style={KStyles.formAuditValue}>{item.category ?? '—'}</Text>
              </View>
              <View style={KStyles.formAuditRow}>
                <Text style={KStyles.formAuditLabel}>Parent</Text>
                <Text style={KStyles.formAuditValue}>{item.parentName ?? '—'}</Text>
              </View>
            </View>
            <View style={KStyles.formAuditCard}>
              <Text style={[KStyles.formAuditLabel, { marginBottom: 6 }]}>Note</Text>
              <Text style={{ fontSize: 14, color: '#333', lineHeight: 20 }}>{item.noteText ?? '—'}</Text>
            </View>
          </>
        ) : null}

        {/* ── Parent fields — hidden when teacher is acknowledging ────────── */}
        {!isAcknowledge ? (
          <>
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

            <Text style={KStyles.formSection}>Note Details</Text>

            <Field label="Date" required>
              <FormDatePicker value={noteDate} onChange={setNoteDate} format="dmy" />
              {errors.noteDate ? <Text style={KStyles.formError}>{errors.noteDate}</Text> : null}
            </Field>

            <Field label="Category" required>
              <SingleSelectDropdown
                selected={category}
                options={NOTE_CATEGORIES}
                onChange={setCategory}
                placeholder="Select category…"
                title="Category"
              />
              {errors.category ? <Text style={KStyles.formError}>{errors.category}</Text> : null}
            </Field>

            <Field label="Note" required>
              <InputField
                value={noteText}
                onChangeText={setNoteText}
                placeholder="Describe the note for the teacher…"
                multiline
                editable
              />
              {errors.noteText ? <Text style={KStyles.formError}>{errors.noteText}</Text> : null}
            </Field>

            <Text style={KStyles.formSection}>Parent</Text>
            <Field label="Parent Name" required>
              <InputField
                value={parentName}
                onChangeText={setParentName}
                placeholder="Name of the parent…"
              />
              {errors.parentName ? <Text style={KStyles.formError}>{errors.parentName}</Text> : null}
            </Field>
          </>
        ) : null}

        {/* ── Teacher reply section ────────────────────────────────────────── */}
        <Text style={KStyles.formSection}>Teacher Response</Text>

        <Field label="Acknowledged By" required={isAcknowledge}>
          <SingleSelectDropdown
            selected={acknowledgedBy}
            options={teacherOptions}
            onChange={setAcknowledgedBy}
            placeholder="Select teacher…"
            title="Select Teacher"
            loading={loadingTeachers}
          />
          {errors.acknowledgedBy ? <Text style={KStyles.formError}>{errors.acknowledgedBy}</Text> : null}
        </Field>

        <Field label="Reply (optional)">
          <InputField
            value={teacherReply}
            onChangeText={setTeacherReply}
            placeholder="Write a reply to the parent…"
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

      <View style={KStyles.formFooter}>
        <TouchableOpacity
          style={[KStyles.formSaveBtn, saving && KStyles.formSaveBtnDisabled]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={KStyles.formSaveBtnText}>
                {isAcknowledge ? 'Acknowledge' : isEdit ? 'Save Changes' : 'Submit Note'}
              </Text>}
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
        title="Delete Note"
        message="Are you sure you want to delete this parent note? This cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={() => { setDeleteDialogVisible(false); confirmDelete(); }}
        onCancel={() => setDeleteDialogVisible(false)}
      />
    </KeyboardAvoidingView>
  );
}
