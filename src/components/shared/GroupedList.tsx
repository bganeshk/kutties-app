import React, { useState, useMemo, useCallback } from 'react';
import {
  FlatList, View, Text, StyleSheet, TouchableOpacity,
  StyleProp, ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../styles/kutties-styles';

// ── Level descriptor ──────────────────────────────────────────────────────────
export interface GroupLevel<T> {
  /** Extract the grouping bucket from an item */
  keyOf: (item: T) => string;
  /** Format a bucket key into a display label (defaults to the key itself) */
  label?: (key: string) => string;
  /** Dot / badge colour — string or per-key function */
  dotColor?: string | ((key: string) => string);
  /** Background colour — string or per-key function */
  bgColor?: string | ((key: string) => string);
  /** Whether the group starts expanded (default: true). Pass a function for per-key control. */
  defaultExpanded?: boolean | ((key: string) => boolean);
}

// ── Component props ───────────────────────────────────────────────────────────
interface Props<T> {
  data: T[];
  /**
   * Ordered array of grouping levels.
   * Pass one entry for a single-level list, two for two-level, etc.
   */
  groupBy: GroupLevel<T>[];
  keyExtractor: (item: T) => string;
  renderItem: (item: T) => React.ReactElement | null;
  ListEmptyComponent?: React.ReactElement;
  contentContainerStyle?: StyleProp<ViewStyle>;
}

// ── Internal flat-list item types ─────────────────────────────────────────────
type HeaderItem = {
  kind: 'header';
  /** Dot-separated path of bucket keys, e.g. "active" or "active.Grade 1" */
  path: string;
  depth: number;
  label: string;
  count: number;
  dotColor: string;
  bgColor: string;
};
type RowItem<T> = { kind: 'row'; item: T };
type FlatItem<T> = HeaderItem | RowItem<T>;

// ── Helpers ───────────────────────────────────────────────────────────────────
function resolve(
  val: string | ((key: string) => string) | undefined,
  key: string,
  fallback: string,
): string {
  if (!val) return fallback;
  return typeof val === 'function' ? val(key) : val;
}

// Depth-aware default colours
const DEFAULT_DOT_COLORS = ['#555', '#1565C0', '#2E7D32', '#6A1B9A', '#E65100'];
const DEFAULT_BG_COLORS  = ['#F5F5F5', '#E3F2FD', '#F1F8E9', '#F3E5F5', '#FBE9E7'];

// ── Component ─────────────────────────────────────────────────────────────────
export default function GroupedList<T>({
  data,
  groupBy,
  keyExtractor,
  renderItem,
  ListEmptyComponent,
  contentContainerStyle,
}: Props<T>) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const defaultCollapsed = useCallback((key: string, level: GroupLevel<T>): boolean => {
    if (typeof level.defaultExpanded === 'function') return !level.defaultExpanded(key);
    return level.defaultExpanded === false;
  }, []);

  // siblingPaths is kept in sync with every header rendered, so we can find
  // siblings without parsing path strings (which breaks when keys contain dots).
  const siblingMap = React.useRef<Map<string, { depth: number; parentPath: string }>>(new Map());

  const toggle = useCallback((path: string, key: string, level: GroupLevel<T>, depth: number, parentPath: string) => {
    setCollapsed((prev) => {
      const current = path in prev ? prev[path] : defaultCollapsed(key, level);
      const opening = current; // true means currently collapsed → we are expanding

      if (!opening) {
        // just collapsing — no sibling logic needed
        return { ...prev, [path]: true };
      }

      // Expanding — collapse every sibling (same depth, same parent) that is currently open.
      const next: Record<string, boolean> = { ...prev };
      siblingMap.current.forEach((meta, p) => {
        if (p !== path && meta.depth === depth && meta.parentPath === parentPath) {
          next[p] = true; // collapse sibling
        }
      });
      next[path] = false; // expand the tapped one
      return next;
    });
  }, [defaultCollapsed]);

  const isCollapsed = useCallback((path: string, key: string, level: GroupLevel<T>): boolean => {
    if (path in collapsed) return collapsed[path];
    return defaultCollapsed(key, level);
  }, [collapsed, defaultCollapsed]);

  const flatDataResolved = useMemo<FlatItem<T>[]>(() => {
    if (!groupBy.length) return data.map((item) => ({ kind: 'row' as const, item }));
    const out: FlatItem<T>[] = [];

    siblingMap.current.clear();
    function flatten(items: T[], depth: number, pathPrefix: string) {
      const level = groupBy[depth];
      const isLeaf = depth === groupBy.length - 1;
      const seen = new Map<string, T[]>();
      for (const item of items) {
        const k = level.keyOf(item);
        if (!seen.has(k)) seen.set(k, []);
        seen.get(k)!.push(item);
      }
      for (const key of [...seen.keys()].sort()) {
        const bucket = seen.get(key)!;
        const path = pathPrefix ? `${pathPrefix}.${key}` : key;
        const label = level.label ? level.label(key) : key;
        const dotColor = resolve(level.dotColor, key, DEFAULT_DOT_COLORS[depth] ?? '#555');
        const bgColor  = resolve(level.bgColor,  key, DEFAULT_BG_COLORS[depth]  ?? '#F5F5F5');

        siblingMap.current.set(path, { depth, parentPath: pathPrefix });
        out.push({ kind: 'header', path, depth, label, count: bucket.length, dotColor, bgColor });

        if (isCollapsed(path, key, level)) continue;

        if (isLeaf) {
          bucket.forEach((item) => out.push({ kind: 'row', item }));
        } else {
          flatten(bucket, depth + 1, path);
        }
      }
    }

    flatten(data, 0, '');
    return out;
  }, [data, groupBy, isCollapsed]);

  const getKey = useCallback((item: FlatItem<T>): string => {
    if (item.kind === 'header') return `__h__${item.path}`;
    return keyExtractor(item.item);
  }, [keyExtractor]);

  const renderFlatItem = useCallback(({ item }: { item: FlatItem<T> }) => {
    if (item.kind === 'header') {
      const level = groupBy[item.depth];
      const coll = isCollapsed(item.path, item.label, level);
      const indent = item.depth * 14;
      return (
        <TouchableOpacity
          style={[
            styles.header,
            { backgroundColor: item.bgColor, paddingLeft: 14 + indent },
          ]}
          onPress={() => toggle(item.path, item.label, level, item.depth, siblingMap.current.get(item.path)?.parentPath ?? '')}
          activeOpacity={0.8}
        >
          <View style={[styles.dot, { backgroundColor: item.dotColor, width: 8 - item.depth, height: 8 - item.depth, borderRadius: (8 - item.depth) / 2 }]} />
          <Text style={[styles.label, { fontSize: 13 - item.depth }]}>{item.label}</Text>
          <View style={[styles.badge, { backgroundColor: item.dotColor + '33' }]}>
            <Text style={[styles.badgeText, { color: item.dotColor }]}>{item.count}</Text>
          </View>
          <Ionicons name={coll ? 'chevron-down' : 'chevron-up'} size={14 - item.depth} color="#666" style={styles.chevron} />
        </TouchableOpacity>
      );
    }
    return renderItem(item.item) ?? <View />;
  }, [groupBy, isCollapsed, toggle, renderItem]);

  return (
    <FlatList
      data={flatDataResolved}
      keyExtractor={getKey}
      renderItem={renderFlatItem}
      ListEmptyComponent={ListEmptyComponent}
      contentContainerStyle={contentContainerStyle}
    />
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 14,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
  },
  dot: { marginRight: 8 },
  label: { flex: 1, fontWeight: '700', color: '#333' },
  badge: {
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 1,
    marginRight: 6,
  },
  badgeText: { fontSize: 11, fontWeight: '700' },
  chevron: {},
});
