import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, Switch,
  TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { v4 as uuidv4 } from 'uuid';
import { Colors, KStyles } from '../../styles/kutties-styles';
import { holidayRepository } from '../../db/repositories';
import { syncSheet } from '../../sync/sync.service';
import { SHEETS } from '../../utils/constants';
import type { HolidayModel, TeachersHoliday } from '../../db/models/holiday.model';
import Snackbar, { useSnackbar } from '../shared/Snackbar';
import ConfirmDialog from '../shared/ConfirmDialog';
import { Field, InputField } from '../shared/FormField';
import FormDatePicker from '../shared/FormDatePicker';

const PRIMARY = Colors.primary;

// Teachers holiday picker options
const TEACHERS_OPTIONS: { label: string; value: TeachersHoliday }[] = [
  { label: 'Yes (Mandatory)', value: 'yes' },
  { label: 'Optional',        value: 'opt' },
  { label: 'No',              value: 'no'  },
];

interface Props {
  navigation: any;
  route: { params: { mode: 'add' | 'edit'; item?: HolidayModel } };
}

export default function HolidayForm({ navigation, route }: Props) {
  const { mode, item } = route.params;
  const isEdit = mode === 'edit';

  // ── Form state ─────────────────────────────────────────────────────────────
  const [description, setDescription] = useState(item?.description ?? '');
  const [date,        setDate]        = useState(item?.date ?? '');
  const [tuition,     setTuition]     = useState(item?.tuition  ?? false);
  const [kg,          setKg]          = useState(item?.kg       ?? false);
  const [daycare,     setDaycare]     = useState(item?.daycare   ?? false);
  const [teachers,    setTeachers]    = useState<TeachersHoliday>(item?.teachers ?? 'no');
  const [saving,      setSaving]      = useState(false);
  const [errors,      setErrors]      = useState<Record<string, string>>({});
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const snackbar = useSnackbar();

  // ── Validation ─────────────────────────────────────────────────────────────
  const validate = useCallback((): boolean => {
    const errs: Record<string, string> = {};
    if (!description.trim()) errs.description = 'Holiday name is required';
    if (!date.trim())        errs.date        = 'Date is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [description, date]);

  // ── Save ───────────────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const entry: HolidayModel = {
        id:          isEdit ? item!.id : uuidv4(),
        description: description.trim(),
        date:        date.trim(),
        tuition,
        kg,
        daycare,
        teachers,
      };
      await holidayRepository.save(entry);
      syncSheet(SHEETS.HOLIDAY_LIST).catch(() => {});
      snackbar.show(isEdit ? 'Changes saved' : 'Holiday added', 'success');
      navigation.goBack();
    } catch (e) {
      snackbar.show(`Save failed: ${(e as Error).message}`, 'error');
    } finally {
      setSaving(false);
    }
  }, [validate, isEdit, item, description, date, tuition, kg, daycare, teachers, navigation, snackbar]);

  // ── Delete ─────────────────────────────────────────────────────────────────
  const confirmDelete = useCallback(() => {
    setSaving(true);
    holidayRepository.delete(item!.id)
      .then(() => {
        syncSheet(SHEETS.HOLIDAY_LIST).catch(() => {});
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
          {mode === 'add' ? 'Add Holiday' : 'Edit Holiday'}
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

        {/* ── Details ───────────────────────────────────────────────────────── */}
        <Text style={KStyles.formSection}>Holiday Details</Text>

        <Field label="Holiday Name" required>
          <InputField
            value={description}
            onChangeText={setDescription}
            placeholder="e.g. Onam, Republic Day…"
            editable
          />
          {errors.description ? <Text style={KStyles.formError}>{errors.description}</Text> : null}
        </Field>

        <Field label="Date" required>
          <FormDatePicker
            value={date}
            onChange={setDate}
          />
          {errors.date ? <Text style={KStyles.formError}>{errors.date}</Text> : null}
        </Field>

        {/* ── Applicability ─────────────────────────────────────────────────── */}
        <Text style={KStyles.formSection}>Applies To</Text>

        <Field label="Tuition">
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>{tuition ? 'Yes' : 'No'}</Text>
            <Switch
              value={tuition}
              onValueChange={setTuition}
              trackColor={{ true: PRIMARY }}
              thumbColor={tuition ? PRIMARY : '#ccc'}
            />
          </View>
        </Field>

        <Field label="KG">
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>{kg ? 'Yes' : 'No'}</Text>
            <Switch
              value={kg}
              onValueChange={setKg}
              trackColor={{ true: PRIMARY }}
              thumbColor={kg ? PRIMARY : '#ccc'}
            />
          </View>
        </Field>

        <Field label="Daycare">
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>{daycare ? 'Yes' : 'No'}</Text>
            <Switch
              value={daycare}
              onValueChange={setDaycare}
              trackColor={{ true: PRIMARY }}
              thumbColor={daycare ? PRIMARY : '#ccc'}
            />
          </View>
        </Field>

        <Field label="Teachers">
          <View style={styles.optionGroup}>
            {TEACHERS_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.optionBtn, teachers === opt.value && styles.optionBtnActive]}
                onPress={() => setTeachers(opt.value)}
                activeOpacity={0.8}
              >
                <Text style={[styles.optionText, teachers === opt.value && styles.optionTextActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Field>

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
            : <Text style={KStyles.formSaveBtnText}>{isEdit ? 'Save Changes' : 'Add Holiday'}</Text>}
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
        title="Delete Holiday"
        message={`Are you sure you want to delete "${item?.description ?? ''}"? This cannot be undone.`}
        confirmLabel="Delete"
        destructive
        onConfirm={() => { setDeleteDialogVisible(false); confirmDelete(); }}
        onCancel={() => setDeleteDialogVisible(false)}
      />
    </KeyboardAvoidingView>
  );
}

import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  switchLabel: { fontSize: 14, color: '#555' },
  optionGroup: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  optionBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ccc',
    backgroundColor: '#f5f5f5',
  },
  optionBtnActive: {
    backgroundColor: PRIMARY,
    borderColor:     PRIMARY,
  },
  optionText:       { fontSize: 13, color: '#555' },
  optionTextActive: { color: '#fff', fontWeight: '600' },
});
