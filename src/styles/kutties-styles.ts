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
  // ── Header ──────────────────────────────────────────────────────────────────
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
  headerIcon:    { marginLeft: 14 },
  headerActions: { flexDirection: 'row', alignItems: 'center' },

  // ── FAB ─────────────────────────────────────────────────────────────────────
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

  // ── Card ─────────────────────────────────────────────────────────────────────
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    overflow: 'hidden',
    elevation: 2,
    boxShadow: '0px 2px 4px rgba(0,0,0,0.08)',
  },
  selected:    { backgroundColor: Colors.lightPink },
  center:      { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorBanner: {
    backgroundColor: Colors.errorBg,
    color: Colors.errorText,
    fontSize: 12,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },

  // ── List screen ─────────────────────────────────────────────────────────────
  listRoot:       { flex: 1, backgroundColor: '#F5F5F5' },
  searchRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface, margin: 10, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 6,
    elevation: 1, boxShadow: '0px 1px 3px rgba(0,0,0,0.05)',
  },
  searchIcon:  { marginRight: 6 },
  searchInput: { flex: 1, fontSize: 14, color: '#222', paddingVertical: 2 },
  selectionBanner: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: Colors.lightPink, paddingHorizontal: 16, paddingVertical: 8,
  },
  selectionText: { fontSize: 13, fontWeight: '600', color: Colors.primary },
  clearText:     { fontSize: 13, color: Colors.primary, textDecorationLine: 'underline' },
  emptyText:     { fontSize: 14, color: '#aaa' },

  // ── Row card ─────────────────────────────────────────────────────────────────
  rowContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
  },
  rowPressed: { backgroundColor: '#F5F5F5' },
  rowAvatar: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: Colors.primary,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 12, marginTop: 2,
  },
  rowAvatarText: { fontSize: 18, fontWeight: '700', color: '#fff' },
  rowInfo:       { flex: 1 },
  rowTwoCol:     { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 2 },
  rowLeftCol:    { flex: 1, paddingRight: 8 },
  rowRightCol:   { width: 155, alignItems: 'flex-end', gap: 4 },
  rowName:       { fontSize: 15, fontWeight: '700', color: '#1A1A1A' },
  rowActions:    { flexDirection: 'row', marginTop: 6, gap: 4 },
  rowActionBtn:  { padding: 7, borderRadius: 20, backgroundColor: '#F5F5F5' },
  rowTooltip: {
    position: 'absolute',
    bottom: '100%',
    left: '50%',
    transform: [{ translateX: -28 }],
    backgroundColor: 'rgba(33,33,33,0.88)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    zIndex: 99,
    minWidth: 56,
    alignItems: 'center',
    marginBottom: 4,
  },
  rowTooltipText: { fontSize: 11, color: '#fff', fontWeight: '500' },

  // ── Form screen ─────────────────────────────────────────────────────────────
  formRoot:         { flex: 1, backgroundColor: '#F5F5F5' },
  formScroll:       { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 24 },
  formSection: {
    fontSize: 12, fontWeight: '700', color: Colors.muted,
    textTransform: 'uppercase', letterSpacing: 0.8,
    marginTop: 18, marginBottom: 8,
  },
  formField:    { marginBottom: 12 },
  formLabel:    { fontSize: 13, fontWeight: '600', color: '#333', marginBottom: 4 },
  formRequired: { color: Colors.primary },
  formInput: {
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 14, color: '#1A1A1A',
  },
  formInputMultiline:    { height: 76, textAlignVertical: 'top' },
  formInputReadOnly:     { backgroundColor: '#FAFAFA', borderColor: Colors.border },
  formInputReadOnlyText: { fontSize: 14, color: '#1A1A1A' },
  formError:             { fontSize: 11, color: Colors.errorText, marginTop: 3 },

  // Date picker
  formDateRow:        { flexDirection: 'row', alignItems: 'center', gap: 8 },
  formDateInput:      { flex: 1 },
  formDateCalBtn: {
    width: 42, height: 42, borderRadius: 8, borderWidth: 1, borderColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff',
  },
  formDateCalBtnActive: { backgroundColor: Colors.primary },
  formCal: {
    marginTop: 6, backgroundColor: Colors.surface, borderWidth: 1,
    borderColor: Colors.border, borderRadius: 10, padding: 10,
  },
  formCalNav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 8, paddingHorizontal: 4,
  },
  formCalMonthLabel:    { fontSize: 14, fontWeight: '700', color: '#1A1A1A' },
  formCalWeekRow:       { flexDirection: 'row' },
  formCalDowCell: {
    flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '700',
    color: Colors.muted, paddingVertical: 4,
  },
  formCalDayCell: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    height: 34, borderRadius: 17, margin: 1,
  },
  formCalDayCellSelected: { backgroundColor: Colors.primary },
  formCalDayCellToday:    { backgroundColor: Colors.lightPink },
  formCalDayText:         { fontSize: 13, color: '#1A1A1A' },
  formCalDayTextSelected: { color: '#fff', fontWeight: '700' },
  formCalDayTextToday:    { color: Colors.primary, fontWeight: '700' },

  // Photo picker
  formPhotoContainer: {
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 10, padding: 12, alignItems: 'center',
  },
  formPhotoPreviewWrap:    { position: 'relative', marginBottom: 10 },
  formPhotoPreview:        { width: 100, height: 100, borderRadius: 50, borderWidth: 2, borderColor: Colors.border },
  formPhotoRemove:         { position: 'absolute', top: -4, right: -4, backgroundColor: '#fff', borderRadius: 11 },
  formPhotoPlaceholder: {
    width: 100, height: 100, borderRadius: 50, backgroundColor: '#F0F0F0',
    borderWidth: 1, borderColor: Colors.border, alignItems: 'center',
    justifyContent: 'center', marginBottom: 10,
  },
  formPhotoPlaceholderText: { fontSize: 11, color: Colors.muted, marginTop: 4 },
  formPhotoBtnRow:          { flexDirection: 'row', gap: 10 },
  formPhotoBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 8, borderWidth: 1, borderColor: Colors.primary, backgroundColor: '#fff',
  },
  formPhotoBtnText: { fontSize: 13, color: Colors.primary, fontWeight: '600' },

  // Status / switch row
  formStatusRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface,
    borderRadius: 10, padding: 14, borderWidth: 1, borderColor: Colors.border, marginBottom: 12,
  },
  formStatusLeft:  { flex: 1 },
  formStatusLabel: { fontSize: 14, fontWeight: '700', color: '#1A1A1A' },
  formStatusSub:   { fontSize: 12, color: Colors.muted, marginTop: 2 },

  // Audit card
  formAuditCard: {
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 12,
  },
  formAuditRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  formAuditLabel: { fontSize: 12, color: Colors.muted, fontWeight: '600' },
  formAuditValue: { fontSize: 12, color: '#555', flexShrink: 1, textAlign: 'right', marginLeft: 8 },

  // Inline dropdown (StudentForm)
  formDropdownBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  formDropdownValue:       { fontSize: 14, color: '#1A1A1A', flex: 1 },
  formDropdownPlaceholder: { fontSize: 14, color: '#bbb', flex: 1 },
  formDropdownList: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#E0E0E0',
    borderRadius: 8, marginTop: 4, maxHeight: 200, overflow: 'hidden',
  },
  formDropdownItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingVertical: 10,
  },
  formDropdownItemSelected:     { backgroundColor: '#FCE4EC' },
  formDropdownItemText:         { fontSize: 14, color: '#1A1A1A' },
  formDropdownItemTextSelected: { color: '#C2185B', fontWeight: '700' },

  // Footer / save button
  formFooter: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 16, backgroundColor: '#F5F5F5',
    borderTopWidth: 0.5, borderTopColor: Colors.border,
  },
  formSaveBtn: {
    backgroundColor: Colors.primary, borderRadius: 10, paddingVertical: 14,
    alignItems: 'center', elevation: 3,
    boxShadow: `0px 3px 6px ${Colors.primary}59`,
  },
  formSaveBtnDisabled: { opacity: 0.6 },
  formSaveBtnText:     { color: '#fff', fontSize: 15, fontWeight: '700' },

  // Snackbar
  formSnackbar: {
    position: 'absolute', bottom: 24, left: 16, right: 16,
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 10, paddingHorizontal: 16, paddingVertical: 13,
    elevation: 8, boxShadow: '0px 3px 6px rgba(0,0,0,0.20)',
  },
  formSnackbarText: { color: '#fff', fontSize: 14, fontWeight: '600', flex: 1 },

  // ── Details screen ───────────────────────────────────────────────────────────
  detailsRoot:  { flex: 1, backgroundColor: '#F5F5F5' },
  detailsScroll: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 24 },
  detailsHeroCard: {
    backgroundColor: Colors.surface, borderRadius: 14,
    alignItems: 'center', paddingVertical: 28, paddingHorizontal: 16,
    marginBottom: 12, elevation: 2, boxShadow: '0px 2px 6px rgba(0,0,0,0.08)',
  },
  detailsAvatar:            { width: 88, height: 88, borderRadius: 44, marginBottom: 14 },
  detailsAvatarPlaceholder: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: Colors.primary,
    justifyContent: 'center', alignItems: 'center', marginBottom: 14,
  },
  detailsAvatarText: { fontSize: 30, fontWeight: '700', color: '#fff' },
  detailsHeroName:        { fontSize: 20, fontWeight: '700', color: '#1A1A1A', textAlign: 'center' },
  detailsHeroDesignation: { fontSize: 14, color: Colors.primary, fontWeight: '600', marginTop: 4 },
  detailsStatusBadge: {
    marginTop: 10, paddingHorizontal: 14, paddingVertical: 4,
    borderRadius: 12, borderWidth: 1,
  },
  detailsStatusBadgeText:    { fontSize: 12, fontWeight: '700' },
  detailsStatusActive:       { backgroundColor: '#F1F8E9', borderColor: '#A5D6A7' },
  detailsStatusInactive:     { backgroundColor: '#F5F5F5', borderColor: '#BDBDBD' },
  detailsStatusActiveText:   { color: '#2E7D32' },
  detailsStatusInactiveText: { color: '#757575' },
  detailsQuickActions:    { flexDirection: 'row', gap: 10, marginBottom: 12 },
  detailsQaBtn: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.surface, borderRadius: 12,
    paddingVertical: 12, gap: 6,
    elevation: 1, boxShadow: '0px 1px 3px rgba(0,0,0,0.06)',
  },
  detailsQaBtnText: { fontSize: 12, fontWeight: '600', color: '#333' },
  detailsSection: {
    fontSize: 12, fontWeight: '700', color: Colors.muted,
    textTransform: 'uppercase', letterSpacing: 0.8,
    marginTop: 16, marginBottom: 8,
  },
  detailsCard: {
    backgroundColor: Colors.surface, borderRadius: 12,
    borderWidth: 0.5, borderColor: Colors.border,
    overflow: 'hidden', marginBottom: 4,
  },
  detailsPhotoCard: {
    backgroundColor: Colors.surface, borderRadius: 12,
    borderWidth: 0.5, borderColor: Colors.border,
    overflow: 'hidden', marginBottom: 4,
    alignItems: 'center', paddingVertical: 16,
  },
  detailsIdPhoto: { width: 200, height: 200, borderRadius: 8 },
  detailsInfoRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: 0.5, borderBottomColor: Colors.border,
  },
  detailsInfoIconWrap: { width: 28, marginTop: 2, marginRight: 10 },
  detailsInfoText:     { flex: 1 },
  detailsInfoLabel:    { fontSize: 11, fontWeight: '600', color: Colors.muted, marginBottom: 2 },
  detailsInfoValue:    { fontSize: 14, color: '#1A1A1A' },
  detailsInfoValueLink:{ color: Colors.primary },
});
