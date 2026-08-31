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
  staffPayRepository, teacherRepository, employeeRepository, getRefOptions, ensureReftbl,
} from '../../db/repositories';
import { syncSheet } from '../../sync/sync.service';
import type { StaffPayModel } from '../../db/models/staffpay.model';
import Snackbar, { useSnackbar } from '../shared/Snackbar';
import AuditRow from '../shared/AuditRow';
import ConfirmDialog from '../shared/ConfirmDialog';
import FormDatePicker from '../shared/FormDatePicker';
import FormMonthPicker from '../shared/FormMonthPicker';
import { Field, InputField } from '../shared/FormField';
import SingleSelectDropdown from '../shared/SingleSelectDropdown';

// ── Receipt number generator ──────────────────────────────────────────────────
function generateRecptNo(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const rand = Math.floor(Math.random() * 91);
  return (
    'sp/' +
    now.getFullYear().toString().slice(-2) +
    pad(now.getMonth() + 1) +
    pad(now.getDate()) +
    pad(now.getHours()) +
    pad(now.getMinutes()) +
    pad(rand)
  );
}

interface Props {
  navigation: any;
  route: {
    params: {
      mode: 'add' | 'edit';
      item?: StaffPayModel;
      prefilledStaff?: string;
    };
  };
}

export default function StaffPayForm({ navigation, route }: Props) {
  const { mode, item, prefilledStaff } = route.params;
  const isEdit = mode === 'edit';

  // ── Form state ──────────────────────────────────────────────────────────────
  const [staff,     setStaff]     = useState(item?.staff     ?? prefilledStaff ?? '');
  const [recptNo,   setRecptNo]   = useState(item?.recptNo   ?? (isEdit ? '' : generateRecptNo()));
  const [payMode,   setPayMode]   = useState(item?.payMode   ?? '');
  const [payMonth,  setPayMonth]  = useState(item?.payMonth  ?? '');
  const [amount,    setAmount]    = useState(item?.amount?.toString() ?? '');
  const [payDate,   setPayDate]   = useState(item?.payDate   ?? (isEdit ? '' : new Date().toISOString().slice(0, 10)));
  const [remarks,   setRemarks]   = useState(item?.remarks   ?? '');

  const [saving,  setSaving]  = useState(false);
  const [errors,  setErrors]  = useState<Record<string, string>>({});
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const snackbar = useSnackbar();

  // ── Staff options ────────────────────────────────────────────────────────────
  const [staffOptions,   setStaffOptions]   = useState<string[]>([]);
  const [nameToEmail,    setNameToEmail]    = useState<Record<string, string>>({});
  const [staffGroups,    setStaffGroups]    = useState<Record<string, string[]>>({});
  const [loadingStaff,   setLoadingStaff]   = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Fetch all staff from the shared STAFF sheet (teachers + non-teachers)
      let [teachers, employees] = await Promise.all([
        teacherRepository.findAll(),
        employeeRepository.findAll(),
      ]);
      // If both are empty the sheet hasn't synced yet — sync once then re-fetch
      if (teachers.length === 0 && employees.length === 0) {
        await syncSheet(SHEETS.STAFF);
        [teachers, employees] = await Promise.all([
          teacherRepository.findAll(),
          employeeRepository.findAll(),
        ]);
      }
      if (!cancelled) {
        const allStaff = [...teachers, ...employees];
        const map: Record<string, string> = {};
        allStaff.forEach((s) => { if (s.email) map[s.email] = s.name ?? s.email; });
        setNameToEmail(map);
        // Group by designation for a better picker experience
        const groupMap: Record<string, string[]> = {};
        allStaff.forEach((s) => {
          if (!s.email) return;
          const desig = (s.designation ?? 'Other').trim();
          if (!groupMap[desig]) groupMap[desig] = [];
          groupMap[desig].push(s.email);
        });
        // Sort each group alphabetically by name
        for (const emails of Object.values(groupMap)) {
          emails.sort((a, b) => (map[a] ?? a).localeCompare(map[b] ?? b));
        }
        setStaffOptions(allStaff.filter((s) => s.email).map((s) => s.email!).sort(
          (a, b) => (map[a] ?? a).localeCompare(map[b] ?? b),
        ));
        setStaffGroups(groupMap);
        setLoadingStaff(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ── Pay mode options from reftbl ─────────────────────────────────────────────
  const [payModeOptions, setPayModeOptions] = useState<string[]>([]);
  const [loadingRefs,    setLoadingRefs]    = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await ensureReftbl();
      const pmOpts = await getRefOptions('paymentmethod');
      if (!cancelled) {
        setPayModeOptions(pmOpts);
        setLoadingRefs(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ── Validation ───────────────────────────────────────────────────────────────
  const validate = useCallback((): boolean => {
    const errs: Record<string, string> = {};
    if (!staff.trim())   errs.staff   = 'Staff member is required';
    if (!payMonth.trim()) errs.payMonth = 'Pay month is required';
    if (!amount.trim())  errs.amount  = 'Amount is required';
    if (!payDate.trim()) errs.payDate = 'Pay date is required';
    if (!payMode.trim()) errs.payMode = 'Pay mode is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [staff, payMonth, amount, payDate, payMode]);

  // ── Save ─────────────────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const entry: StaffPayModel = {
        id:       isEdit ? item!.id : uuidv4(),
        recptNo:  isEdit ? (recptNo.trim() || undefined) : (recptNo.trim() || generateRecptNo()),
        staff:    staff.trim()    || undefined,
        payMode:  payMode         || undefined,
        payMonth: payMonth.trim() || undefined,
        amount:   amount.trim()   ? Number(amount.trim()) : undefined,
        payDate:  payDate.trim()  || undefined,
        remarks:  remarks.trim()  || undefined,
      };
      await staffPayRepository.save(entry);
      syncSheet(SHEETS.STAFF_PAY).catch(() => {});
      snackbar.show(isEdit ? 'Changes saved' : 'Pay record added', 'success');
      navigation.goBack();
    } catch (e) {
      snackbar.show(`Save failed: ${(e as Error).message}`, 'error');
    } finally {
      setSaving(false);
    }
  }, [validate, isEdit, item, recptNo, staff, payMode, payMonth, amount, payDate, remarks, navigation, snackbar]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Delete ───────────────────────────────────────────────────────────────────
  const confirmDelete = useCallback(() => {
    setSaving(true);
    staffPayRepository.delete(item!.id)
      .then(() => {
        syncSheet(SHEETS.STAFF_PAY).catch(() => {});
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
          {isEdit ? 'Edit Pay Record' : 'Add Pay Record'}
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

        {/* ── Staff ───────────────────────────────────────────────── */}
        <Text style={KStyles.formSection}>Staff</Text>

        <Field label="Staff Member" required>
          <SingleSelectDropdown
            selected={staff}
            options={staffOptions}
            onChange={setStaff}
            placeholder="Select staff member…"
            title="Select Staff"
            loading={loadingStaff}
            groups={Object.keys(staffGroups).length > 0 ? staffGroups : undefined}
            renderLabel={(email) => nameToEmail[email] ? `${nameToEmail[email]} (${email})` : email}
          />
          {errors.staff ? <Text style={KStyles.formError}>{errors.staff}</Text> : null}
        </Field>

        {/* ── Pay Details ─────────────────────────────────────────── */}
        <Text style={KStyles.formSection}>Pay Details</Text>

        <Field label={isEdit ? 'Receipt No' : 'Receipt No (auto)'}>
          <InputField
            value={recptNo}
            onChangeText={setRecptNo}
            placeholder="Auto-generated"
            editable={false}
          />
        </Field>

        <Field label="Pay Month" required>
          <FormMonthPicker value={payMonth} onChange={setPayMonth} />
          {errors.payMonth ? <Text style={KStyles.formError}>{errors.payMonth}</Text> : null}
        </Field>

        <Field label="Amount (₹)" required>
          <InputField
            value={amount}
            onChangeText={setAmount}
            placeholder="e.g. 25000"
            keyboardType="numeric"
            editable
          />
          {errors.amount ? <Text style={KStyles.formError}>{errors.amount}</Text> : null}
        </Field>

        <Field label="Pay Date" required>
          <FormDatePicker value={payDate} onChange={setPayDate} format="iso" />
          {errors.payDate ? <Text style={KStyles.formError}>{errors.payDate}</Text> : null}
        </Field>

        <Field label="Pay Mode" required>
          <SingleSelectDropdown
            selected={payMode}
            options={payModeOptions.length > 0 ? payModeOptions : ['Cash', 'Bank Transfer', 'Cheque', 'UPI']}
            onChange={setPayMode}
            placeholder="Select pay mode…"
            title="Pay Mode"
            loading={loadingRefs}
          />
          {errors.payMode ? <Text style={KStyles.formError}>{errors.payMode}</Text> : null}
        </Field>

        {/* ── Remarks ─────────────────────────────────────────────── */}
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

        {/* ── Audit ───────────────────────────────────────────────── */}
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
            : <Text style={KStyles.formSaveBtnText}>{isEdit ? 'Save Changes' : 'Add Pay Record'}</Text>}
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
        title="Delete Pay Record"
        message="Are you sure you want to delete this pay record? This cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={() => { setDeleteDialogVisible(false); confirmDelete(); }}
        onCancel={() => setDeleteDialogVisible(false)}
      />
    </KeyboardAvoidingView>
  );
}
