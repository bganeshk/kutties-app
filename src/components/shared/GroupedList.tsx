import React, { useState, useMemo, useCallback } from 'react';
import {
  FlatList, View, StyleProp, ViewStyle,
} from 'react-native';
import SectionHeader from './SectionHeader';

export interface GroupConfig<T> {
  key: string;
  label: string;
  filter: (item: T) => boolean;
  dotColor?: string;
  bgColor?: string;
  defaultExpanded?: boolean;
}

interface Props<T> {
  data: T[];
  groups: GroupConfig<T>[];
  keyExtractor: (item: T) => string;
  renderItem: (item: T) => React.ReactElement | null;
  ListEmptyComponent?: React.ReactElement;
  contentContainerStyle?: StyleProp<ViewStyle>;
}

type FlatItem<T> =
  | { kind: 'header'; groupKey: string; label: string; count: number; dotColor?: string; bgColor?: string }
  | { kind: 'row'; groupKey: string; item: T };

export default function GroupedList<T>({
  data,
  groups,
  keyExtractor,
  renderItem,
  ListEmptyComponent,
  contentContainerStyle,
}: Props<T>) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    groups.forEach((g) => {
      init[g.key] = g.defaultExpanded === false;
    });
    return init;
  });

  const toggleGroup = useCallback((key: string) => {
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const flatData = useMemo<FlatItem<T>[]>(() => {
    const items: FlatItem<T>[] = [];
    for (const g of groups) {
      const rows = data.filter(g.filter);
      items.push({
        kind: 'header',
        groupKey: g.key,
        label: g.label,
        count: rows.length,
        dotColor: g.dotColor,
        bgColor: g.bgColor,
      });
      if (!collapsed[g.key]) {
        rows.forEach((r) => items.push({ kind: 'row', groupKey: g.key, item: r }));
      }
    }
    return items;
  }, [data, groups, collapsed]);

  const getKey = useCallback((item: FlatItem<T>) => {
    if (item.kind === 'header') return `__header__${item.groupKey}`;
    return keyExtractor(item.item);
  }, [keyExtractor]);

  const render = useCallback(({ item }: { item: FlatItem<T> }) => {
    if (item.kind === 'header') {
      return (
        <SectionHeader
          label={item.label}
          count={item.count}
          collapsed={collapsed[item.groupKey]}
          onToggle={() => toggleGroup(item.groupKey)}
          dotColor={item.dotColor}
          bgColor={item.bgColor}
        />
      );
    }
    return renderItem(item.item) ?? <View />;
  }, [collapsed, toggleGroup, renderItem]);

  return (
    <FlatList
      data={flatData}
      keyExtractor={getKey}
      renderItem={render}
      ListEmptyComponent={ListEmptyComponent}
      contentContainerStyle={contentContainerStyle}
    />
  );
}
