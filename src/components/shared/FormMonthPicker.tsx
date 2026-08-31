/**
 * FormMonthPicker — inline month+year picker for forms.
 *
 * Value format: "MMM YYYY"  (e.g. "Jun 2025")
 * When the user taps a month cell the picker closes and onChange fires.
 */
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, KStyles } from '../../styles/kutties-styles';

const PRIMARY = Colors.primary;

const MONTH_LABELS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

// Parse "MMM YYYY" → { month: 0-11, year }. Returns null when unparseable.
function parseMonthYear(val: string): { month: number; year: number } | null {
  if (!val) return null;
  const m = val.trim().match(/^([A-Za-z]{3})\s+(\d{4})$/);
  if (!m) return null;
  const idx = MONTH_LABELS.findIndex(
    (l) => l.toLowerCase() === m[1].toLowerCase(),
  );
  if (idx === -1) return null;
  return { month: idx, year: Number(m[2]) };
}

interface Props {
  value: string;
  onChange: (v: string) => void;
  editable?: boolean;
}

export default function FormMonthPicker({ value, onChange, editable = true }: Props) {
  const today   = new Date();
  const parsed  = parseMonthYear(value);

  const [calOpen,   setCalOpen]   = useState(false);
  const [viewYear,  setViewYear]  = useState(parsed?.year  ?? today.getFullYear());

  // Keep viewYear in sync if value changes externally
  useEffect(() => {
    const p = parseMonthYear(value);
    if (p) setViewYear(p.year);
  }, [value]);

  const selectedMonth = parsed?.year === viewYear ? parsed.month : null;
  const todayMonth    = today.getFullYear() === viewYear ? today.getMonth() : null;

  function selectMonth(monthIdx: number) {
    onChange(`${MONTH_LABELS[monthIdx]} ${viewYear}`);
    setCalOpen(false);
  }

  if (!editable) {
    return (
      <View style={[KStyles.formInput, KStyles.formInputReadOnly]}>
        <Text style={KStyles.formInputReadOnlyText}>{value || '—'}</Text>
      </View>
    );
  }

  return (
    <View>
      {/* Trigger row */}
      <View style={KStyles.formDateRow}>
        <TouchableOpacity
          style={[KStyles.formInput, KStyles.formDateInput, styles.displayBtn]}
          onPress={() => setCalOpen((o) => !o)}
          activeOpacity={0.7}
        >
          <Text style={value ? styles.displayText : styles.placeholder}>
            {value || 'Select month…'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[KStyles.formDateCalBtn, calOpen && KStyles.formDateCalBtnActive]}
          onPress={() => setCalOpen((o) => !o)}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <Ionicons name="calendar-outline" size={20} color={calOpen ? '#fff' : PRIMARY} />
        </TouchableOpacity>
      </View>

      {/* Inline month grid */}
      {calOpen && (
        <View style={KStyles.formCal}>
          {/* Year navigation */}
          <View style={KStyles.formCalNav}>
            <TouchableOpacity
              onPress={() => setViewYear((y) => y - 1)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="chevron-back" size={18} color={PRIMARY} />
            </TouchableOpacity>
            <Text style={KStyles.formCalMonthLabel}>{viewYear}</Text>
            <TouchableOpacity
              onPress={() => setViewYear((y) => y + 1)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="chevron-forward" size={18} color={PRIMARY} />
            </TouchableOpacity>
          </View>

          {/* 3-column × 4-row month grid */}
          {[0, 1, 2, 3].map((row) => (
            <View key={row} style={styles.monthRow}>
              {[0, 1, 2].map((col) => {
                const idx  = row * 3 + col;
                const isSel = idx === selectedMonth;
                const isTod = idx === todayMonth;
                return (
                  <TouchableOpacity
                    key={idx}
                    style={[
                      styles.monthCell,
                      isSel && styles.monthCellSelected,
                      !isSel && isTod && styles.monthCellToday,
                    ]}
                    onPress={() => selectMonth(idx)}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.monthText,
                      isSel && styles.monthTextSelected,
                      !isSel && isTod && styles.monthTextToday,
                    ]}>
                      {MONTH_LABELS[idx]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  displayBtn:  { justifyContent: 'center' },
  displayText: { fontSize: 14, color: '#1A1A1A' },
  placeholder: { fontSize: 14, color: '#bbb' },

  monthRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  monthCell: {
    flex: 1,
    marginHorizontal: 3,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F5F5',
  },
  monthCellSelected: { backgroundColor: PRIMARY },
  monthCellToday:    { backgroundColor: Colors.lightPink },
  monthText:         { fontSize: 13, fontWeight: '600', color: '#1A1A1A' },
  monthTextSelected: { color: '#fff' },
  monthTextToday:    { color: PRIMARY },
});
