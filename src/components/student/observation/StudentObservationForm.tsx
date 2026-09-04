import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  ActivityIndicator, KeyboardAvoidingView, Platform, TextInput, StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { v4 as uuidv4 } from 'uuid';
import { Colors, KStyles } from '../../../styles/kutties-styles';
import { SHEETS, MONTHS } from '../../../utils/constants';
import {
  studentObservationQnRepository,
  studentObservationTrackRepository,
  studentRepository,
  teacherRepository,
  courseRepository,
} from '../../../db/repositories';
import { syncSheet } from '../../../sync/sync.service';
import type { StudentObservationQnModel } from '../../../db/models/studentobservationqn.model';
import type { StudentObservationTrackModel } from '../../../db/models/studentobservationtrack.model';
import type { StudentModel } from '../../../db/models/student.model';
import Snackbar, { useSnackbar } from '../../shared/Snackbar';
import AuditRow from '../../shared/AuditRow';
import ConfirmDialog from '../../shared/ConfirmDialog';
import FormDatePicker from '../../shared/FormDatePicker';
import { Field } from '../../shared/FormField';
import SingleSelectDropdown from '../../shared/SingleSelectDropdown';

interface Props {
  navigation: any;
  route: {
    params: {
      mode: 'add' | 'edit' | 'view';
      sessionRecords?: StudentObservationTrackModel[];
      prefilledRegNumber?: string;
    };
  };
}

// ── Answer state per question ─────────────────────────────────────────────────
type AnswerMap  = Record<string, 'Yes' | 'No' | ''>;  // questionId → answer
type RemarkMap  = Record<string, string>;               // questionId → remark

export default function StudentObservationForm({ navigation, route }: Props) {
  const { mode, sessionRecords, prefilledRegNumber } = route.params;
  const isView = mode === 'view';
  const isEdit = mode === 'edit';

  // ── Today default ──────────────────────────────────────────────────────────
  const todayStr = useMemo(() => {
    const d = new Date();
    return `${String(d.getDate()).padStart(2, '0')}/${MONTHS[d.getMonth()]}/${d.getFullYear()}`;
  }, []);

  // ── Header fields ──────────────────────────────────────────────────────────
  const [regNumber,   setRegNumber]   = useState(sessionRecords?.[0]?.regNumber   ?? prefilledRegNumber ?? '');
  const [obsDate,     setObsDate]     = useState(sessionRecords?.[0]?.obsDate     ?? todayStr);
  const [recordedBy,  setRecordedBy]  = useState(sessionRecords?.[0]?.recordedBy  ?? '');

  // ── Question answers ───────────────────────────────────────────────────────
  const [questions,   setQuestions]   = useState<StudentObservationQnModel[]>([]);
  const [answerMap,   setAnswerMap]   = useState<AnswerMap>({});
  const [remarkMap,   setRemarkMap]   = useState<RemarkMap>({});
  const [loadingQns,  setLoadingQns]  = useState(true);

  // ── Dropdowns ──────────────────────────────────────────────────────────────
  const [studentOptions,  setStudentOptions]  = useState<string[]>([]);
  const [regToStudent,    setRegToStudent]    = useState<Record<string, StudentModel>>({});
  const [studentGroups,   setStudentGroups]   = useState<Record<string, string[]>>({});
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [teacherOptions,  setTeacherOptions]  = useState<string[]>([]);
  const [loadingTeachers, setLoadingTeachers] = useState(true);

  const [saving,  setSaving]  = useState(false);
  const [errors,  setErrors]  = useState<Record<string, string>>({});
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const snackbar = useSnackbar();

  // ── Load teacher list ──────────────────────────────────────────────────────
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

  // ── Load student list ──────────────────────────────────────────────────────
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
        const map: Record<string, StudentModel> = {};
        rows.forEach((s) => { if (s.regNumber) map[s.regNumber] = s; });
        setRegToStudent(map);
        setStudentOptions(rows.filter((s) => s.regNumber && s.status === 'active').map((s) => s.regNumber!).sort());

        const courseNames = courses.map((c) => c.courseName ?? '').filter(Boolean);
        const groupMap: Record<string, string[]> = {};
        courseNames.forEach((name) => { groupMap[name] = []; });
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
          filtered[course] = regs.sort((a, b) => (map[a]?.fullName ?? a).localeCompare(map[b]?.fullName ?? b));
        }
        setStudentGroups(filtered);
        setLoadingStudents(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ── Load questions whenever regNumber changes ──────────────────────────────
  const loadQuestions = useCallback(async (reg: string) => {
    setLoadingQns(true);
    try {
      // Sync questions sheet if empty
      let qns = await studentObservationQnRepository.findAll();
      if (qns.length === 0) {
        await syncSheet(SHEETS.STUDENT_OBSERVATION_QN);
        qns = await studentObservationQnRepository.findAll();
      }
      const studentCourse = reg ? regToStudent[reg]?.course : undefined;
      const active = await studentObservationQnRepository.findActive(studentCourse);
      setQuestions(active);

      // Seed answer map from existing session records (edit/view) or blank (add)
      const existingAnswers: AnswerMap  = {};
      const existingRemarks: RemarkMap  = {};
      if (sessionRecords) {
        for (const r of sessionRecords) {
          if (r.questionId) {
            existingAnswers[r.questionId] = (r.answer ?? '') as 'Yes' | 'No' | '';
            existingRemarks[r.questionId] = r.remark ?? '';
          }
        }
      }
      // Ensure every active question has an entry
      for (const q of active) {
        if (!(q.id in existingAnswers)) existingAnswers[q.id] = '';
        if (!(q.id in existingRemarks)) existingRemarks[q.id] = '';
      }
      setAnswerMap(existingAnswers);
      setRemarkMap(existingRemarks);
    } finally {
      setLoadingQns(false);
    }
  }, [regToStudent, sessionRecords]);

  // Initial load — wait until regToStudent is ready
  useEffect(() => {
    if (!loadingStudents) {
      if (regNumber) {
        loadQuestions(regNumber);
      } else {
        setLoadingQns(false); // no student selected yet — stop spinner, show placeholder
      }
    }
  }, [loadingStudents]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reload questions when student changes (add mode only)
  const handleRegChange = useCallback((reg: string) => {
    setRegNumber(reg);
    if (reg) loadQuestions(reg);
  }, [loadQuestions]);

  // ── Answer toggles ─────────────────────────────────────────────────────────
  const setAnswer = useCallback((questionId: string, value: 'Yes' | 'No') => {
    setAnswerMap((prev) => ({
      ...prev,
      [questionId]: prev[questionId] === value ? '' : value,
    }));
  }, []);

  const setRemark = useCallback((questionId: string, text: string) => {
    setRemarkMap((prev) => ({ ...prev, [questionId]: text }));
  }, []);

  // ── Validation ─────────────────────────────────────────────────────────────
  const validate = useCallback((): boolean => {
    const errs: Record<string, string> = {};
    if (!regNumber.trim())  errs.regNumber  = 'Student is required';
    if (!recordedBy.trim()) errs.recordedBy = 'Recorded by is required';
    const hasAnswer = Object.values(answerMap).some((a) => a === 'Yes' || a === 'No');
    if (!hasAnswer)         errs.answers    = 'At least one question must be answered';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [regNumber, recordedBy, answerMap]);

  // ── Save ───────────────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      // Build a map of existing IDs by questionId so we can reuse them on edit
      const existingIdMap: Record<string, string> = {};
      if (sessionRecords) {
        for (const r of sessionRecords) {
          if (r.questionId) existingIdMap[r.questionId] = r.id;
        }
      }

      const rows: StudentObservationTrackModel[] = questions
        .filter((q) => {
          const answer = answerMap[q.id] ?? '';
          const remark = remarkMap[q.id]?.trim() ?? '';
          return answer === 'Yes' || answer === 'No' || remark.length > 0;
        })
        .map((q) => ({
          id:          existingIdMap[q.id] ?? uuidv4(),
          regNumber:   regNumber.trim() || undefined,
          obsDate:     obsDate.trim()   || undefined,
          questionId:  q.id,
          answer:      (answerMap[q.id] ?? '') as 'Yes' | 'No' | '',
          remark:      remarkMap[q.id]?.trim() || undefined,
          recordedBy:  recordedBy.trim() || undefined,
        }));

      await Promise.all(rows.map((r) => studentObservationTrackRepository.save(r)));
      syncSheet(SHEETS.STUDENT_OBSERVATION_TRACK).catch(() => {});
      snackbar.show(isEdit ? 'Changes saved' : 'Observation recorded', 'success');
      navigation.goBack();
    } catch (e) {
      snackbar.show(`Save failed: ${(e as Error).message}`, 'error');
    } finally {
      setSaving(false);
    }
  }, [validate, questions, regNumber, obsDate, recordedBy, answerMap, remarkMap, sessionRecords, isEdit, navigation, snackbar]);

  // ── Delete session ─────────────────────────────────────────────────────────
  const confirmDelete = useCallback(() => {
    setSaving(true);
    studentObservationTrackRepository
      .deleteSession(regNumber, obsDate)
      .then(() => {
        syncSheet(SHEETS.STUDENT_OBSERVATION_TRACK).catch(() => {});
        navigation.goBack();
      })
      .catch((e: Error) => {
        setSaving(false);
        snackbar.show(`Delete failed: ${e.message}`, 'error');
      });
  }, [regNumber, obsDate, navigation, snackbar]);

  // ── Questions grouped by category ─────────────────────────────────────────
  const groupedQuestions = useMemo(() => {
    const map = new Map<string, StudentObservationQnModel[]>();
    for (const q of questions) {
      const cat = q.category ?? 'General';
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(q);
    }
    return map;
  }, [questions]);

  const regToName = useMemo(() => {
    const m: Record<string, string> = {};
    for (const [reg, s] of Object.entries(regToStudent)) m[reg] = s.fullName ?? reg;
    return m;
  }, [regToStudent]);

  const auditRecord = sessionRecords?.[0];

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
          {isView ? 'Observation Details' : isEdit ? 'Edit Observation' : 'New Observation'}
        </Text>
        <View style={KStyles.headerActions}>
          {!isView && (
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={KStyles.headerIcon}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close-outline" size={24} color="#fff" />
            </TouchableOpacity>
          )}
          {isView && (
            <TouchableOpacity
              onPress={() =>
                navigation.replace('StudentObservationForm', {
                  mode: 'edit',
                  sessionRecords,
                  prefilledRegNumber: regNumber,
                })
              }
              style={KStyles.headerIcon}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="create-outline" size={22} color="#fff" />
            </TouchableOpacity>
          )}
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

        {/* ── Section 1: Student ──────────────────────────────────────────── */}
        <Text style={KStyles.formSection}>Student</Text>

        <Field label="Student" required>
          <SingleSelectDropdown
            selected={regNumber}
            options={studentOptions}
            onChange={isView ? () => {} : handleRegChange}
            placeholder="Select a student…"
            title="Select Student"
            loading={loadingStudents}
            groups={Object.keys(studentGroups).length > 0 ? studentGroups : undefined}
            renderLabel={(reg) => regToName[reg] ? `${regToName[reg]} (${reg})` : reg}
            disabled={isView || isEdit}
          />
          {errors.regNumber ? <Text style={KStyles.formError}>{errors.regNumber}</Text> : null}
        </Field>

        <Field label="Date">
          <FormDatePicker value={obsDate} onChange={isEdit ? setObsDate : () => {}} format="dmy" editable={isEdit} />
        </Field>

        <Field label="Recorded By" required>
          <SingleSelectDropdown
            selected={recordedBy}
            options={teacherOptions}
            onChange={isView ? () => {} : setRecordedBy}
            placeholder="Select teacher…"
            title="Select Teacher"
            loading={loadingTeachers}
            disabled={isView}
          />
          {errors.recordedBy ? <Text style={KStyles.formError}>{errors.recordedBy}</Text> : null}
        </Field>

        {/* ── Section 2: Observations ─────────────────────────────────────── */}
        <Text style={KStyles.formSection}>Observations</Text>

        {errors.answers ? (
          <Text style={[KStyles.formError, { marginHorizontal: 16, marginBottom: 8 }]}>{errors.answers}</Text>
        ) : null}

        {loadingQns ? (
          <View style={styles.qnLoading}>
            <ActivityIndicator size="small" color={Colors.primary} />
            <Text style={styles.qnLoadingText}>Loading questions…</Text>
          </View>
        ) : questions.length === 0 ? (
          <View style={styles.qnEmpty}>
            <Text style={styles.qnEmptyText}>
              {!regNumber
                ? 'Select a student to load questions.'
                : 'No observation questions configured for this course.'}
            </Text>
          </View>
        ) : (
          [...groupedQuestions.entries()].map(([category, qns]) => (
            <View key={category} style={styles.categoryBlock}>
              <View style={styles.categoryHeader}>
                <Text style={styles.categoryTitle}>{category}</Text>
              </View>

              {qns.map((q, idx) => {
                const currentAnswer = answerMap[q.id] ?? '';
                const currentRemark = remarkMap[q.id] ?? '';
                return (
                  <View key={q.id} style={[styles.questionCard, idx < qns.length - 1 && styles.questionBorder]}>
                    <Text style={styles.questionText}>{q.question ?? q.id}</Text>

                    {/* Answer buttons */}
                    <View style={styles.answerRow}>
                      <TouchableOpacity
                        style={[styles.answerBtn, currentAnswer === 'Yes' && styles.answerYes]}
                        onPress={isView ? undefined : () => setAnswer(q.id, 'Yes')}
                        activeOpacity={isView ? 1 : 0.8}
                      >
                        <Text style={[styles.answerBtnText, currentAnswer === 'Yes' && styles.answerYesText]}>Yes</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.answerBtn, currentAnswer === 'No' && styles.answerNo]}
                        onPress={isView ? undefined : () => setAnswer(q.id, 'No')}
                        activeOpacity={isView ? 1 : 0.8}
                      >
                        <Text style={[styles.answerBtnText, currentAnswer === 'No' && styles.answerNoText]}>No</Text>
                      </TouchableOpacity>

                      {/* Clear / unanswered indicator */}
                      <TouchableOpacity
                        style={[styles.answerBtn, currentAnswer === '' && styles.answerClear]}
                        onPress={isView ? undefined : () => setAnswerMap((prev) => ({ ...prev, [q.id]: '' }))}
                        activeOpacity={isView ? 1 : 0.8}
                      >
                        <Text style={[styles.answerBtnText, currentAnswer === '' && styles.answerClearText]}>—</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Remark field */}
                    {isView ? (
                      currentRemark ? (
                        <View style={styles.remarkView}>
                          <Ionicons name="chatbubble-ellipses-outline" size={12} color={Colors.muted} />
                          <Text style={styles.remarkViewText}>{currentRemark}</Text>
                        </View>
                      ) : null
                    ) : (
                      <TextInput
                        style={styles.remarkInput}
                        value={currentRemark}
                        onChangeText={(t) => setRemark(q.id, t)}
                        placeholder="Remark (optional)…"
                        placeholderTextColor="#bbb"
                      />
                    )}
                  </View>
                );
              })}
            </View>
          ))
        )}

        {/* ── Section 3: Audit ────────────────────────────────────────────── */}
        {(isEdit || isView) && auditRecord?.lastmodified && (
          <>
            <Text style={KStyles.formSection}>Audit</Text>
            <View style={KStyles.formAuditCard}>
              <AuditRow label="Last modified" value={auditRecord.lastmodified} />
            </View>
          </>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Save button (add / edit only) */}
      {!isView && (
        <View style={KStyles.formFooter}>
          <TouchableOpacity
            style={[KStyles.formSaveBtn, saving && KStyles.formSaveBtnDisabled]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={KStyles.formSaveBtnText}>{isEdit ? 'Save Changes' : 'Save Observation'}</Text>}
          </TouchableOpacity>
        </View>
      )}

      <Snackbar
        visible={snackbar.visible}
        message={snackbar.message}
        kind={snackbar.kind}
        opacity={snackbar.opacity}
      />

      <ConfirmDialog
        visible={deleteDialogVisible}
        title="Delete Observation"
        message="This will delete all answers for this session. Are you sure?"
        confirmLabel="Delete"
        destructive
        onConfirm={() => { setDeleteDialogVisible(false); confirmDelete(); }}
        onCancel={() => setDeleteDialogVisible(false)}
      />
    </KeyboardAvoidingView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  qnLoading: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 10 },
  qnLoadingText: { fontSize: 13, color: Colors.muted },
  qnEmpty: { padding: 16 },
  qnEmptyText: { fontSize: 13, color: Colors.muted, fontStyle: 'italic' },

  categoryBlock: { marginBottom: 8 },
  categoryHeader: {
    backgroundColor: Colors.surface ?? '#f7f8fa',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  categoryTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  questionCard: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    backgroundColor: '#fff',
  },
  questionBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  questionText: { fontSize: 14, color: '#333', marginBottom: 8, lineHeight: 20 },

  answerRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  answerBtn: {
    paddingHorizontal: 18,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#f5f5f5',
  },
  answerBtnText: { fontSize: 13, fontWeight: '600', color: '#555' },

  answerYes:      { backgroundColor: '#E8F5E9', borderColor: '#43A047' },
  answerYesText:  { color: '#2E7D32' },
  answerNo:       { backgroundColor: '#FFEBEE', borderColor: '#E53935' },
  answerNoText:   { color: '#C62828' },
  answerClear:    { backgroundColor: '#EEEEEE', borderColor: '#9E9E9E' },
  answerClearText:{ color: '#757575' },

  remarkInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 13,
    color: '#333',
    backgroundColor: '#fafafa',
  },
  remarkView: { flexDirection: 'row', alignItems: 'flex-start', gap: 4, marginTop: 2 },
  remarkViewText: { fontSize: 12, color: Colors.muted, flex: 1 },
});
