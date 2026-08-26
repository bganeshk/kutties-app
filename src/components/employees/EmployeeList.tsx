import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, TextInput, StyleSheet, Text,
  SafeAreaView, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSheet } from '../../hooks/useSheet';
import { employeeRepository } from '../../db/repositories';
import type { EmployeeModel } from '../../db/models';
import EmployeeRow from './EmployeeRow';
import { GroupedList, GroupConfig } from '../shared';
import { Colors, KStyles } from '../../styles/kutties-styles';

type Employee = EmployeeModel;

const PRIMARY = Colors.primary;

const EMPLOYEE_GROUPS: GroupConfig<Employee>[] = [
  {
    key: 'active',
    label: 'Active',
    filter: (e) => e.status === 'active',
    dotColor: '#2E7D32',
    bgColor: '#F1F8E9',
    defaultExpanded: true,
  },
  {
    key: 'inactive',
    label: 'Inactive',
    filter: (e) => e.status !== 'active',
    dotColor: '#9E9E9E',
    bgColor: '#F5F5F5',
    defaultExpanded: false,
  },
];

interface Props {
  navigation: any;
}

export default function EmployeeList({ navigation }: Props) {
  const { syncing, sync } = useSheet('employees');
  const synced = useRef(false);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [deptFilter, setDeptFilter] = useState<string | null>(null);
  const [desigFilter, setDesigFilter] = useState<string | null>(null);

  const loadEmployees = useCallback(async () => {
    const results = search.trim()
      ? await employeeRepository.search(search)
      : await employeeRepository.findAll();
    setEmployees(results.sort((a, b) =>
      String(a.name ?? '').localeCompare(String(b.name ?? ''))
    ));
  }, [search]);

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  useEffect(() => {
    if (!synced.current) {
      synced.current = true;
      sync().then(() => loadEmployees());
    }
  }, []);

  const toggleDeptFilter = useCallback((dept: string) => {
    setDeptFilter(prev => prev === dept ? null : dept);
  }, []);

  const toggleDesigFilter = useCallback((desig: string) => {
    setDesigFilter(prev => prev === desig ? null : desig);
  }, []);

  const toggleSelect = useCallback((item: Employee) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(item.id) ? next.delete(item.id) : next.add(item.id);
      return next;
    });
  }, []);

  const handlePress = useCallback((item: Employee) => {
    if (selectedIds.size > 0) {
      toggleSelect(item);
    } else {
      navigation.navigate('Landing', {
        title: String(item.name ?? item.id),
        appviewsheet: 'EmployeeDetails',
      });
    }
  }, [selectedIds, navigation, toggleSelect]);

  const renderEmployee = useCallback((item: Employee) => (
    <EmployeeRow
      item={item}
      selected={selectedIds.has(item.id)}
      activeDept={deptFilter ?? undefined}
      activeDesig={desigFilter ?? undefined}
      onPress={handlePress}
      onLongPress={toggleSelect}
      onDeptPress={toggleDeptFilter}
      onDesigPress={toggleDesigFilter}
    />
  ), [selectedIds, handlePress, toggleSelect, toggleDeptFilter, deptFilter, toggleDesigFilter, desigFilter]);

  const displayedEmployees = employees.filter(e =>
    (!deptFilter  || e.department  === deptFilter) &&
    (!desigFilter || e.designation === desigFilter)
  );

  const isEmpty = displayedEmployees.length === 0;

  return (
    <SafeAreaView style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Employees</Text>
        <TouchableOpacity onPress={() => sync()} style={styles.headerIcon}>
          {syncing
            ? <ActivityIndicator size="small" color="#fff" />
            : <Ionicons name="refresh" size={22} color="#fff" />}
        </TouchableOpacity>
      </View>

      {/* Search bar */}
      <View style={styles.searchRow}>
        <Ionicons name="search" size={18} color="#999" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, email, phone…"
          placeholderTextColor="#bbb"
          value={search}
          onChangeText={setSearch}
          clearButtonMode="while-editing"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color="#bbb" />
          </TouchableOpacity>
        )}
      </View>

      {/* Dept filter banner */}
      {deptFilter ? (
        <View style={styles.deptBanner}>
          <Ionicons name="funnel" size={13} color="#4527A0" style={{ marginRight: 6 }} />
          <Text style={styles.deptBannerText} numberOfLines={1}>{deptFilter}</Text>
          <TouchableOpacity onPress={() => setDeptFilter(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close-circle" size={16} color="#4527A0" />
          </TouchableOpacity>
        </View>
      ) : null}

      {/* Designation filter banner */}
      {desigFilter ? (
        <View style={styles.desigBanner}>
          <Ionicons name="funnel" size={13} color={PRIMARY} style={{ marginRight: 6 }} />
          <Text style={styles.desigBannerText} numberOfLines={1}>{desigFilter}</Text>
          <TouchableOpacity onPress={() => setDesigFilter(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close-circle" size={16} color={PRIMARY} />
          </TouchableOpacity>
        </View>
      ) : null}

      {/* Selection banner */}
      {selectedIds.size > 0 && (
        <View style={styles.selectionBanner}>
          <Text style={styles.selectionText}>{selectedIds.size} selected</Text>
          <TouchableOpacity onPress={() => setSelectedIds(new Set())}>
            <Text style={styles.clearText}>Clear</Text>
          </TouchableOpacity>
        </View>
      )}

      {isEmpty && syncing ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={PRIMARY} />
        </View>
      ) : isEmpty ? (
        <View style={styles.center}>
          <Ionicons name="people-outline" size={48} color="#ccc" />
          <Text style={styles.emptyText}>No employees found</Text>
        </View>
      ) : (
        <GroupedList
          data={displayedEmployees}
          groups={EMPLOYEE_GROUPS}
          keyExtractor={(e) => e.id}
          renderItem={renderEmployee}
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.85}
        onPress={() =>
          navigation.navigate('Landing', { title: 'Add Employee', appviewsheet: 'EmployeeForm' })
        }
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F5F5F5' },
  header: KStyles.header,
  headerTitle: KStyles.headerTitle,
  headerIcon: KStyles.headerIcon,
  searchRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface, margin: 10, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 6,
    elevation: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  searchIcon: { marginRight: 6 },
  searchInput: { flex: 1, fontSize: 14, color: '#222', paddingVertical: 2 },
  selectionBanner: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: Colors.lightPink, paddingHorizontal: 16, paddingVertical: 8,
  },
  selectionText: { fontSize: 13, fontWeight: '600', color: PRIMARY },
  clearText: { fontSize: 13, color: PRIMARY, textDecorationLine: 'underline' },
  deptBanner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#EDE7F6',
    paddingHorizontal: 14, paddingVertical: 7,
    borderBottomWidth: 1, borderBottomColor: '#D1C4E9',
  },
  deptBannerText: { flex: 1, fontSize: 13, fontWeight: '600', color: '#4527A0' },
  desigBanner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.lightPink,
    paddingHorizontal: 14, paddingVertical: 7,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  desigBannerText: { flex: 1, fontSize: 13, fontWeight: '600', color: PRIMARY },
  center: { ...KStyles.center, gap: 12, paddingTop: 80 },
  emptyText: { fontSize: 14, color: '#aaa' },
  fab: KStyles.fab,
});
