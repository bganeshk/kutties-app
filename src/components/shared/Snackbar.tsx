import React, { useRef, useCallback, useState } from 'react';
import { Animated, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export type SnackbarKind = 'success' | 'error' | 'info';

export function useSnackbar() {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState('');
  const [kind, setKind] = useState<SnackbarKind>('success');
  const opacity = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((msg: string, k: SnackbarKind = 'success') => {
    if (timer.current) clearTimeout(timer.current);
    setMessage(msg);
    setKind(k);
    setVisible(true);
    Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    timer.current = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }).start(() =>
        setVisible(false),
      );
    }, 2800);
  }, [opacity]);

  return { visible, message, kind, opacity, show };
}

interface SnackbarProps {
  visible: boolean;
  message: string;
  kind: SnackbarKind;
  opacity: Animated.Value;
}

export default function Snackbar({ visible, message, kind, opacity }: SnackbarProps) {
  if (!visible) return null;
  const bg = kind === 'success' ? '#2E7D32' : kind === 'error' ? '#B71C1C' : '#1565C0';
  const icon = kind === 'success' ? 'checkmark-circle' : kind === 'error' ? 'alert-circle' : 'information-circle';
  return (
    <Animated.View style={[styles.snackbar, { backgroundColor: bg, opacity }]}>
      <Ionicons name={icon as any} size={18} color="#fff" style={{ marginRight: 8 }} />
      <Text style={styles.snackbarText}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  snackbar: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 13,
    elevation: 8,
    boxShadow: '0px 3px 6px rgba(0,0,0,0.20)',
  },
  snackbarText: { color: '#fff', fontSize: 14, fontWeight: '600', flex: 1 },
});
