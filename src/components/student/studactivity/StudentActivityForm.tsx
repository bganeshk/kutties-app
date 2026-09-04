import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { v4 as uuidv4 } from 'uuid';
import { Colors, KStyles } from '../../../styles/kutties-styles';
import { SHEETS, MONTHS } from '../../../utils/constants';
import {
  studentActivityRepository,
  studentRepository,
  courseRepository,
  teacherRepository,
  getRefOptions,
  ensureReftbl,
} from '../../../db/repositories';
import { syncSheet } from '../../../sync/sync.service';
import type {
  StudentActivityModel,
  ActivityType,
  ActivityStatus,
} from '../../../db/models/studentactivity.model';
import Snackbar, { useSnackbar } from '../../shared/Snackbar';
import AuditRow from '../../shared/AuditRow';
import ConfirmDialog from '../../shared/ConfirmDialog';
import FormDatePicker from '../../shared/FormDatePicker';
import { Field, InputField } from '../../shared/FormField';
import SingleSelectDropdown from '../../shared/SingleSelectDropdown';
import RefDropdown from '../../shared/RefDropdown';

// ── Mode type ─────────────────────────────────────────────────────────────────
type FormMode = 'add' | 'edit' | 'submit' | 'review';

interface Props {
  navigation: any;
  route: {
    params: {
      mode: FormMode;
      item?: StudentActivityModel;
      prefilledRegNumber?: string;
      prefilledCourse?: string;
    };
  };
}

const ACTIVITY_TYPES: ActivityType[]   = ['Assignment', 'Task', 'Notification'];
const STATUS_OPTIONS: ActivityStatus[]              = ['open', 'in-progress', 'in-review'];
const STATUS_OPTIONS_NOTIFICATION: ActivityStatus[] = ['open', 'closed'];

export default function StudentActivityForm({ navigation, route }: Props) {
  const { mode, item, prefilledRegNumber, prefilledCourse } = route.params;
  const isEdit   = mode === 'edit';
  const isSubmit = mode === 'submit';
  const isReview = mode === 'review';
  const isAddEdit = mode === 'add' || mode === 'edit';

  // ── Today default ─────────────────────────────────────────────────────────
  const todayStr = useMemo(() => {
    const d = new Date();
    return `${String(d.getDate()).padStart(2, '0')}/${MONTHS[d.getMonth()]}/${d.getFullYear()}`;
  }, []);

  // ── Form state ────────────────────────────────────────────────────────────
  const [activityType, setActivityType] = useState<ActivityType>(
    item?.activityType ?? 'Assignment',
  );
  const [category,     setCategory]     = useState(item?.category     ?? '');
  const [course,       setCourse]       = useState(item?.course       ?? prefilledCourse ?? '');
  const [assignor,     setAssignor]     = useState(item?.assignor     ?? '');
  const [assignee,     setAssignee]     = useState(item?.assignee     ?? prefilledRegNumber ?? '');
  const [reviewer,     setReviewer]     = useState(item?.reviewer     ?? '');
  const [title,        setTitle]        = useState(item?.title        ?? '');
  const [description,  setDescription]  = useState(item?.description  ?? '');
  const [startDate,    setStartDate]    = useState(item?.startDate    ?? todayStr);
  const [endDate,      setEndDate]      = useState(item?.endDate      ?? '');
  const [status,       setStatus]       = useState<ActivityStatus>(item?.status ?? 'open');
  const [submissionNote, setSubmissionNote] = useState(item?.submissionNote ?? '');
  const [ratingRaw,    setRatingRaw]    = useState(
    item?.rating != null && item.rating > 0 ? String(item.rating) : '',
  );

  const [saving,  setSaving]  = useState(false);
  const [errors,  setErrors]  = useState<Record<string, string>>({});
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const snackbar = useSnackbar();

  // ── Overdue flag — true when endDate is before today ──────────────────────
  const isOverdue = useMemo(() => {
    const raw = isAddEdit ? endDate : item?.endDate;
    if (!raw) return false;
    const parts = raw.split('/');
    if (parts.length !== 3) return false;
    const [dd, mmm, yyyy] = parts;
    const monthIndex = MONTHS.indexOf(mmm as typeof MONTHS[number]);
    if (monthIndex === -1) return false;
    const deadline = new Date(Number(yyyy), monthIndex, Number(dd));
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return deadline < today;
  }, [isAddEdit, endDate, item?.endDate]);

  // ── Reference data ────────────────────────────────────────────────────────
  const [categoryOptions, setCategoryOptions] = useState<string[]>([]);
  const [loadingRefs,     setLoadingRefs]     = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await ensureReftbl();
      const cats = await getRefOptions('assignmentCatRef');
      if (!cancelled) { setCategoryOptions(cats); setLoadingRefs(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  // ── Staff options ─────────────────────────────────────────────────────────
  const [staffOptions,  setStaffOptions]  = useState<string[]>([]);
  const [loadingStaff,  setLoadingStaff]  = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let rows = await teacherRepository.findAll();
      if (rows.length === 0) { await syncSheet(SHEETS.STAFF); rows = await teacherRepository.findAll(); }
      if (!cancelled) {
        setStaffOptions(rows.map((t) => t.email ?? t.name ?? '').filter(Boolean).sort());
        setLoadingStaff(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ── Student options (grouped by course) ───────────────────────────────────
  const [studentOptions,  setStudentOptions]  = useState<string[]>([]);
  const [regToName,       setRegToName]       = useState<Record<string, string>>({});
  const [studentGroups,   setStudentGroups]   = useState<Record<string, string[]>>({});
  const [loadingStudents, setLoadingStudents] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let rows = await studentRepository.findAll();
      if (rows.length === 0) { await syncSheet(SHEETS.STUDENTS); rows = await studentRepository.findAll(); }
      const courses = await courseRepository.findAll();
      if (!cancelled) {
        const map: Record<string, string> = {};
        rows.forEach((s) => { if (s.regNumber) map[s.regNumber] = s.fullName ?? s.regNumber; });
        setRegToName(map);
        setStudentOptions(rows.filter((s) => s.regNumber).map((s) => s.regNumber!).sort());

        const groupMap: Record<string, string[]> = {};
        courses.forEach((c) => { if (c.courseName) groupMap[c.courseName] = []; });
        rows.forEach((s) => {
          if (!s.regNumber) return;
          const c = s.course?.trim() ?? '';
          if (!c) return;
          if (!groupMap[c]) groupMap[c] = [];
          groupMap[c].push(s.regNumber);
        });
        const filtered: Record<string, string[]> = {};
        for (const [c, regs] of Object.entries(groupMap)) {
          if (regs.length === 0) continue;
          filtered[c] = regs.sort((a, b) => (map[a] ?? a).localeCompare(map[b] ?? b));
        }
        setStudentGroups(filtered);
        setLoadingStudents(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ── Course options derived from selected assignee ─────────────────────────
  const [courseOptions, setCourseOptions] = useState<string[]>([]);

  useEffect(() => {
    if (!assignee) { setCourseOptions([]); return; }
    studentRepository.findAll().then((rows) => {
      const student = rows.find((s) => s.regNumber?.toLowerCase() === assignee.toLowerCase());
      if (student?.course) {
        setCourseOptions([student.course]);
        setCourse((prev) => prev || student.course!);
      } else {
        setCourseOptions([]);
      }
    });
  }, [assignee]);

  // ── Validation ────────────────────────────────────────────────────────────
  const isNotification = activityType === 'Notification';

  const validate = useCallback((): boolean => {
    const errs: Record<string, string> = {};
    if (isAddEdit) {
      if (!activityType)        errs.activityType = 'Activity type is required';
      if (!assignee.trim())     errs.assignee     = 'Assignee is required';
      if (!title.trim())        errs.title        = 'Title is required';
      if (!startDate.trim())    errs.startDate    = 'Start date is required';
      if (!isNotification && !endDate.trim()) errs.endDate = 'End date is required';
      if (!assignor.trim())     errs.assignor     = 'Assignor is required';
      if (!isNotification && !reviewer.trim()) {
        errs.reviewer = 'Reviewer is required for Assignment / Task';
      }
    }
    if (isSubmit && activityType === 'Assignment') {
      // Attachment validation is handled by the upload flow; note required here
    }
    if (isReview && !isOverdue) {
      const r = Number(ratingRaw);
      if (!ratingRaw.trim() || isNaN(r) || r < 1 || r > 5) {
        errs.rating = 'Rating (1–5) is required before closing';
      }
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [isAddEdit, isSubmit, isReview, activityType, assignee, title, startDate, endDate, assignor, reviewer, ratingRaw, isOverdue]);

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const nextRevision = (item?.revision ?? 0) + 1;
      let nextStatus: ActivityStatus = status;
      let closedBy: string | undefined = item?.closedBy;

      if (isSubmit) nextStatus = 'in-review';
      if (isReview) { nextStatus = 'closed'; closedBy = assignor || item?.assignor; }

      const entry: StudentActivityModel = {
        id:           isEdit || isSubmit || isReview ? item!.id : uuidv4(),
        activityType: isAddEdit ? activityType : item?.activityType,
        category:     isAddEdit ? (category.trim() || undefined) : item?.category,
        course:       isAddEdit ? (course.trim()   || undefined) : item?.course,
        assignor:     isAddEdit ? (assignor.trim() || undefined) : item?.assignor,
        assignee:     isAddEdit ? (assignee.trim() || undefined) : item?.assignee,
        reviewer:     isAddEdit ? (reviewer.trim() || undefined) : item?.reviewer,
        title:        isAddEdit ? (title.trim()    || undefined) : item?.title,
        description:  isAddEdit ? (description.trim() || undefined) : item?.description,
        startDate:    isAddEdit ? (startDate.trim() || undefined) : item?.startDate,
        endDate:      isAddEdit ? (endDate.trim()   || undefined) : item?.endDate,
        status:       nextStatus,
        isOverdue:    isReview ? isOverdue : item?.isOverdue,
        submissionAttachments: item?.submissionAttachments,
        submissionNote: isSubmit ? (submissionNote.trim() || undefined) : item?.submissionNote,
        rating: isReview
          ? (isOverdue ? -1 : (Number(ratingRaw) || undefined))
          : item?.rating,
        closedBy,
        revision:     nextRevision,
      };
      await studentActivityRepository.save(entry);
      syncSheet(SHEETS.STUDENT_ACTIVITY).catch(() => {});
      const successMsg =
        isReview ? 'Activity closed' :
        isSubmit ? 'Submitted for review' :
        isEdit   ? 'Changes saved' : 'Activity created';
      snackbar.show(successMsg, 'success');
      navigation.goBack();
    } catch (e) {
      snackbar.show(`Save failed: ${(e as Error).message}`, 'error');
    } finally {
      setSaving(false);
    }
  }, [validate, isEdit, isSubmit, isReview, isAddEdit, item, activityType, category, course, assignor, assignee, reviewer, title, description, startDate, endDate, status, submissionNote, ratingRaw, navigation, snackbar]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Delete ────────────────────────────────────────────────────────────────
  const confirmDelete = useCallback(() => {
    setSaving(true);
    studentActivityRepository.delete(item!.id)
      .then(() => {
        syncSheet(SHEETS.STUDENT_ACTIVITY).catch(() => {});
        navigation.goBack();
      })
      .catch((e: Error) => { setSaving(false); snackbar.show(`Delete failed: ${e.message}`, 'error'); });
  }, [item, navigation, snackbar]);

  // ── Header label ──────────────────────────────────────────────────────────
  const headerLabel =
    mode === 'add'    ? 'New Activity' :
    mode === 'edit'   ? 'Edit Activity' :
    mode === 'submit' ? 'Submit Activity' : 'Review Activity';

  const saveLabel =
    mode === 'add'    ? 'Create Activity' :
    mode === 'edit'   ? 'Save Changes' :
    mode === 'submit' ? 'Submit for Review' : 'Close Activity';

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
        <Text style={KStyles.headerTitle}>{headerLabel}</Text>
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

        {/* ══ add / edit fields ══════════════════════════════════════════════ */}
        {isAddEdit && (
          <>
            {/* Activity type */}
            <Text style={KStyles.formSection}>Activity</Text>
            <Field label="Type" required>
              <SingleSelectDropdown
                selected={activityType}
                options={ACTIVITY_TYPES}
                onChange={(v) => setActivityType(v as ActivityType)}
                placeholder="Select type…"
                title="Activity Type"
              />
              {errors.activityType ? <Text style={KStyles.formError}>{errors.activityType}</Text> : null}
            </Field>

            <Field label="Category" required={false}>
              <RefDropdown
                value={category}
                options={categoryOptions}
                onChange={setCategory}
                loading={loadingRefs}
                placeholder="Select category…"
                title="Category"
              />
            </Field>

            {/* Title / Description */}
            <Text style={KStyles.formSection}>Details</Text>
            <Field label="Title" required>
              <InputField value={title} onChangeText={setTitle} placeholder="Short title…" editable />
              {errors.title ? <Text style={KStyles.formError}>{errors.title}</Text> : null}
            </Field>
            <Field label="Description">
              <InputField
                value={description} onChangeText={setDescription}
                placeholder="Instructions or message…" multiline editable
              />
            </Field>

            {/* People */}
            <Text style={KStyles.formSection}>People</Text>
            <Field label="Assignee (Student)" required>
              <SingleSelectDropdown
                selected={assignee}
                options={studentOptions}
                onChange={setAssignee}
                placeholder="Select student…"
                title="Select Assignee"
                loading={loadingStudents}
                groups={Object.keys(studentGroups).length > 0 ? studentGroups : undefined}
                renderLabel={(reg) => regToName[reg] ? `${regToName[reg]} (${reg})` : reg}
              />
              {errors.assignee ? <Text style={KStyles.formError}>{errors.assignee}</Text> : null}
            </Field>

            <Field label="Assignor (Creator)" required>
              <SingleSelectDropdown
                selected={assignor}
                options={staffOptions}
                onChange={setAssignor}
                placeholder="Select creator…"
                title="Select Assignor"
                loading={loadingStaff}
              />
              {errors.assignor ? <Text style={KStyles.formError}>{errors.assignor}</Text> : null}
            </Field>

            {activityType !== 'Notification' && (
              <Field label="Reviewer" required>
                <SingleSelectDropdown
                  selected={reviewer}
                  options={staffOptions}
                  onChange={setReviewer}
                  placeholder="Select reviewer…"
                  title="Select Reviewer"
                  loading={loadingStaff}
                />
                {errors.reviewer ? <Text style={KStyles.formError}>{errors.reviewer}</Text> : null}
              </Field>
            )}

            {/* Dates */}
            <Text style={KStyles.formSection}>Dates</Text>
            <Field label="Start Date" required>
              <FormDatePicker value={startDate} onChange={setStartDate} format="dmy" />
              {errors.startDate ? <Text style={KStyles.formError}>{errors.startDate}</Text> : null}
            </Field>
            {!isNotification && (
              <Field label="End Date (Deadline)" required>
                <FormDatePicker value={endDate} onChange={setEndDate} format="dmy" />
                {errors.endDate ? <Text style={KStyles.formError}>{errors.endDate}</Text> : null}
              </Field>
            )}

            {/* Status (edit only) */}
            {isEdit && (
              <>
                <Text style={KStyles.formSection}>Status</Text>
                <Field label="Status" required>
                  <SingleSelectDropdown
                    selected={status}
                    options={isNotification ? STATUS_OPTIONS_NOTIFICATION : STATUS_OPTIONS}
                    onChange={(v) => setStatus(v as ActivityStatus)}
                    placeholder="Select status…"
                    title="Status"
                  />
                </Field>
              </>
            )}
          </>
        )}

        {/* ══ submit mode ════════════════════════════════════════════════════ */}
        {isSubmit && (
          <>
            <Text style={KStyles.formSection}>Submission</Text>
            {item?.activityType === 'Assignment' && (
              <Text style={KStyles.formError}>
                * Please attach your document/photo before submitting.
              </Text>
            )}
            <Field label="Submission Note">
              <InputField
                value={submissionNote} onChangeText={setSubmissionNote}
                placeholder="Any notes for the reviewer…" multiline editable
              />
            </Field>
          </>
        )}

        {/* ══ review mode ════════════════════════════════════════════════════ */}
        {isReview && (
          <>
            <Text style={KStyles.formSection}>Rating</Text>
            {isOverdue ? (
              <Text style={[KStyles.formError, { marginBottom: 8 }]}>
                Activity is overdue — negative rating will be applied automatically.
              </Text>
            ) : (
              <Field label="Rating (1–5)" required>
                <View style={starStyles.row}>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <TouchableOpacity
                      key={s}
                      onPress={() => setRatingRaw(String(s))}
                      activeOpacity={0.7}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons
                        name={s <= Number(ratingRaw || 0) ? 'star' : 'star-outline'}
                        size={40}
                        color="#FDD835"
                      />
                    </TouchableOpacity>
                  ))}
                </View>
                {errors.rating ? <Text style={KStyles.formError}>{errors.rating}</Text> : null}
              </Field>
            )}
          </>
        )}

        {/* ── Audit ────────────────────────────────────────────────────────── */}
        {(isEdit || isSubmit || isReview) && item?.lastmodified && (
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
            : <Text style={KStyles.formSaveBtnText}>{saveLabel}</Text>}
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
        title="Delete Activity"
        message="Are you sure you want to delete this activity? This cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={() => { setDeleteDialogVisible(false); confirmDelete(); }}
        onCancel={() => setDeleteDialogVisible(false)}
      />
    </KeyboardAvoidingView>
  );
}

const starStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
});
