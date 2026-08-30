import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  View, TextInput, StyleSheet, Text,
  SafeAreaView, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useSheet } from '../../hooks/useSheet';
import { employeeRepository } from '../../db/repositories';
import type { EmployeeModel } from '../../db/models';
import EmployeeRow from './EmployeeRow';
import { GroupedList, GroupLevel } from '../shared';
import { Colors, KStyles } from '../../styles/kutties-styles';
import { SHEETS } from '../../utils/constants';

type Employee = EmployeeModel;

const PRIMARY = Colors.primary;

const EMPLOYEE_GROUP_BY: GroupLevel<Employee>[] = [
  {
    keyOf: (e) => e.status ?? 'inactive',
    dotColor: (k) => k === 'active' ? '#2E7D32' : '#9E9E9E',
    bgColor:  (k) => k === 'active' ? '#F1F8E9' : '#F5F5F5',
    defaultExpanded: (k) => k === 'active',
  },
];

interface Props {
  navigation: any;
}

export default function EmployeeList({ navigation }: Props) {
  const { syncing, sync } = useSheet(SHEETS.EMPLOYEES);
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

  // reload list every time the screen comes back into focus (e.g. after save/edit)
  useFocusEffect(useCallback(() => {
    loadEmployees();
  }, [loadEmployees]));

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
      navigation.navigate('EmployeeDetails', { item });
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
    <SafeAreaView style={KStyles.listRoot}>
      {/* Header */}
      <View style={KStyles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={KStyles.headerTitle}>Employees</Text>
        <TouchableOpacity onPress={() => sync()} style={KStyles.headerIcon}>
          {syncing
            ? <ActivityIndicator size="small" color="#fff" />
            : <Ionicons name="refresh" size={22} color="#fff" />}
        </TouchableOpacity>
      </View>

      {/* Search bar */}
      <View style={KStyles.searchRow}>
        <Ionicons name="search" size={18} color="#999" style={KStyles.searchIcon} />
        <TextInput
          style={KStyles.searchInput}
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
        <View style={KStyles.selectionBanner}>
          <Text style={KStyles.selectionText}>{selectedIds.size} selected</Text>
          <TouchableOpacity onPress={() => setSelectedIds(new Set())}>
            <Text style={KStyles.clearText}>Clear</Text>
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
          <Text style={KStyles.emptyText}>No employees found</Text>
        </View>
      ) : (
        <GroupedList
          data={displayedEmployees}
          groupBy={EMPLOYEE_GROUP_BY}
          keyExtractor={(e) => e.id}
          renderItem={renderEmployee}
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={KStyles.fab}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('EmployeeForm', { mode: 'add' })}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
});
