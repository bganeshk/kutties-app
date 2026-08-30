import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, ScrollView,
  TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView,
  Platform, Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { v4 as uuidv4 } from 'uuid';
import { Colors, KStyles } from '../../styles/kutties-styles';
import { employeeRepository, getRefOptions, ensureReftbl } from '../../db/repositories';
import { syncSheet } from '../../sync/sync.service';
import { SHEETS } from '../../utils/constants';
import type { EmployeeModel } from '../../db/models/employee.model';
import Snackbar, { useSnackbar } from '../shared/Snackbar';
import AuditRow from '../shared/AuditRow';
import PhotoPicker from '../shared/PhotoPicker';
import SingleSelectDropdown from '../shared/SingleSelectDropdown';
import ConfirmDialog from '../shared/ConfirmDialog';
import FormDatePicker from '../shared/FormDatePicker';
import { Field, InputField } from '../shared/FormField';

const PRIMARY = Colors.primary;

interface Props {
  navigation: any;
  route: { params: { mode: 'add' | 'edit'; item?: EmployeeModel } };
}

export default function EmployeeForm({ navigation, route }: Props) {
  const { mode, item } = route.params;
  const isRecordEdit = mode === 'edit';

  // ── Form state ─────────────────────────────────────────────────────────────
  const [name, setName]               = useState(item?.name ?? '');
  const [designation, setDesignation] = useState(item?.designation ?? '');
  const [department, setDepartment]   = useState(item?.department ?? '');
  const [email, setEmail]             = useState(item?.email ?? '');
  const [phone, setPhone]             = useState(item?.phone ?? '');
  const [address, setAddress]         = useState(item?.address ?? '');
  const [joiningDate, setJoiningDate] = useState(item?.joiningDate ?? '');
  const [idphoto, setIdphoto]         = useState(item?.idphoto ?? '');
  const [isActive, setIsActive]       = useState((item?.status ?? 'active') === 'active');
  const [saving, setSaving]           = useState(false);
  const [errors, setErrors]           = useState<Record<string, string>>({});
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const snackbar = useSnackbar();

  // ── Reference options from reftbl ─────────────────────────────────────────
  const [deptOptions, setDeptOptions]   = useState<string[]>([]);
  const [desigOptions, setDesigOptions] = useState<string[]>([]);
  const [loadingRefs, setLoadingRefs]   = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await ensureReftbl();
      const [depts, desigs] = await Promise.all([
        getRefOptions('DeptRef'),
        getRefOptions('DesigRef'),
      ]);
      if (!cancelled) {
        setDeptOptions(depts);
        setDesigOptions(desigs);
        setLoadingRefs(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ── Validation ─────────────────────────────────────────────────────────────
  const validate = useCallback(async (): Promise<boolean> => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'Name is required';
    if (!designation.trim()) errs.designation = 'Designation is required';
    if (!department.trim()) errs.department = 'Department is required';

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      errs.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      errs.email = 'Enter a valid email';
    } else {
      const emailChanged = trimmedEmail.toLowerCase() !== (item?.email ?? '').trim().toLowerCase();
      if (!isRecordEdit || emailChanged) {
        const currentId = isRecordEdit ? item!.id : '';
        const allEmployees = await employeeRepository.findAll();
        const dup = allEmployees.find(
          (e) => e.email?.toLowerCase() === trimmedEmail.toLowerCase() && e.id !== currentId,
        );
        if (dup) {
          errs.email = `Email already used by "${dup.name ?? dup.id}"`;
        }
      }
    }

    const trimmedPhone = phone.trim();
    if (!trimmedPhone) {
      errs.phone = 'Phone number is required';
    } else if (!/^[+\d\s\-()]{7,15}$/.test(trimmedPhone)) {
      errs.phone = 'Enter a valid phone number';
    }

    if (!address.trim()) errs.address = 'Address is required';

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [name, designation, department, email, phone, address, isRecordEdit, item]);

  // ── Save ───────────────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!(await validate())) return;
    setSaving(true);
    try {
      const newId = isRecordEdit ? item!.id : uuidv4();
      const employee: EmployeeModel = {
        id:          newId,
        name:        name.trim() || undefined,
        designation: designation.trim() || undefined,
        department:  department.trim() || undefined,
        email:       email.trim() || undefined,
        phone:       phone.trim() || undefined,
        address:     address.trim() || undefined,
        joiningDate: joiningDate.trim() || undefined,
        idphoto:     idphoto || undefined,
        status:      isActive ? 'active' : 'inactive',
      };

      await employeeRepository.save(employee);

      syncSheet(SHEETS.STAFF).catch(() => {/* silent */});

      snackbar.show(isRecordEdit ? 'Changes saved' : 'Employee added', 'success');
      navigation.goBack();
    } catch (e) {
      snackbar.show(`Save failed: ${(e as Error).message}`, 'error');
    } finally {
      setSaving(false);
    }
  }, [validate, isRecordEdit, item, name, designation, department, email, phone, address, joiningDate, idphoto, isActive, navigation, snackbar]);

  const confirmDelete = useCallback(() => {
    setSaving(true);
    employeeRepository.delete(item!.id)
      .then(() => {
        syncSheet(SHEETS.STAFF).catch(() => {});
        navigation.goBack();
      })
      .catch((e: Error) => {
        setSaving(false);
        snackbar.show(`Delete failed: ${e.message}`, 'error');
      });
  }, [item, navigation, snackbar]);

  const handleDelete = useCallback(() => {
    if (!item) {
      snackbar.show('No employee selected', 'error');
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
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={KStyles.headerTitle}>
          {mode === 'add' ? 'Add Employee' : 'Edit Employee'}
        </Text>
        <View style={KStyles.headerActions}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={KStyles.headerIcon}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close-outline" size={24} color="#fff" />
          </TouchableOpacity>
          {isRecordEdit && (
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

        {/* ── Personal ──────────────────────────────────────────────────────── */}
        <Text style={KStyles.formSection}>Personal</Text>

        <Field label="Full Name" required>
          <InputField
            value={name}
            onChangeText={setName}
            placeholder="e.g. Rahul Mehta"
            autoCapitalize="words"
            editable={true}
          />
          {errors.name ? <Text style={KStyles.formError}>{errors.name}</Text> : null}
        </Field>

        <Field label="Designation" required>
          <SingleSelectDropdown
            selected={designation}
            options={desigOptions}
            onChange={setDesignation}
            placeholder="Select designation…"
            title="Select Designation"
            loading={loadingRefs}
          />
          {errors.designation ? <Text style={KStyles.formError}>{errors.designation}</Text> : null}
        </Field>

        <Field label="Department" required>
          <SingleSelectDropdown
            selected={department}
            options={deptOptions}
            onChange={setDepartment}
            placeholder="Select department…"
            title="Select Department"
            loading={loadingRefs}
          />
          {errors.department ? <Text style={KStyles.formError}>{errors.department}</Text> : null}
        </Field>

        <Field label="Email" required>
          <InputField
            value={email}
            onChangeText={setEmail}
            placeholder="e.g. rahul@school.com"
            keyboardType="email-address"
            autoCapitalize="none"
            editable={true}
          />
          {errors.email ? <Text style={KStyles.formError}>{errors.email}</Text> : null}
        </Field>

        <Field label="Phone" required>
          <InputField
            value={phone}
            onChangeText={setPhone}
            placeholder="e.g. +91 98765 43210"
            keyboardType="phone-pad"
            autoCapitalize="none"
            editable={true}
          />
          {errors.phone ? <Text style={KStyles.formError}>{errors.phone}</Text> : null}
        </Field>

        <Field label="Address" required>
          <InputField
            value={address}
            onChangeText={setAddress}
            placeholder="Street, city…"
            multiline
            editable={true}
          />
          {errors.address ? <Text style={KStyles.formError}>{errors.address}</Text> : null}
        </Field>

        {/* ── ID Photo ──────────────────────────────────────────────────────── */}
        <Text style={KStyles.formSection}>ID Photo</Text>

        <Field label="Photo">
          <PhotoPicker uri={idphoto} onChange={setIdphoto} editable={true} />
        </Field>

        {/* ── Employment ────────────────────────────────────────────────────── */}
        <Text style={KStyles.formSection}>Employment</Text>

        <Field label="Joining Date">
          <FormDatePicker value={joiningDate} onChange={setJoiningDate} format="iso" />
        </Field>

        {/* ── Status ────────────────────────────────────────────────────────── */}
        <Text style={KStyles.formSection}>Status</Text>

        <View style={KStyles.formStatusRow}>
          <View style={KStyles.formStatusLeft}>
            <Text style={KStyles.formStatusLabel}>{isActive ? 'Active' : 'Inactive'}</Text>
            <Text style={KStyles.formStatusSub}>
              {isActive ? 'Employee will appear in the active list' : 'Employee will be archived'}
            </Text>
          </View>
          <Switch
            value={isActive}
            onValueChange={setIsActive}
            disabled={false}
            trackColor={{ false: '#ccc', true: Colors.lightPink }}
            thumbColor={isActive ? PRIMARY : '#f4f3f4'}
          />
        </View>

        {/* ── Audit ─────────────────────────────────────────────────────────── */}
        {isRecordEdit && item?.lastmodified && (
          <>
            <Text style={KStyles.formSection}>Audit</Text>
            <View style={KStyles.formAuditCard}>
              <AuditRow label="Last modified" value={item.lastmodified} />
            </View>
          </>
        )}

        {/* spacer so save button is above keyboard */}
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
            : <Text style={KStyles.formSaveBtnText}>{isRecordEdit ? 'Save Changes' : 'Add Employee'}</Text>}
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
        title="Delete Employee"
        message={`Are you sure you want to delete "${item?.name ?? 'this employee'}"? This cannot be undone.`}
        confirmLabel="Delete"
        destructive
        onConfirm={() => { setDeleteDialogVisible(false); confirmDelete(); }}
        onCancel={() => setDeleteDialogVisible(false)}
      />
    </KeyboardAvoidingView>
  );
}

