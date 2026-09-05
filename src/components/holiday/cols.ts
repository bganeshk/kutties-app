// Defines the optional columns of the Holiday grid.
// `Date` is always visible and is not included here.

export type ColKey = 'kg' | 'daycare' | 'tuition' | 'teachers' | 'day' | 'description';

export interface ColDef {
  key:    ColKey;
  label:  string;
  flex:   number;
  align:  'center' | 'left';
}

export const COLS: ColDef[] = [
  { key: 'kg',          label: 'KG',          flex: 2,   align: 'center' },
  { key: 'daycare',     label: 'Daycare',      flex: 2,   align: 'center' },
  { key: 'tuition',     label: 'Tuition',      flex: 2,   align: 'center' },
  { key: 'teachers',    label: 'Teachers',     flex: 2,   align: 'center' },
  { key: 'day',         label: 'Day',          flex: 1.5, align: 'center' },
  { key: 'description', label: 'Description',  flex: 4,   align: 'left'   },
];

export const DEFAULT_VISIBLE = new Set<ColKey>([
  'kg', 'daycare', 'tuition', 'teachers', 'day', 'description',
]);
