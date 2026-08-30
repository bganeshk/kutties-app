import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, ScrollView, Switch,
  TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { v4 as uuidv4 } from 'uuid';
import { Colors, KStyles } from '../../styles/kutties-styles';
import { SHEETS } from '../../utils/constants';
import { teacherAttendanceLogRepository, teacherRepository, employeeRepository, getRefOptions, ensureReftbl } from '../../db/repositories';
import { syncSheet } from '../../sync/sync.service';
import type { TeacherAttendanceLogModel } from '../../db/models/teacherattendancelog.model';
import Snackbar, { useSnackbar } from '../shared/Snackbar';
import AuditRow from '../shared/AuditRow';
import ConfirmDialog from '../shared/ConfirmDialog';
import FormDatePicker from '../shared/FormDatePicker';
import { Field, InputField } from '../shared/FormField';
import SingleSelectDropdown from '../shared/SingleSelectDropdown';

interface Props {
  navigation: any;
  route: { params: { mode: 'add' | 'edit'; item?: TeacherAttendanceLogModel; staffMode?: boolean } };
}

export default function TeacherAttendanceLogForm({ navigation, route }: Props) {
  const { mode, item, staffMode = false } = route.params;
  const isEdit = mode === 'edit';
  const personLabel = staffMode ? 'Employee' : 'Teacher';

  // ── Form state ─────────────────────────────────────────────────────────────
  const [teacherEmail,   setTeacherEmail]   = useState(item?.teacherEmail   ?? '');
  const [attendanceDate, setAttendanceDate] = useState(item?.attendanceDate ?? '');
  const [leaveOption,    setLeaveOption]    = useState(item?.leaveOption    ?? 'Present');
  const [leaveType,      setLeaveType]      = useState(item?.leaveType      ?? '');
  const [approved, setApproved] = useState(
    item?.approved === 'true' || item?.approved === '1',
  );
  const [checkIn,        setCheckIn]        = useState(item?.checkIn        ?? '');
  const [checkOut,       setCheckOut]       = useState(item?.checkOut       ?? '');
  const [remarks,        setRemarks]        = useState(item?.remarks        ?? '');

  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const snackbar = useSnackbar();

  // ── Teacher options ────────────────────────────────────────────────────────
  const [teacherOptions, setTeacherOptions] = useState<string[]>([]);
  const [loadingTeachers, setLoadingTeachers] = useState(true);

  // ── Leave type options (from reftbl leaveref) ──────────────────────────────
  const [leaveTypeOptions, setLeaveTypeOptions] = useState<string[]>([]);
  const [loadingLeaveTypes, setLoadingLeaveTypes] = useState(true);

  // emailToName maps email → display name for rendering selected value
  const [emailToName, setEmailToName] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const repo = staffMode ? employeeRepository : teacherRepository;
      let rows = await repo.findAll();
      if (rows.length === 0) {
        await syncSheet(SHEETS.STAFF);
        rows = await repo.findAll();
      }
      if (!cancelled) {
        // Options are emails; display label is "Name (email)"
        const map: Record<string, string> = {};
        rows.forEach((t) => { if (t.email) map[t.email] = t.name ?? t.email; });
        setEmailToName(map);
        setTeacherOptions(
          rows
            .filter((t) => t.email)
            .map((t) => t.email!)
            .sort(),
        );
        setLoadingTeachers(false);
      }
    })();
    return () => { cancelled = true; };
  }, [staffMode]);

  // ── Load leave types from reftbl ───────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      await ensureReftbl();
      const options = await getRefOptions('leaveref');
      if (!cancelled) {
        setLeaveTypeOptions(options);
        setLoadingLeaveTypes(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ── When leave type changes: if a type is chosen leaveOption must not be
  //    'Present', so default it to 'Full Day' when it was 'Present'.
  //    If leave type is cleared, reset leaveOption back to 'Present'.
  const handleLeaveTypeChange = useCallback((value: string) => {
    setLeaveType(value);
    if (!value) {
      setLeaveOption('Present');
    } else if (leaveOption === 'Present') {
      setLeaveOption('Full Day');
      setCheckIn('9:00:00 AM');
      setCheckOut('7:00:00 PM');
    }
  }, [leaveOption]);

  // ── When leaveOption changes: auto-fill check-in/out for Full Day,
  //    clear leave type when set back to 'Present' ─────────────────────────
  const handleLeaveOptionChange = useCallback((value: string) => {
    setLeaveOption(value);
    if (value === 'Present') {
      setLeaveType('');
    }
    if (value === 'Full Day') {
      setCheckIn('9:00:00 AM');
      setCheckOut('7:00:00 PM');
    }
  }, []);

  // ── Validation ─────────────────────────────────────────────────────────────
  const validate = useCallback((): boolean => {
    const errs: Record<string, string> = {};
    if (!teacherEmail.trim())   errs.teacherEmail   = `${personLabel} is required`;
    if (!attendanceDate.trim()) errs.attendanceDate = 'Date is required';
    if (!leaveOption.trim())    errs.leaveOption    = 'Leave option is required';
    if (!checkIn.trim())        errs.checkIn        = 'Check-in time is required';
    if (!checkOut.trim())       errs.checkOut       = 'Check-out time is required';
    if (leaveType && leaveOption === 'Present') {
      errs.leaveOption = 'Select Half Day or Full Day when a leave type is chosen';
    }
    if (leaveOption !== 'Present' && !leaveType) {
      errs.leaveType = 'Leave type is required when not Present';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [teacherEmail, attendanceDate, leaveOption, leaveType, checkIn, checkOut]);

  // ── Save ───────────────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const entry: TeacherAttendanceLogModel = {
        id:             isEdit ? item!.id : uuidv4(),
        teacherEmail:   teacherEmail.trim()   || undefined,
        attendanceDate: attendanceDate.trim() || undefined,
        leaveOption:    leaveOption           || undefined,
        leaveType:      leaveOption !== 'Present' ? (leaveType || undefined) : undefined,
        approved:       approved ? 'true' : 'false',
        checkIn:        checkIn.trim()        || undefined,
        checkOut:       checkOut.trim()       || undefined,
        remarks:        remarks.trim()        || undefined,
      };
      await teacherAttendanceLogRepository.save(entry);
      syncSheet(SHEETS.TEACATTELOG).catch(() => {});
      snackbar.show(isEdit ? 'Changes saved' : 'Attendance recorded', 'success');
      navigation.goBack();
    } catch (e) {
      snackbar.show(`Save failed: ${(e as Error).message}`, 'error');
    } finally {
      setSaving(false);
    }
  }, [validate, isEdit, item, teacherEmail, attendanceDate, leaveOption, leaveType, approved, checkIn, checkOut, remarks, navigation, snackbar]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Delete ─────────────────────────────────────────────────────────────────
  const confirmDelete = useCallback(() => {
    setSaving(true);
    teacherAttendanceLogRepository.delete(item!.id)
      .then(() => {
        syncSheet(SHEETS.TEACATTELOG).catch(() => {});
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
          {mode === 'add' ? 'Mark Attendance' : 'Edit Attendance'}
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

        {/* ── Person (Teacher / Employee) ───────────────────────────────────── */}
        <Text style={KStyles.formSection}>{personLabel}</Text>

        <Field label={personLabel} required>
          <SingleSelectDropdown
            selected={teacherEmail}
            options={teacherOptions}
            onChange={setTeacherEmail}
            placeholder={`Select ${staffMode ? 'an employee' : 'a teacher'}…`}
            title={`Select ${personLabel}`}
            loading={loadingTeachers}
            renderLabel={(email) => emailToName[email] ? `${emailToName[email]} (${email})` : email}
          />
          {errors.teacherEmail ? <Text style={KStyles.formError}>{errors.teacherEmail}</Text> : null}
        </Field>

        {/* ── Attendance ───────────────────────────────────────────────────── */}
        <Text style={KStyles.formSection}>Attendance</Text>

        <Field label="Date" required>
          <FormDatePicker value={attendanceDate} onChange={setAttendanceDate} format="iso" />
          {errors.attendanceDate ? <Text style={KStyles.formError}>{errors.attendanceDate}</Text> : null}
        </Field>

        <Field label="Leave Option" required>
          <SingleSelectDropdown
            selected={leaveOption}
            options={['Present', 'Half Day', 'Full Day']}
            onChange={handleLeaveOptionChange}
            placeholder="Select…"
            title="Leave Option"
          />
          {errors.leaveOption ? <Text style={KStyles.formError}>{errors.leaveOption}</Text> : null}
        </Field>

        {leaveOption !== 'Present' && (
          <Field label="Leave Type" required>
            <SingleSelectDropdown
              selected={leaveType}
              options={leaveTypeOptions}
              onChange={handleLeaveTypeChange}
              placeholder="Select leave type…"
              title="Leave Type"
              loading={loadingLeaveTypes}
            />
            {errors.leaveType ? <Text style={KStyles.formError}>{errors.leaveType}</Text> : null}
          </Field>
        )}

        <Field label="Check-in Time" required>
          <InputField
            value={checkIn}
            onChangeText={setCheckIn}
            placeholder="e.g. 9:00:00 AM"
            editable
          />
          {errors.checkIn ? <Text style={KStyles.formError}>{errors.checkIn}</Text> : null}
        </Field>

        <Field label="Check-out Time" required>
          <InputField
            value={checkOut}
            onChangeText={setCheckOut}
            placeholder="e.g. 7:00:00 PM"
            editable
          />
          {errors.checkOut ? <Text style={KStyles.formError}>{errors.checkOut}</Text> : null}
        </Field>

        <Field label="Approved">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 }}>
            <Switch
              value={approved}
              onValueChange={setApproved}
              trackColor={{ false: Colors.border, true: Colors.primary }}
              thumbColor="#fff"
            />
            <Text style={{ fontSize: 14, color: approved ? Colors.primary : Colors.muted, fontWeight: '600' }}>
              {approved ? 'Approved' : 'Not Approved'}
            </Text>
          </View>
        </Field>

        {/* ── Notes ────────────────────────────────────────────────────────── */}
        <Text style={KStyles.formSection}>Notes</Text>

        <Field label="Remarks">
          <InputField
            value={remarks}
            onChangeText={setRemarks}
            placeholder="Any additional notes…"
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
            : <Text style={KStyles.formSaveBtnText}>{isEdit ? 'Save Changes' : 'Save Attendance'}</Text>}
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
        title="Delete Attendance Record"
        message="Are you sure you want to delete this attendance record? This cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={() => { setDeleteDialogVisible(false); confirmDelete(); }}
        onCancel={() => setDeleteDialogVisible(false)}
      />
    </KeyboardAvoidingView>
  );
}
