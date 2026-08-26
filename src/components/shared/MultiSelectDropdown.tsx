import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, Pressable, Modal, TextInput,
  FlatList, TouchableOpacity, SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../styles/kutties-styles';

const PRIMARY = Colors.primary;

interface MultiSelectDropdownProps {
  /** Currently selected values */
  selected: string[];
  /** All available options */
  options: string[];
  /** Called with the full updated selection array */
  onChange: (values: string[]) => void;
  placeholder?: string;
  /** Shown at the top of the modal */
  title?: string;
  loading?: boolean;
  /** When true the trigger is non-interactive and pills are read-only */
  disabled?: boolean;
}

export default function MultiSelectDropdown({
  selected,
  options,
  onChange,
  placeholder = 'Select…',
  title = 'Select options',
  loading = false,
  disabled = false,
}: MultiSelectDropdownProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  // Draft selection inside the modal — only committed on Done
  const [draft, setDraft] = useState<string[]>([]);

  const openModal = useCallback(() => {
    setDraft([...selected]);
    setSearch('');
    setOpen(true);
  }, [selected]);

  const toggleDraft = useCallback((value: string) => {
    setDraft((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value],
    );
  }, []);

  const handleDone = useCallback(() => {
    onChange(draft);
    setOpen(false);
  }, [draft, onChange]);

  const filteredOptions = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? options.filter((o) => o.toLowerCase().includes(q)) : options;
  }, [options, search]);

  const isEmpty = selected.length === 0;

  if (disabled) {
    return (
      <View style={[styles.trigger, styles.triggerDisabled]}>
        <View style={styles.triggerInner}>
          {isEmpty ? (
            <Text style={styles.placeholder}>—</Text>
          ) : (
            <View style={styles.pillRow}>
              {selected.map((s) => (
                <View key={s} style={styles.pill}>
                  <Text style={styles.pillText}>{s}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
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
        <View style={styles.triggerInner}>
          {isEmpty ? (
            <Text style={styles.placeholder}>{loading ? 'Loading…' : placeholder}</Text>
          ) : (
            <View style={styles.pillRow}>
              {selected.map((s) => (
                <View key={s} style={styles.pill}>
                  <Text style={styles.pillText}>{s}</Text>
                  <Pressable
                    hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
                    onPress={() => onChange(selected.filter((v) => v !== s))}
                  >
                    <Ionicons name="close" size={11} color={PRIMARY} />
                  </Pressable>
                </View>
              ))}
            </View>
          )}
        </View>
        <Ionicons name="chevron-down" size={18} color="#888" />
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
            <TouchableOpacity onPress={handleDone} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.doneText}>Done ({draft.length})</Text>
            </TouchableOpacity>
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

          {/* Select-all / clear row */}
          <View style={styles.bulkRow}>
            <TouchableOpacity onPress={() => setDraft([...options])}>
              <Text style={styles.bulkText}>Select all</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setDraft([])}>
              <Text style={styles.bulkText}>Clear</Text>
            </TouchableOpacity>
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
                const checked = draft.includes(item);
                return (
                  <Pressable
                    onPress={() => toggleDraft(item)}
                    android_ripple={{ color: Colors.lightPink }}
                    style={({ pressed }) => [
                      styles.optionRow,
                      pressed && { backgroundColor: '#fafafa' },
                    ]}
                  >
                    <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
                      {checked && <Ionicons name="checkmark" size={14} color="#fff" />}
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
  // ── Trigger ──────────────────────────────────────────────────────────────
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
  triggerInner: { flex: 1 },
  placeholder: { fontSize: 14, color: '#bbb' },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E3F2FD',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  pillText: { fontSize: 12, color: PRIMARY, fontWeight: '600' },

  // ── Modal ────────────────────────────────────────────────────────────────
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
  doneText: { fontSize: 14, fontWeight: '700', color: PRIMARY },

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

  bulkRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 16,
    paddingHorizontal: 16,
    paddingBottom: 6,
  },
  bulkText: { fontSize: 13, color: PRIMARY, fontWeight: '600' },

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
  checkbox: {
    width: 22, height: 22, borderRadius: 5,
    borderWidth: 1.5, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.surface,
  },
  checkboxChecked: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  optionText: { fontSize: 14, color: '#333', flex: 1 },
  optionTextChecked: { fontWeight: '600', color: '#1A1A1A' },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  emptyText: { fontSize: 14, color: '#aaa' },
});
