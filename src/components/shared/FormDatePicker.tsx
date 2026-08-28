/**
 * FormDatePicker — shared inline calendar date picker for forms.
 *
 * Supports two date formats via the `format` prop:
 *   'dmy'  →  DD/MMM/YYYY  (e.g. 15/Jan/2010)  — used by Student form
 *   'iso'  →  YYYY-MM-DD   (e.g. 2010-01-15)   — used by Teacher & Employee forms
 */
import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, KStyles } from '../../styles/kutties-styles';
import { MONTHS, daysInMonth } from '../../utils/constants';
import {
  parseDMYDate, formatDMYDate, applyDMYDateMask,
  parseISODate, formatISODate, applyISODateMask,
} from '../../utils/dateUtils';

const PRIMARY = Colors.primary;

interface FormDatePickerProps {
  value: string;
  onChange: (v: string) => void;
  /** 'dmy' = DD/MMM/YYYY (default) | 'iso' = YYYY-MM-DD */
  format?: 'dmy' | 'iso';
  editable?: boolean;
}

export default function FormDatePicker({
  value,
  onChange,
  format = 'dmy',
  editable = true,
}: FormDatePickerProps) {
  const today = new Date();

  const parse   = format === 'iso' ? parseISODate   : parseDMYDate;
  const fmt     = format === 'iso' ? formatISODate   : formatDMYDate;
  const mask    = format === 'iso' ? applyISODateMask : applyDMYDateMask;
  const ph      = format === 'iso' ? 'YYYY-MM-DD' : 'DD/MMM/YYYY';
  const kbType  = format === 'iso' ? 'number-pad' : 'default';
  const maxLen  = format === 'iso' ? 10 : 11;
  const autoCap = format === 'iso' ? 'none' : ('words' as any);

  const parsed = parse(value);
  const [calOpen, setCalOpen]     = useState(false);
  const [viewYear, setViewYear]   = useState(parsed?.getFullYear()  ?? today.getFullYear());
  const [viewMonth, setViewMonth] = useState(parsed?.getMonth()     ?? today.getMonth());

  useEffect(() => {
    if (parsed) {
      setViewYear(parsed.getFullYear());
      setViewMonth(parsed.getMonth());
    }
  }, [value]);

  const prevMonth = useCallback(() => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  }, [viewMonth]);

  const nextMonth = useCallback(() => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  }, [viewMonth]);

  const firstDow  = new Date(viewYear, viewMonth, 1).getDay();
  const totalDays = daysInMonth(viewYear, viewMonth + 1);
  const cells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const selectedDay = parsed?.getFullYear() === viewYear && parsed?.getMonth() === viewMonth
    ? parsed.getDate() : null;
  const todayDay    = today.getFullYear() === viewYear && today.getMonth() === viewMonth
    ? today.getDate() : null;

  if (!editable) {
    return (
      <View style={[KStyles.formInput, KStyles.formInputReadOnly]}>
        <Text style={KStyles.formInputReadOnlyText}>{value || '—'}</Text>
      </View>
    );
  }

  return (
    <View>
      <View style={KStyles.formDateRow}>
        <TextInput
          style={[KStyles.formInput, KStyles.formDateInput]}
          value={value}
          onChangeText={raw => onChange(mask(raw))}
          placeholder={ph}
          placeholderTextColor="#bbb"
          keyboardType={kbType}
          autoCapitalize={autoCap}
          maxLength={maxLen}
        />
        <TouchableOpacity
          style={[KStyles.formDateCalBtn, calOpen && KStyles.formDateCalBtnActive]}
          onPress={() => setCalOpen(o => !o)}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <Ionicons name="calendar-outline" size={20} color={calOpen ? '#fff' : PRIMARY} />
        </TouchableOpacity>
      </View>

      {calOpen && (
        <View style={KStyles.formCal}>
          <View style={KStyles.formCalNav}>
            <TouchableOpacity onPress={prevMonth} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="chevron-back" size={18} color={PRIMARY} />
            </TouchableOpacity>
            <Text style={KStyles.formCalMonthLabel}>{MONTHS[viewMonth]} {viewYear}</Text>
            <TouchableOpacity onPress={nextMonth} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="chevron-forward" size={18} color={PRIMARY} />
            </TouchableOpacity>
          </View>

          <View style={KStyles.formCalWeekRow}>
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
              <Text key={d} style={KStyles.formCalDowCell}>{d}</Text>
            ))}
          </View>

          {Array.from({ length: cells.length / 7 }, (_, row) => (
            <View key={row} style={KStyles.formCalWeekRow}>
              {cells.slice(row * 7, row * 7 + 7).map((day, col) => {
                const isSel = day !== null && day === selectedDay;
                const isTod = day !== null && day === todayDay;
                return (
                  <TouchableOpacity
                    key={col}
                    style={[
                      KStyles.formCalDayCell,
                      isSel && KStyles.formCalDayCellSelected,
                      !isSel && isTod && KStyles.formCalDayCellToday,
                    ]}
                    onPress={() => {
                      if (day !== null) {
                        onChange(fmt(new Date(viewYear, viewMonth, day)));
                        setCalOpen(false);
                      }
                    }}
                    disabled={day === null}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      KStyles.formCalDayText,
                      isSel && KStyles.formCalDayTextSelected,
                      !isSel && isTod && KStyles.formCalDayTextToday,
                    ]}>
                      {day ?? ''}
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
