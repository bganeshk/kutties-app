import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, Switch,
  TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { v4 as uuidv4 } from 'uuid';
import { Colors, KStyles } from '../../styles/kutties-styles';
import { enquiryRepository } from '../../db/repositories';
import { syncSheet } from '../../sync/sync.service';
import { SHEETS } from '../../utils/constants';
import type { EnquiryModel } from '../../db/models/enquiry.model';
import Snackbar, { useSnackbar } from '../shared/Snackbar';
import ConfirmDialog from '../shared/ConfirmDialog';
import { Field, InputField } from '../shared/FormField';
import FormDatePicker from '../shared/FormDatePicker';

const PRIMARY = Colors.primary;

interface Props {
  navigation: any;
  route: { params: { mode: 'add' | 'edit'; item?: EnquiryModel } };
}

export default function EnquiryForm({ navigation, route }: Props) {
  const { mode, item } = route.params;
  const isEdit = mode === 'edit';

  const [enqDate,        setEnqDate]        = useState(item?.enqDate ?? '');
  const [classDivision,  setClassDivision]  = useState(item?.classDivision ?? '');
  const [studentName,    setStudentName]    = useState(item?.studentName ?? '');
  const [emailId,        setEmailId]        = useState(item?.emailId ?? '');
  const [address,        setAddress]        = useState(item?.address ?? '');
  const [whatsApp,       setWhatsApp]       = useState(item?.whatsApp ?? '');
  const [whatsAppSend,   setWhatsAppSend]   = useState(item?.whatsAppSend ?? false);
  const [admissionTaken, setAdmissionTaken] = useState(item?.admissionTaken ?? false);
  const [mailed,         setMailed]         = useState(item?.mailed ?? false);
  const [saving,         setSaving]         = useState(false);
  const [errors,         setErrors]         = useState<Record<string, string>>({});
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const snackbar = useSnackbar();

  const validate = useCallback((): boolean => {
    const errs: Record<string, string> = {};
    if (!studentName.trim()) errs.studentName = 'Student name is required';
    if (!enqDate.trim())     errs.enqDate     = 'Enquiry date is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [studentName, enqDate]);

  const handleSave = useCallback(async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const entry: EnquiryModel = {
        id:             isEdit ? item!.id : uuidv4(),
        enqDate:        enqDate.trim(),
        classDivision:  classDivision.trim(),
        studentName:    studentName.trim(),
        emailId:        emailId.trim(),
        address:        address.trim(),
        whatsApp:       whatsApp.trim(),
        whatsAppSend,
        admissionTaken,
        mailed,
        revision:       item?.revision ?? null,
        lastmodified:   new Date().toISOString(),
      };
      await enquiryRepository.save(entry);
      syncSheet(SHEETS.ENQUIRIES).catch(() => {});
      snackbar.show(isEdit ? 'Changes saved' : 'Enquiry added', 'success');
      navigation.goBack();
    } catch (e) {
      snackbar.show(`Save failed: ${(e as Error).message}`, 'error');
    } finally {
      setSaving(false);
    }
  }, [validate, isEdit, item, enqDate, classDivision, studentName, emailId, address, whatsApp, whatsAppSend, admissionTaken, mailed, navigation, snackbar]);

  const confirmDelete = useCallback(() => {
    setSaving(true);
    enquiryRepository.delete(item!.id)
      .then(() => {
        syncSheet(SHEETS.ENQUIRIES).catch(() => {});
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
          {mode === 'add' ? 'Add Enquiry' : 'Edit Enquiry'}
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

        <Text style={KStyles.formSection}>Enquiry Details</Text>

        <Field label="Student Name" required>
          <InputField
            value={studentName}
            onChangeText={setStudentName}
            placeholder="Enter student name"
            editable
          />
          {errors.studentName ? <Text style={KStyles.formError}>{errors.studentName}</Text> : null}
        </Field>

        <Field label="Enquiry Date" required>
          <FormDatePicker value={enqDate} onChange={setEnqDate} />
          {errors.enqDate ? <Text style={KStyles.formError}>{errors.enqDate}</Text> : null}
        </Field>

        <Field label="Class / Division">
          <InputField
            value={classDivision}
            onChangeText={setClassDivision}
            placeholder="e.g. LKG-A"
            editable
          />
        </Field>

        <Field label="WhatsApp">
          <InputField
            value={whatsApp}
            onChangeText={setWhatsApp}
            placeholder="WhatsApp number"
            keyboardType="phone-pad"
            editable
          />
        </Field>

        <Field label="Email">
          <InputField
            value={emailId}
            onChangeText={setEmailId}
            placeholder="Email address"
            keyboardType="email-address"
            autoCapitalize="none"
            editable
          />
        </Field>

        <Field label="Address">
          <InputField
            value={address}
            onChangeText={setAddress}
            placeholder="Address"
            multiline
            editable
          />
        </Field>

        <Text style={KStyles.formSection}>Status</Text>

        <Field label="WhatsApp Sent">
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>{whatsAppSend ? 'Yes' : 'No'}</Text>
            <Switch
              value={whatsAppSend}
              onValueChange={setWhatsAppSend}
              trackColor={{ true: PRIMARY }}
              thumbColor={whatsAppSend ? PRIMARY : '#ccc'}
            />
          </View>
        </Field>

        <Field label="Mailed">
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>{mailed ? 'Yes' : 'No'}</Text>
            <Switch
              value={mailed}
              onValueChange={setMailed}
              trackColor={{ true: PRIMARY }}
              thumbColor={mailed ? PRIMARY : '#ccc'}
            />
          </View>
        </Field>

        <Field label="Admission Taken">
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>{admissionTaken ? 'Yes' : 'No'}</Text>
            <Switch
              value={admissionTaken}
              onValueChange={setAdmissionTaken}
              trackColor={{ true: PRIMARY }}
              thumbColor={admissionTaken ? PRIMARY : '#ccc'}
            />
          </View>
        </Field>

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
            : <Text style={KStyles.formSaveBtnText}>{isEdit ? 'Save Changes' : 'Add Enquiry'}</Text>}
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
        title="Delete Enquiry"
        message={`Are you sure you want to delete the enquiry for "${item?.studentName ?? ''}"? This cannot be undone.`}
        confirmLabel="Delete"
        destructive
        onConfirm={() => { setDeleteDialogVisible(false); confirmDelete(); }}
        onCancel={() => setDeleteDialogVisible(false)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  switchLabel: { fontSize: 14, color: '#555' },
});
