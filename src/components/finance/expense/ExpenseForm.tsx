import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, ScrollView,
  TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { v4 as uuidv4 } from 'uuid';
import { Colors, KStyles } from '../../../styles/kutties-styles';
import { SHEETS } from '../../../utils/constants';
import { expenseRepository, getRefOptions, ensureReftbl } from '../../../db/repositories';
import { syncSheet } from '../../../sync/sync.service';
import type { ExpenseModel } from '../../../db/models/expense.model';
import Snackbar, { useSnackbar } from '../../shared/Snackbar';
import AuditRow from '../../shared/AuditRow';
import ConfirmDialog from '../../shared/ConfirmDialog';
import FormDatePicker from '../../shared/FormDatePicker';
import { Field, InputField } from '../../shared/FormField';
import SingleSelectDropdown from '../../shared/SingleSelectDropdown';

const FALLBACK_EXPENSE_TYPES = ['Stationery', 'Utilities', 'Maintenance', 'Transport', 'Salary', 'Other'];
const FALLBACK_PAYMENT_MODES = ['Cash', 'Bank Transfer', 'Cheque', 'UPI'];

interface Props {
  navigation: any;
  route: {
    params: {
      mode: 'add' | 'edit';
      item?: ExpenseModel;
    };
  };
}

export default function ExpenseForm({ navigation, route }: Props) {
  const { mode, item } = route.params;
  const isEdit = mode === 'edit';

  // ── Form state ──────────────────────────────────────────────────────────────
  const [recptNo,      setRecptNo]      = useState(item?.recptNo      ?? '');
  const [expenseDate,  setExpenseDate]  = useState(item?.expenseDate  ?? (isEdit ? '' : new Date().toISOString().slice(0, 10)));
  const [expenseType,  setExpenseType]  = useState(item?.expenseType  ?? '');
  const [paymentMode,  setPaymentMode]  = useState(item?.paymentMode  ?? '');
  const [amount,       setAmount]       = useState(item?.amount?.toString() ?? '');
  const [paidTo,       setPaidTo]       = useState(item?.paidTo       ?? '');
  const [description,  setDescription]  = useState(item?.description  ?? '');
  const [remarks,      setRemarks]      = useState(item?.remarks      ?? '');

  const [saving,  setSaving]  = useState(false);
  const [errors,  setErrors]  = useState<Record<string, string>>({});
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const snackbar = useSnackbar();

  // ── Reference data ─────────────────────────────────────────────────────────
  const [expenseTypeOptions, setExpenseTypeOptions] = useState<string[]>([]);
  const [paymentModeOptions, setPaymentModeOptions] = useState<string[]>([]);
  const [loadingRefs,        setLoadingRefs]        = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await ensureReftbl();
      const [etOpts, pmOpts] = await Promise.all([
        getRefOptions('expref'),
        getRefOptions('paymentmethod'),
      ]);
      if (!cancelled) {
        setExpenseTypeOptions(etOpts);
        setPaymentModeOptions(pmOpts);
        setLoadingRefs(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ── Validation ───────────────────────────────────────────────────────────────
  const validate = useCallback((): boolean => {
    const errs: Record<string, string> = {};
    if (!expenseDate.trim())  errs.expenseDate  = 'Expense date is required';
    if (!expenseType.trim())  errs.expenseType  = 'Expense type is required';
    if (!paymentMode.trim())  errs.paymentMode  = 'Payment mode is required';
    if (!amount.trim() || isNaN(Number(amount)) || Number(amount) <= 0) {
      errs.amount = 'A valid positive amount is required';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [expenseDate, expenseType, paymentMode, amount]);

  // ── Save ─────────────────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const entry: ExpenseModel = {
        id:          isEdit ? item!.id : uuidv4(),
        recptNo:     recptNo.trim() || undefined,
        expenseDate: expenseDate.trim()  || undefined,
        expenseType: expenseType         || undefined,
        paymentMode: paymentMode         || undefined,
        amount:      amount.trim()       ? Number(amount.trim()) : undefined,
        paidTo:      paidTo.trim()       || undefined,
        description: description.trim()  || undefined,
        remarks:     remarks.trim()      || undefined,
      };
      await expenseRepository.save(entry);
      syncSheet(SHEETS.EXPENSE).catch(() => {});
      snackbar.show(isEdit ? 'Changes saved' : 'Expense added', 'success');
      navigation.goBack();
    } catch (e) {
      snackbar.show(`Save failed: ${(e as Error).message}`, 'error');
    } finally {
      setSaving(false);
    }
  }, [validate, isEdit, item, recptNo, expenseDate, expenseType, paymentMode, amount, paidTo, description, remarks, navigation, snackbar]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Delete ───────────────────────────────────────────────────────────────────
  const confirmDelete = useCallback(() => {
    setSaving(true);
    expenseRepository.delete(item!.id)
      .then(() => {
        syncSheet(SHEETS.EXPENSE).catch(() => {});
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
          {isEdit ? 'Edit Expense' : 'Add Expense'}
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

        {/* ── Expense Details ─────────────────────────────────────────── */}
        <Text style={KStyles.formSection}>Expense Details</Text>

        <Field label="Receipt No">
          <InputField
            value={recptNo}
            onChangeText={setRecptNo}
            placeholder="e.g. EXP-001"
            editable
          />
        </Field>

        <Field label="Expense Date" required>
          <FormDatePicker value={expenseDate} onChange={setExpenseDate} format="iso" />
          {errors.expenseDate ? <Text style={KStyles.formError}>{errors.expenseDate}</Text> : null}
        </Field>

        <Field label="Expense Type" required>
          <SingleSelectDropdown
            selected={expenseType}
            options={expenseTypeOptions.length > 0 ? expenseTypeOptions : FALLBACK_EXPENSE_TYPES}
            onChange={setExpenseType}
            placeholder="Select expense type…"
            title="Expense Type"
            loading={loadingRefs}
          />
          {errors.expenseType ? <Text style={KStyles.formError}>{errors.expenseType}</Text> : null}
        </Field>

        <Field label="Payment Mode" required>
          <SingleSelectDropdown
            selected={paymentMode}
            options={paymentModeOptions.length > 0 ? paymentModeOptions : FALLBACK_PAYMENT_MODES}
            onChange={setPaymentMode}
            placeholder="Select payment mode…"
            title="Payment Mode"
            loading={loadingRefs}
          />
          {errors.paymentMode ? <Text style={KStyles.formError}>{errors.paymentMode}</Text> : null}
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

        <Field label="Paid To">
          <InputField
            value={paidTo}
            onChangeText={setPaidTo}
            placeholder="Vendor / payee name"
            editable
          />
        </Field>

        {/* ── Description ─────────────────────────────────────────────── */}
        <Text style={KStyles.formSection}>Description</Text>

        <Field label="Description">
          <InputField
            value={description}
            onChangeText={setDescription}
            placeholder="Additional detail…"
            multiline
            editable
          />
        </Field>

        {/* ── Remarks ─────────────────────────────────────────────────── */}
        <Text style={KStyles.formSection}>Remarks</Text>

        <Field label="Remarks">
          <InputField
            value={remarks}
            onChangeText={setRemarks}
            placeholder="Any additional notes…"
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
            : <Text style={KStyles.formSaveBtnText}>{isEdit ? 'Save Changes' : 'Add Expense'}</Text>}
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
        title="Delete Expense"
        message="Are you sure you want to delete this expense record? This cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={() => { setDeleteDialogVisible(false); confirmDelete(); }}
        onCancel={() => setDeleteDialogVisible(false)}
      />
    </KeyboardAvoidingView>
  );
}
