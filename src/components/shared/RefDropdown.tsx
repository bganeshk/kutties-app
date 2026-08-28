/**
 * RefDropdown — shared single-select dropdown for reference/lookup fields.
 *
 * A thin wrapper over SingleSelectDropdown that adds an ActivityIndicator
 * while options are loading. Used for Course, Grade, Role, Department etc.
 *
 * Props:
 *   value       — currently selected string
 *   options     — list of string options
 *   onChange    — called with the newly selected value
 *   loading     — shows a spinner inside the trigger while true
 *   placeholder — trigger label when nothing is selected (default: 'Select…')
 *   title       — modal header title (default: 'Select an option')
 */
import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Colors } from '../../styles/kutties-styles';
import SingleSelectDropdown from './SingleSelectDropdown';

interface RefDropdownProps {
  value: string;
  options: string[];
  onChange: (v: string) => void;
  loading?: boolean;
  placeholder?: string;
  title?: string;
}

export default function RefDropdown({
  value,
  options,
  onChange,
  loading = false,
  placeholder = 'Select…',
  title = 'Select an option',
}: RefDropdownProps) {
  if (loading) {
    return (
      <View style={{ height: 44, justifyContent: 'center', paddingHorizontal: 12 }}>
        <ActivityIndicator size="small" color={Colors.primary} />
      </View>
    );
  }

  return (
    <SingleSelectDropdown
      selected={value}
      options={options}
      onChange={onChange}
      placeholder={placeholder}
      title={title}
    />
  );
}
