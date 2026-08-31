import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, ScrollView,
  TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { v4 as uuidv4 } from 'uuid';
import { Colors, KStyles } from '../../styles/kutties-styles';
import { SHEETS } from '../../utils/constants';
import {
  studentFeeRepository, studentRepository, courseRepository,
  getRefOptions, ensureReftbl,
} from '../../db/repositories';
import { syncSheet } from '../../sync/sync.service';
import type { StudentFeeModel } from '../../db/models/studentfee.model';
import Snackbar, { useSnackbar } from '../shared/Snackbar';
import AuditRow from '../shared/AuditRow';
import ConfirmDialog from '../shared/ConfirmDialog';
import FormDatePicker from '../shared/FormDatePicker';
import { Field, InputField } from '../shared/FormField';
import SingleSelectDropdown from '../shared/SingleSelectDropdown';

// ── Receipt number generator (module-level — not recreated on render) ────────
function generateRecptNo(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const rand = Math.floor(Math.random() * 91); // 0–90
  return (
    'st/fe/' +
    now.getFullYear().toString().slice(-2) +
    pad(now.getMonth() + 1) +
    pad(now.getDate()) +
    pad(now.getHours()) +
    pad(now.getMinutes()) +
    pad(rand)
  );
}

const STATUS_OPTIONS = ['Pending', 'Partial', 'Paid'];

interface Props {
  navigation: any;
  route: {
    params: {
      mode: 'add' | 'edit';
      item?: StudentFeeModel;
      prefilledRegNumber?: string;
      prefilledAmount?: number;
      prefilledFeeType?: string;
    };
  };
}

export default function StudentFeeForm({ navigation, route }: Props) {
  const { mode, item, prefilledRegNumber, prefilledAmount, prefilledFeeType } = route.params;
  const isEdit = mode === 'edit';

  // ── Form state ──────────────────────────────────────────────────────────────
  const [regNumber,   setRegNumber]   = useState(item?.regNumber   ?? prefilledRegNumber ?? '');
  const [recptNo,     setRecptNo]     = useState(item?.recptNo     ?? (isEdit ? '' : generateRecptNo()));
  const [feeType,     setFeeType]     = useState(item?.feeType     ?? prefilledFeeType   ?? '');
  const [amount,      setAmount]      = useState(item?.amount?.toString() ?? prefilledAmount?.toString() ?? '');
  const [dueDate,     setDueDate]     = useState(item?.dueDate     ?? '');
  const [paidDate,    setPaidDate]    = useState(item?.paidDate    ?? (isEdit ? '' : new Date().toISOString().slice(0, 10)));
  const [paymentMode, setPaymentMode] = useState(item?.paymentMode ?? '');
  const [status,      setStatus]      = useState(item?.status      ?? '');
  const [remarks,     setRemarks]     = useState(item?.remarks     ?? '');

  const [saving,  setSaving]  = useState(false);
  const [errors,  setErrors]  = useState<Record<string, string>>({});
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const snackbar = useSnackbar();

  // ── Ref options (fee type + payment mode from reftbl) ───────────────────────
  const [feeTypeOptions,    setFeeTypeOptions]    = useState<string[]>([]);
  const [paymentModeOptions, setPaymentModeOptions] = useState<string[]>([]);
  const [loadingRefs,       setLoadingRefs]       = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await ensureReftbl();
      const [feeOpts, pmOpts] = await Promise.all([
        getRefOptions('feeref'),
        getRefOptions('paymentmethod'),
      ]);
      if (!cancelled) {
        setFeeTypeOptions(feeOpts);
        setPaymentModeOptions(pmOpts);
        setLoadingRefs(false);
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
          filtered[course] = regs.sort((a, b) => (map[a] ?? a).localeCompare(map[b] ?? b));
        }
        setStudentGroups(filtered);
        setLoadingStudents(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ── Validation ───────────────────────────────────────────────────────────────
  const validate = useCallback((): boolean => {
    const errs: Record<string, string> = {};
    if (!regNumber.trim())   errs.regNumber   = 'Student is required';
    if (!feeType.trim())     errs.feeType     = 'Fee type is required';
    if (!amount.trim())      errs.amount      = 'Amount is required';
    if (!recptNo.trim())     errs.recptNo     = 'Receipt number is required';
    if (!paidDate.trim())    errs.paidDate    = 'Paid date is required';
    if (!paymentMode.trim()) errs.paymentMode = 'Payment mode is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [regNumber, feeType, amount, recptNo, paidDate, paymentMode]);

  // ── Save ─────────────────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const entry: StudentFeeModel = {
        id:          isEdit ? item!.id : uuidv4(),
        regNumber:   regNumber.trim()   || undefined,
        recptNo:     isEdit ? (recptNo.trim() || undefined) : (recptNo.trim() || generateRecptNo()),
        feeType:     feeType.trim()     || undefined,
        amount:      amount.trim()      ? Number(amount.trim()) : undefined,
        dueDate:     dueDate.trim()     || undefined,
        paidDate:    paidDate.trim()    || undefined,
        paymentMode: paymentMode        || undefined,
        status:      status             || undefined,
        remarks:     remarks.trim()     || undefined,
      };
      await studentFeeRepository.save(entry);
      syncSheet(SHEETS.STUDENT_FEE).catch(() => {});
      snackbar.show(isEdit ? 'Changes saved' : 'Fee record added', 'success');
      navigation.goBack();
    } catch (e) {
      snackbar.show(`Save failed: ${(e as Error).message}`, 'error');
    } finally {
      setSaving(false);
    }
  }, [validate, isEdit, item, regNumber, recptNo, feeType, amount, dueDate, paidDate, paymentMode, status, remarks, navigation, snackbar]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Delete ───────────────────────────────────────────────────────────────────
  const confirmDelete = useCallback(() => {
    setSaving(true);
    studentFeeRepository.delete(item!.id)
      .then(() => {
        syncSheet(SHEETS.STUDENT_FEE).catch(() => {});
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
          {isEdit ? 'Edit Fee Record' : 'Collect Fee'}
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

        {/* ── Student ─────────────────────────────────────────────────── */}
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

        {/* ── Fee Details ─────────────────────────────────────────────── */}
        <Text style={KStyles.formSection}>Fee Details</Text>

        <Field label={isEdit ? 'Receipt No' : 'Receipt No (auto)'} required>
          <InputField
            value={recptNo}
            onChangeText={setRecptNo}
            placeholder="Auto-generated"
            editable={false}
          />
          {errors.recptNo ? <Text style={KStyles.formError}>{errors.recptNo}</Text> : null}
        </Field>

        <Field label="Fee Type" required>
          <SingleSelectDropdown
            selected={feeType}
            options={feeTypeOptions}
            onChange={setFeeType}
            placeholder="Select fee type…"
            title="Fee Type"
            loading={loadingRefs}
          />
          {errors.feeType ? <Text style={KStyles.formError}>{errors.feeType}</Text> : null}
        </Field>

        <Field label="Amount (₹)" required>
          <InputField
            value={amount}
            onChangeText={setAmount}
            placeholder="e.g. 5000"
            keyboardType="numeric"
            editable
          />
          {errors.amount ? <Text style={KStyles.formError}>{errors.amount}</Text> : null}
        </Field>

        <Field label="Due Date">
          <FormDatePicker value={dueDate} onChange={setDueDate} format="iso" />
        </Field>

        <Field label="Paid Date" required>
          <FormDatePicker value={paidDate} onChange={setPaidDate} format="iso" />
          {errors.paidDate ? <Text style={KStyles.formError}>{errors.paidDate}</Text> : null}
        </Field>

        <Field label="Payment Mode" required>
          <SingleSelectDropdown
            selected={paymentMode}
            options={paymentModeOptions}
            onChange={setPaymentMode}
            placeholder="Select payment mode…"
            title="Payment Mode"
            loading={loadingRefs}
          />
          {errors.paymentMode ? <Text style={KStyles.formError}>{errors.paymentMode}</Text> : null}
        </Field>

        <Field label="Status">
          <SingleSelectDropdown
            selected={status}
            options={STATUS_OPTIONS}
            onChange={setStatus}
            placeholder="Select status…"
            title="Fee Status"
          />
        </Field>

        {/* ── Remarks ─────────────────────────────────────────────────── */}
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

        {/* ── Audit ───────────────────────────────────────────────────── */}
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
            : <Text style={KStyles.formSaveBtnText}>{isEdit ? 'Save Changes' : 'Collect Fee'}</Text>}
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
        title="Delete Fee Record"
        message="Are you sure you want to delete this fee record? This cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={() => { setDeleteDialogVisible(false); confirmDelete(); }}
        onCancel={() => setDeleteDialogVisible(false)}
      />
    </KeyboardAvoidingView>
  );
}
