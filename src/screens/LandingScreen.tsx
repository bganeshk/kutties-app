import React from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const PRIMARY = '#C2185B';

interface Props {
  navigation: any;
  route: { params: { title: string; appviewsheet: string } };
}

export default function LandingScreen({ navigation, route }: Props) {
  const { title, appviewsheet } = route.params;

  return (
    <SafeAreaView style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{title}</Text>
      </View>

      {/* Landing body */}
      <View style={styles.body}>
        <View style={styles.badge}>
          <Ionicons name="layers-outline" size={48} color={PRIMARY} />
        </View>
        <Text style={styles.pageTitle}>{title}</Text>
        <Text style={styles.viewLabel}>{appviewsheet}</Text>
        <Text style={styles.hint}>Content for this view goes here</Text>
      </View>

      {/* FAB */}
      <TouchableOpacity style={styles.fab} activeOpacity={0.85}>
        <Ionicons name="add" size={30} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: PRIMARY, paddingHorizontal: 16, paddingVertical: 12,
  },
  headerTitle: { flex: 1, color: '#fff', fontSize: 18, fontWeight: '700', marginLeft: 14 },
  body: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  badge: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: '#FCE4EC', justifyContent: 'center', alignItems: 'center',
    marginBottom: 24,
  },
  pageTitle: { fontSize: 24, fontWeight: '700', color: '#222', marginBottom: 8, textAlign: 'center' },
  viewLabel: {
    fontSize: 13, fontWeight: '600', color: '#fff',
    backgroundColor: PRIMARY, paddingHorizontal: 14, paddingVertical: 4,
    borderRadius: 12, overflow: 'hidden', marginBottom: 20,
  },
  hint: { fontSize: 14, color: '#aaa', textAlign: 'center' },
  fab: {
    position: 'absolute', bottom: 24, right: 20, width: 56, height: 56,
    borderRadius: 28, backgroundColor: PRIMARY, alignItems: 'center',
    justifyContent: 'center', elevation: 6, shadowColor: PRIMARY,
    shadowOpacity: 0.4, shadowRadius: 6, shadowOffset: { width: 0, height: 3 },
  },
});
