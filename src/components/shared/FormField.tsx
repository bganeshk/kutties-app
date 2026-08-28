/**
 * FormField — shared form building blocks used across all entity forms.
 *
 * Exports:
 *   Field       — labelled row wrapper with optional required asterisk
 *   InputField  — text input that degrades to a read-only view when editable=false
 */
import React from 'react';
import { View, Text, TextInput } from 'react-native';
import { KStyles } from '../../styles/kutties-styles';

// ── Field ─────────────────────────────────────────────────────────────────────

interface FieldProps {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}

export function Field({ label, required, children }: FieldProps) {
  return (
    <View style={KStyles.formField}>
      <Text style={KStyles.formLabel}>
        {label}
        {required && <Text style={KStyles.formRequired}> *</Text>}
      </Text>
      {children}
    </View>
  );
}

// ── InputField ────────────────────────────────────────────────────────────────

interface InputFieldProps {
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'numeric' | 'number-pad';
  autoCapitalize?: 'none' | 'words' | 'sentences' | 'characters';
  multiline?: boolean;
  editable?: boolean;
}

export function InputField({
  value,
  onChangeText,
  placeholder,
  keyboardType,
  autoCapitalize,
  multiline,
  editable = true,
}: InputFieldProps) {
  if (!editable) {
    return (
      <View style={[KStyles.formInput, multiline && KStyles.formInputMultiline, KStyles.formInputReadOnly]}>
        <Text style={KStyles.formInputReadOnlyText}>{value || '—'}</Text>
      </View>
    );
  }
  return (
    <TextInput
      style={[KStyles.formInput, multiline && KStyles.formInputMultiline]}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor="#bbb"
      keyboardType={keyboardType ?? 'default'}
      autoCapitalize={autoCapitalize ?? 'sentences'}
      multiline={multiline}
      numberOfLines={multiline ? 3 : 1}
      editable={editable}
    />
  );
}
