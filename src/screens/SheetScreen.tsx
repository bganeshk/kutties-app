import React, { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  StyleSheet, ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { useSheet } from '../hooks/useSheet';

interface Props {
  sheet: string;
}

export default function SheetScreen({ sheet }: Props) {
  const { rows, syncing, lastSync, error, sync, insert, update, remove } = useSheet(sheet);
  const [newName, setNewName] = useState('');

  const handleAdd = async () => {
    if (!newName.trim()) return;
    await insert({ name: newName.trim() });
    setNewName('');
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete', 'Delete this row?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => remove(id) },
    ]);
  };

  const syncTime = lastSync ? new Date(lastSync).toLocaleTimeString() : 'Never';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{sheet}</Text>
        <TouchableOpacity onPress={sync} disabled={syncing} style={styles.syncBtn}>
          {syncing ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.syncText}>Sync</Text>}
        </TouchableOpacity>
      </View>

      <Text style={styles.meta}>Last synced: {syncTime}</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.addRow}>
        <TextInput
          style={styles.input}
          placeholder="New row name..."
          value={newName}
          onChangeText={setNewName}
        />
        <TouchableOpacity onPress={handleAdd} style={styles.addBtn}>
          <Text style={styles.addText}>Add</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={rows}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={syncing} onRefresh={sync} />}
        renderItem={({ item }) => {
          const { id, ...rest } = item;
          return (
            <View style={styles.row}>
              <View style={styles.rowData}>
                {Object.entries(rest).map(([k, v]) => (
                  <Text key={k} style={styles.cell}>
                    <Text style={styles.key}>{k}: </Text>{String(v ?? '')}
                  </Text>
                ))}
              </View>
              <TouchableOpacity onPress={() => handleDelete(id)} style={styles.delBtn}>
                <Text style={styles.delText}>✕</Text>
              </TouchableOpacity>
            </View>
          );
        }}
        ListEmptyComponent={<Text style={styles.empty}>No rows — tap Sync to pull from Excel</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#0052cc' },
  title: { color: '#fff', fontSize: 18, fontWeight: '700' },
  syncBtn: { backgroundColor: '#1baf7a', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 6 },
  syncText: { color: '#fff', fontWeight: '600' },
  meta: { fontSize: 12, color: '#666', paddingHorizontal: 16, paddingTop: 8 },
  error: { color: '#d03b3b', fontSize: 12, paddingHorizontal: 16, paddingTop: 4 },
  addRow: { flexDirection: 'row', padding: 12, gap: 8 },
  input: { flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 6, padding: 8, backgroundColor: '#fff' },
  addBtn: { backgroundColor: '#0052cc', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 6, justifyContent: 'center' },
  addText: { color: '#fff', fontWeight: '600' },
  row: { flexDirection: 'row', backgroundColor: '#fff', marginHorizontal: 12, marginBottom: 6, borderRadius: 6, padding: 12, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  rowData: { flex: 1 },
  cell: { fontSize: 14, color: '#333', marginBottom: 2 },
  key: { fontWeight: '600', color: '#0052cc' },
  delBtn: { padding: 6 },
  delText: { color: '#d03b3b', fontWeight: '700' },
  empty: { textAlign: 'center', color: '#999', marginTop: 40, fontSize: 14 },
});
