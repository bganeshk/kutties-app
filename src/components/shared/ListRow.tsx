import React, { memo, useCallback } from 'react';
import {
  View, Text, StyleSheet, Pressable, Linking, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ColMeta, ColType, getFieldValue, formatValue } from './ColMeta';
import { Colors, KStyles } from '../../styles/kutties-styles';

const PRIMARY  = Colors.primary;
const { width } = Dimensions.get('window');

interface ListRowProps {
  data: any;
  cols: ColMeta[];
  selected?: boolean;
  touchDisabled?: boolean;
  onPress?: (data: any) => void;
  onLongPress?: (data: any) => void;
  rowIcon?: string;           // Ionicons name for leading icon
  rowIconColor?: string;
}

const ListRow = memo(({ data, cols, selected, touchDisabled, onPress, onLongPress, rowIcon, rowIconColor }: ListRowProps) => {

  const renderLeadIcon = useCallback(() => {
    if (!rowIcon) return null;
    return (
      <Ionicons
        name={rowIcon as any}
        size={22}
        color={rowIconColor ?? PRIMARY}
        style={styles.leadIcon}
      />
    );
  }, [rowIcon, rowIconColor]);

  const renderCell = useCallback((col: ColMeta, index: number) => {
    const raw = getFieldValue(data, col.field);
    const val = formatValue(raw, col.type);
    if (!val) return null;

    const textStyle = [styles.cellText, col.color ? { color: col.color } : null];

    if (col.type === 'phone') {
      return (
        <Pressable onPress={() => Linking.openURL(`tel:${raw}`)}>
          <Ionicons name="call" size={18} color="#1565C0" />
        </Pressable>
      );
    }
    if (col.type === 'email') {
      return (
        <Pressable onPress={() => Linking.openURL(`mailto:${raw}`)}>
          <Ionicons name="mail" size={18} color="#1565C0" />
        </Pressable>
      );
    }
    if (col.type === 'badge') {
      return (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{val}</Text>
        </View>
      );
    }

    return (
      <View style={styles.cellInner}>
        {index === 0 && renderLeadIcon()}
        {col.iconPrefix && (
          <Ionicons name={col.iconPrefix as any} size={14} color="#1565C0" style={styles.inlineIcon} />
        )}
        <Text style={textStyle} numberOfLines={2}>{val}</Text>
        {col.iconSuffix && (
          <Ionicons name={col.iconSuffix as any} size={14} color="#888" style={styles.inlineIcon} />
        )}
      </View>
    );
  }, [data, renderLeadIcon]);

  const rowContent = (
    <View style={styles.row}>
      {cols.map((col, i) => (
        <View
          key={i}
          style={[styles.cell, { flex: col.flex ?? 1 }]}
        >
          {renderCell(col, i)}
        </View>
      ))}
    </View>
  );

  if (touchDisabled) {
    return <View style={[styles.container, selected && styles.selected]}>{rowContent}</View>;
  }

  return (
    <Pressable
      onPress={() => onPress?.(data)}
      onLongPress={() => onLongPress?.(data)}
      android_ripple={{ color: 'rgba(194,24,91,0.1)' }}
      style={({ pressed }) => [
        styles.container,
        selected && styles.selected,
        pressed && styles.pressed,
      ]}
    >
      {rowContent}
    </Pressable>
  );
});

export default ListRow;

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 0.5,
    borderBottomColor: '#E0E0E0',
    backgroundColor: '#fff',
    minHeight: 52,
  },
  selected: KStyles.selected,
  pressed: {
    backgroundColor: '#F5F5F5',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 6,
  },
  cell: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    minWidth: width * 0.2,
  },
  cellInner: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
  },
  cellText: {
    fontSize: 13,
    color: '#222',
    flexShrink: 1,
  },
  badge: {
    backgroundColor: PRIMARY,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '600',
  },
  leadIcon: {
    marginRight: 6,
  },
  inlineIcon: {
    marginHorizontal: 2,
  },
});
