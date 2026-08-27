import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, Pressable, Modal, TextInput,
  FlatList, TouchableOpacity, SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../styles/kutties-styles';

const PRIMARY = Colors.primary;

interface SingleSelectDropdownProps {
  /** Currently selected value */
  selected: string;
  /** All available options */
  options: string[];
  /** Called with the selected value (empty string to clear) */
  onChange: (value: string) => void;
  placeholder?: string;
  /** Shown at the top of the modal */
  title?: string;
  loading?: boolean;
  /** When true the trigger is non-interactive */
  disabled?: boolean;
}

export default function SingleSelectDropdown({
  selected,
  options,
  onChange,
  placeholder = 'Select…',
  title = 'Select an option',
  loading = false,
  disabled = false,
}: SingleSelectDropdownProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const openModal = useCallback(() => {
    setSearch('');
    setOpen(true);
  }, []);

  const handleSelect = useCallback(
    (value: string) => {
      onChange(value === selected ? '' : value);
      setOpen(false);
    },
    [selected, onChange],
  );

  const filteredOptions = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? options.filter((o) => o.toLowerCase().includes(q)) : options;
  }, [options, search]);

  if (disabled) {
    return (
      <View style={[styles.trigger, styles.triggerDisabled]}>
        <Text style={selected ? styles.selectedText : styles.placeholder}>
          {selected || '—'}
        </Text>
      </View>
    );
  }

  return (
    <>
      {/* ── Trigger ──────────────────────────────────────────────────────── */}
      <Pressable
        onPress={openModal}
        style={({ pressed }) => [styles.trigger, pressed && styles.triggerPressed]}
      >
        <Text style={[styles.triggerText, !selected && styles.placeholder]} numberOfLines={1}>
          {selected || (loading ? 'Loading…' : placeholder)}
        </Text>
        {selected ? (
          <Pressable
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            onPress={() => onChange('')}
          >
            <Ionicons name="close-circle" size={18} color="#aaa" />
          </Pressable>
        ) : (
          <Ionicons name="chevron-down" size={18} color="#888" />
        )}
      </Pressable>

      {/* ── Modal ────────────────────────────────────────────────────────── */}
      <Modal
        visible={open}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setOpen(false)}
      >
        <SafeAreaView style={styles.modal}>
          {/* Modal header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setOpen(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{title}</Text>
            <View style={{ width: 50 }} />
          </View>

          {/* Search */}
          <View style={styles.searchRow}>
            <Ionicons name="search" size={16} color="#999" style={{ marginRight: 6 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search…"
              placeholderTextColor="#bbb"
              value={search}
              onChangeText={setSearch}
              clearButtonMode="while-editing"
              autoFocus
            />
          </View>

          {/* Options list */}
          {filteredOptions.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No options found</Text>
            </View>
          ) : (
            <FlatList
              data={filteredOptions}
              keyExtractor={(item) => item}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const checked = item === selected;
                return (
                  <Pressable
                    onPress={() => handleSelect(item)}
                    android_ripple={{ color: Colors.lightPink }}
                    style={({ pressed }) => [
                      styles.optionRow,
                      pressed && { backgroundColor: '#fafafa' },
                    ]}
                  >
                    <View style={[styles.radio, checked && styles.radioChecked]}>
                      {checked && <View style={styles.radioDot} />}
                    </View>
                    <Text style={[styles.optionText, checked && styles.optionTextChecked]}>
                      {item}
                    </Text>
                  </Pressable>
                );
              }}
            />
          )}
        </SafeAreaView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
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
  triggerPressed: { backgroundColor: '#fafafa' },
  triggerDisabled: { backgroundColor: '#FAFAFA', borderColor: Colors.border },
  triggerText: { flex: 1, fontSize: 14, color: '#222' },
  selectedText: { flex: 1, fontSize: 14, color: '#222' },
  placeholder: { flex: 1, fontSize: 14, color: '#bbb' },

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
  modalTitle: { fontSize: 15, fontWeight: '700', color: '#1A1A1A' },
  cancelText: { fontSize: 14, color: Colors.muted },

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
  radio: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 1.5, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.surface,
  },
  radioChecked: { borderColor: PRIMARY },
  radioDot: {
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: PRIMARY,
  },
  optionText: { fontSize: 14, color: '#333', flex: 1 },
  optionTextChecked: { fontWeight: '600', color: '#1A1A1A' },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  emptyText: { fontSize: 14, color: '#aaa' },
});
