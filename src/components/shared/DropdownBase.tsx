/**
 * DropdownModal — shared shell used by SingleSelectDropdown & MultiSelectDropdown.
 * Renders the trigger button and the slide-up modal with search.
 * Callers supply the list content via `children` and the Done/action button via `headerRight`.
 */
import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, Pressable, Modal, TextInput,
  TouchableOpacity, SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../styles/kutties-styles';

export const PRIMARY = Colors.primary;

// ── Shared trigger ────────────────────────────────────────────────────────────

interface TriggerProps {
  label: string;
  hasValue: boolean;
  loading?: boolean;
  disabled?: boolean;
  onPress: () => void;
  onClear?: () => void;
  children?: React.ReactNode; // pills or other custom trigger content
}

export function DropdownTrigger({
  label, hasValue, loading, disabled, onPress, onClear, children,
}: TriggerProps) {
  if (disabled) {
    return (
      <View style={[triggerStyles.trigger, triggerStyles.triggerDisabled]}>
        {children ?? (
          <Text style={hasValue ? triggerStyles.triggerText : triggerStyles.placeholder}>
            {hasValue ? label : '—'}
          </Text>
        )}
      </View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [triggerStyles.trigger, pressed && triggerStyles.triggerPressed]}
    >
      <View style={{ flex: 1 }}>
        {children ?? (
          <Text style={[triggerStyles.triggerText, !hasValue && triggerStyles.placeholder]} numberOfLines={1}>
            {hasValue ? label : (loading ? 'Loading…' : label)}
          </Text>
        )}
      </View>
      {hasValue && onClear ? (
        <Pressable hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} onPress={onClear}>
          <Ionicons name="close-circle" size={18} color="#aaa" />
        </Pressable>
      ) : (
        <Ionicons name="chevron-down" size={18} color="#888" />
      )}
    </Pressable>
  );
}

// ── Shared modal shell ────────────────────────────────────────────────────────

interface DropdownModalProps {
  visible: boolean;
  title: string;
  search: string;
  onSearchChange: (v: string) => void;
  onClose: () => void;
  /** Right side of the header (e.g. Done button); Cancel is always on the left */
  headerRight?: React.ReactNode;
  /** Rows rendered below the search bar */
  children: React.ReactNode;
}

export function DropdownModal({
  visible, title, search, onSearchChange, onClose, headerRight, children,
}: DropdownModalProps) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={modalStyles.modal}>
        {/* Header */}
        <View style={modalStyles.modalHeader}>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={modalStyles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={modalStyles.modalTitle}>{title}</Text>
          <View style={{ minWidth: 50, alignItems: 'flex-end' }}>
            {headerRight ?? <View style={{ width: 50 }} />}
          </View>
        </View>

        {/* Search */}
        <View style={modalStyles.searchRow}>
          <Ionicons name="search" size={16} color="#999" style={{ marginRight: 6 }} />
          <TextInput
            style={modalStyles.searchInput}
            placeholder="Search…"
            placeholderTextColor="#bbb"
            value={search}
            onChangeText={onSearchChange}
            clearButtonMode="while-editing"
            autoFocus
          />
        </View>

        {children}
      </SafeAreaView>
    </Modal>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

export function DropdownEmpty() {
  return (
    <View style={emptyStyles.empty}>
      <Text style={emptyStyles.emptyText}>No options found</Text>
    </View>
  );
}

// ── Shared option row styles (used by both list renderers) ────────────────────

export const optionRowStyles = StyleSheet.create({
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    backgroundColor: Colors.surface,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
    gap: 12,
  },
  optionText: { fontSize: 14, color: '#333', flex: 1 },
  optionTextChecked: { fontWeight: '600', color: '#1A1A1A' },
});

// ── Private style sheets ──────────────────────────────────────────────────────

const triggerStyles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 44,
  },
  triggerPressed:  { backgroundColor: '#fafafa' },
  triggerDisabled: { backgroundColor: '#FAFAFA', borderColor: Colors.border },
  triggerText:     { flex: 1, fontSize: 14, color: '#222' },
  placeholder:     { flex: 1, fontSize: 14, color: '#bbb' },
});

const modalStyles = StyleSheet.create({
  modal: { flex: 1, backgroundColor: '#F5F5F5' },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
  },
  modalTitle:  { fontSize: 15, fontWeight: '700', color: '#1A1A1A' },
  cancelText:  { fontSize: 14, color: Colors.muted },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    margin: 10,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    elevation: 1,
    boxShadow: '0px 1px 3px rgba(0,0,0,0.05)',
  },
  searchInput: { flex: 1, fontSize: 14, color: '#222', paddingVertical: 2 },
});

const emptyStyles = StyleSheet.create({
  empty:     { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  emptyText: { fontSize: 14, color: '#aaa' },
});
