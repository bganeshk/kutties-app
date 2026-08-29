import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, TextInput, StyleSheet, Text,
  SafeAreaView, TouchableOpacity, ActivityIndicator, FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useSheet } from '../../hooks/useSheet';
import { handbookRepository } from '../../db/repositories';
import type { HandbookModel } from '../../db/models/handbook.model';
import HandbookRow from './HandbookRow';
import { Colors, KStyles } from '../../styles/kutties-styles';

const PRIMARY = Colors.primary;

interface Props {
  navigation: any;
  // route may or may not be present depending on which stack renders this
  route?: any;
}

export default function HandbookList({ navigation, route }: Props) {
  // Sheet name must match the Excel tab exactly — capital H
  const { syncing, sync } = useSheet('Handbook');
  const synced = useRef(false);
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<HandbookModel[]>([]);

  const loadItems = useCallback(async () => {
    const results = search.trim()
      ? await handbookRepository.search(search)
      : await handbookRepository.findAll();
    // Keep display order by numeric id
    setItems(results.sort((a, b) => Number(a.id) - Number(b.id)));
  }, [search]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  useFocusEffect(
    useCallback(() => {
      loadItems();
    }, [loadItems]),
  );

  useEffect(() => {
    if (!synced.current) {
      synced.current = true;
      sync().then(() => loadItems());
    }
  }, []);

  // Only show a back arrow when there is a screen to go back to
  // (i.e. navigated from HomeStack, not opened as a tab root)
  const canGoBack = navigation.canGoBack();

  const renderItem = useCallback(
    ({ item }: { item: HandbookModel }) => (
      <HandbookRow
        item={item}
        onPress={(h) => navigation.navigate('HandbookDetails', { item: h })}
      />
    ),
    [navigation],
  );

  return (
    <SafeAreaView style={KStyles.listRoot}>
      {/* Header */}
      <View style={KStyles.header}>
        {canGoBack ? (
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
        ) : (
          <Ionicons name="book" size={24} color="#fff" />
        )}
        <Text style={KStyles.headerTitle}>Handbook</Text>
        <TouchableOpacity onPress={() => sync()} style={KStyles.headerIcon}>
          {syncing ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="refresh" size={22} color="#fff" />
          )}
        </TouchableOpacity>
      </View>

      {/* Search bar */}
      <View style={KStyles.searchRow}>
        <Ionicons name="search" size={18} color="#999" style={KStyles.searchIcon} />
        <TextInput
          style={KStyles.searchInput}
          placeholder="Search handbook entries…"
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

      {items.length === 0 && syncing ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={PRIMARY} />
        </View>
      ) : items.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="book-outline" size={48} color="#ccc" />
          <Text style={KStyles.emptyText}>No handbook entries found</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(h) => h.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 80 }}
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={KStyles.fab}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('HandbookForm', { mode: 'add' })}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: { ...KStyles.center, gap: 12, paddingTop: 80 },
});
