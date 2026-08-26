import { StyleSheet } from 'react-native';

export const Colors = {
  primary:    '#C2185B',
  background: '#EEEEEE',
  surface:    '#fff',
  lightPink:  '#FCE4EC',
  activeGreen:'#C8E6C9',
  errorBg:    '#fce4ec',
  errorText:  '#b71c1c',
  muted:      '#888',
  border:     '#E0E0E0',
};

export const KStyles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    flex: 1,
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 14,
  },
  headerIcon: { marginLeft: 14 },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    boxShadow: `0px 3px 6px ${Colors.primary}66`,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    overflow: 'hidden',
    elevation: 2,
    boxShadow: '0px 2px 4px rgba(0,0,0,0.08)',
  },
  selected: { backgroundColor: Colors.lightPink },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorBanner: {
    backgroundColor: Colors.errorBg,
    color: Colors.errorText,
    fontSize: 12,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
});
