import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View, Text, ScrollView, Switch,
  TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { v4 as uuidv4 } from 'uuid';
import { Colors, KStyles } from '../../../styles/kutties-styles';
import { SHEETS } from '../../../utils/constants';
import { formatDMYDate } from '../../../utils/dateUtils';
import {
  studentAttendanceLogRepository,
  studentRepository,
  getRefOptions,
  ensureReftbl,
} from '../../../db/repositories';
import { syncSheet, twoWeeksAgo } from '../../../sync/sync.service';
import type { StudentAttendanceLogModel } from '../../../db/models/studentattendancelog.model';
import Snackbar, { useSnackbar } from '../../shared/Snackbar';
import AuditRow from '../../shared/AuditRow';
import ConfirmDialog from '../../shared/ConfirmDialog';
import FormDatePicker from '../../shared/FormDatePicker';
import { Field, InputField } from '../../shared/FormField';
import SingleSelectDropdown from '../../shared/SingleSelectDropdown';

const PRIMARY = Colors.primary;

interface Props {
  navigation: any;
  route: {
    params: {
      mode: 'add' | 'edit';
      item?: StudentAttendanceLogModel;
      prefilledRegNumber?: string;
    };
  };
}

export default function StudentAttendanceLogForm({ navigation, route }: Props) {
  const { mode, item, prefilledRegNumber } = route.params;
  const isEdit = mode === 'edit';

  // ── Form state ─────────────────────────────────────────────────────────────
  const [regNumber,       setRegNumber]       = useState(item?.regNumber       ?? prefilledRegNumber ?? '');
  const todayDMY = useMemo(() => formatDMYDate(new Date()), []);
  const [attendanceDate,  setAttendanceDate]  = useState(item?.attendanceDate  ?? todayDMY);
  const [leaveOption,     setLeaveOption]     = useState(item?.leaveOption     ?? 'Present');
  const [leaveType,       setLeaveType]       = useState(item?.leaveType       ?? '');
  const [checkIn,         setCheckIn]         = useState(item?.checkIn         ?? '09:00 AM');
  const [checkOut,        setCheckOut]        = useState(item?.checkOut        ?? '03:00 PM');
  const [accompaniedBy,   setAccompaniedBy]   = useState(item?.accompaniedBy   ?? '');
  const [markedBy,        setMarkedBy]        = useState(item?.markedBy        ?? '');
  const [remarks,         setRemarks]         = useState(item?.remarks         ?? '');
  const [approved, setApproved] = useState(
    item?.approved === 'true' || item?.approved === '1',
  );

  const [saving,              setSaving]              = useState(false);
  const [errors,              setErrors]              = useState<Record<string, string>>({});
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const snackbar = useSnackbar();

  // ── Student options ────────────────────────────────────────────────────────
  const [studentOptions,   setStudentOptions]   = useState<string[]>([]);
  const [regToName,        setRegToName]        = useState<Record<string, string>>({});
  const [loadingStudents,  setLoadingStudents]  = useState(true);

  // ── Leave type options ─────────────────────────────────────────────────────
  const [leaveTypeOptions,   setLeaveTypeOptions]   = useState<string[]>([]);
  const [loadingLeaveTypes,  setLoadingLeaveTypes]  = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let rows = await studentRepository.findAll();
      if (rows.length === 0) {
        await syncSheet(SHEETS.STUDENTS);
        rows = await studentRepository.findAll();
      }
      if (!cancelled) {
        const map: Record<string, string> = {};
        rows.forEach((s) => {
          if (s.regNumber) map[s.regNumber] = s.fullName ?? s.regNumber;
        });
        setRegToName(map);
        setStudentOptions(
          rows
            .filter((s) => s.regNumber && s.status === 'active')
            .map((s) => s.regNumber!)
            .sort(),
        );
        setLoadingStudents(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

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

  // ── Leave option / leave type sync ────────────────────────────────────────
  const handleLeaveTypeChange = useCallback((value: string) => {
    setLeaveType(value);
    if (!value) {
      setLeaveOption('Present');
    } else if (leaveOption === 'Present') {
      setLeaveOption('Full Day');
      setCheckIn('09:00 AM');
      setCheckOut('03:00 PM');
    }
  }, [leaveOption]);

  const handleLeaveOptionChange = useCallback((value: string) => {
    setLeaveOption(value);
    if (value === 'Present') {
      setLeaveType('');
    }
    if (value === 'Full Day') {
      setCheckIn('09:00 AM');
      setCheckOut('03:00 PM');
    }
  }, []);

  // ── Validation ─────────────────────────────────────────────────────────────
  const validate = useCallback((): boolean => {
    const errs: Record<string, string> = {};
    if (!regNumber.trim())       errs.regNumber       = 'Student is required';
    if (!attendanceDate.trim())  errs.attendanceDate  = 'Date is required';
    if (!leaveOption.trim())     errs.leaveOption     = 'Leave option is required';
    if (!checkIn.trim())         errs.checkIn         = 'Check-in time is required';
    if (!checkOut.trim())        errs.checkOut        = 'Check-out time is required';
    if (leaveType && leaveOption === 'Present') {
      errs.leaveOption = 'Select Half Day or Full Day when a leave type is chosen';
    }
    if (leaveOption !== 'Present' && !leaveType) {
      errs.leaveType = 'Leave type is required when not Present';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [regNumber, attendanceDate, leaveOption, leaveType, checkIn, checkOut]);

  // ── Save ───────────────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const entry: StudentAttendanceLogModel = {
        id:             isEdit ? item!.id : uuidv4(),
        regNumber:      regNumber.trim()      || undefined,
        attendanceDate: attendanceDate.trim() || undefined,
        leaveOption:    leaveOption           || undefined,
        leaveType:      leaveOption !== 'Present' ? (leaveType || undefined) : undefined,
        checkIn:        checkIn.trim()        || undefined,
        checkOut:       checkOut.trim()       || undefined,
        accompaniedBy:  accompaniedBy.trim()  || undefined,
        markedBy:       markedBy.trim()       || undefined,
        remarks:        remarks.trim()        || undefined,
        approved:       approved ? 'true' : 'false',
      };
      await studentAttendanceLogRepository.save(entry);
      syncSheet(SHEETS.STUDENT_ATT_LOG, twoWeeksAgo()).catch(() => {});
      snackbar.show(isEdit ? 'Changes saved' : 'Attendance recorded', 'success');
      navigation.goBack();
    } catch (e) {
      snackbar.show(`Save failed: ${(e as Error).message}`, 'error');
    } finally {
      setSaving(false);
    }
  }, [validate, isEdit, item, regNumber, attendanceDate, leaveOption, leaveType, checkIn, checkOut, accompaniedBy, markedBy, remarks, approved, navigation, snackbar]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Delete ─────────────────────────────────────────────────────────────────
  const confirmDelete = useCallback(() => {
    setSaving(true);
    studentAttendanceLogRepository.delete(item!.id)
      .then(() => {
        syncSheet(SHEETS.STUDENT_ATT_LOG, twoWeeksAgo()).catch(() => {});
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
      <View style={[KStyles.header, { backgroundColor: PRIMARY }]}>
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

        {/* ── Student ───────────────────────────────────────────────────── */}
        <Text style={KStyles.formSection}>Student</Text>

        <Field label="Student" required>
          <SingleSelectDropdown
            selected={regNumber}
            options={studentOptions}
            onChange={setRegNumber}
            placeholder="Select a student…"
            title="Select Student"
            loading={loadingStudents}
            renderLabel={(reg) => regToName[reg] ? `${regToName[reg]} (${reg})` : reg}
          />
          {errors.regNumber ? <Text style={KStyles.formError}>{errors.regNumber}</Text> : null}
        </Field>

        {/* ── Attendance ────────────────────────────────────────────────── */}
        <Text style={KStyles.formSection}>Attendance</Text>

        <Field label="Date" required>
          <FormDatePicker value={attendanceDate} onChange={setAttendanceDate} format="dmy" />
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
            placeholder="hh:mm AM/PM"
            editable
          />
          {errors.checkIn ? <Text style={KStyles.formError}>{errors.checkIn}</Text> : null}
        </Field>

        <Field label="Check-out Time" required>
          <InputField
            value={checkOut}
            onChangeText={setCheckOut}
            placeholder="hh:mm AM/PM"
            editable
          />
          {errors.checkOut ? <Text style={KStyles.formError}>{errors.checkOut}</Text> : null}
        </Field>

        {/* ── Details ───────────────────────────────────────────────────── */}
        <Text style={KStyles.formSection}>Details</Text>

        <Field label="Accompanied By">
          <InputField
            value={accompaniedBy}
            onChangeText={setAccompaniedBy}
            placeholder="Parent / guardian name"
            editable
          />
        </Field>

        <Field label="Marked By">
          <InputField
            value={markedBy}
            onChangeText={setMarkedBy}
            placeholder="Staff who marked attendance"
            editable
          />
        </Field>

        <Field label="Approved">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 }}>
            <Switch
              value={approved}
              onValueChange={setApproved}
              trackColor={{ false: Colors.border, true: PRIMARY }}
              thumbColor="#fff"
            />
            <Text style={{ fontSize: 14, color: approved ? PRIMARY : Colors.muted, fontWeight: '600' }}>
              {approved ? 'Approved' : 'Not Approved'}
            </Text>
          </View>
        </Field>

        {/* ── Notes ────────────────────────────────────────────────────── */}
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

        {/* ── Audit ────────────────────────────────────────────────────── */}
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
          style={[KStyles.formSaveBtn, { backgroundColor: PRIMARY }, saving && KStyles.formSaveBtnDisabled]}
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
