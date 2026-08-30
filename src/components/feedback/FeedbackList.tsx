import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, TextInput, StyleSheet, Text,
  SafeAreaView, TouchableOpacity, ActivityIndicator, FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useSheet } from '../../hooks/useSheet';
import { feedbackRepository } from '../../db/repositories';
import type { FeedbackModel } from '../../db/models/feedback.model';
import FeedbackRow from './FeedbackRow';
import { Colors, KStyles } from '../../styles/kutties-styles';
import { SHEETS } from '../../utils/constants';

const PRIMARY = Colors.primary;

interface Props {
  navigation: any;
  route?: any;
}

export default function FeedbackList({ navigation, route }: Props) {
  const { syncing, sync } = useSheet(SHEETS.FEEDBACK);
  const synced = useRef(false);
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<FeedbackModel[]>([]);

  const loadItems = useCallback(async () => {
 
    const results = search.trim()
      ? await feedbackRepository.search(search)
      : await feedbackRepository.findAll();
    console.log(`[FeedbackList] loadItems → ${results.length} items`);
    setItems(results);
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

  const canGoBack = navigation.canGoBack();

  const renderItem = useCallback(
    ({ item }: { item: FeedbackModel }) => (
      <FeedbackRow
        item={item}
        onPress={(f) => navigation.navigate('FeedbackDetails', { item: f })}
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
          <Ionicons name="chatbubble-ellipses" size={24} color="#fff" />
        )}
        <Text style={KStyles.headerTitle}>Feedback</Text>
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
          placeholder="Search feedback…"
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
          <Ionicons name="chatbubble-ellipses-outline" size={48} color="#ccc" />
          <Text style={KStyles.emptyText}>No feedback entries found</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(f) => f.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 80 }}
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={KStyles.fab}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('FeedbackForm', { mode: 'add' })}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: { ...KStyles.center, gap: 12, paddingTop: 80 },
});
