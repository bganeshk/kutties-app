export type ColType =
  | 'text'
  | 'currency'
  | 'date'
  | 'phone'
  | 'email'
  | 'badge'
  | 'number';

export interface ColMeta {
  field: string | string[];   // supports nested: ['address', 'city']
  label?: string;
  type?: ColType;
  iconPrefix?: string;        // Ionicons name shown before value
  iconSuffix?: string;        // Ionicons name shown after value
  flex?: number;              // column flex weight (default 1)
  color?: string;             // override text color
}

export function getFieldValue(data: any, field: string | string[]): any {
  const keys = Array.isArray(field) ? field : [field];
  return keys.reduce((obj, key) => (obj != null ? obj[key] : undefined), data);
}

export function formatValue(value: any, type?: ColType): string {
  if (value == null || value === '') return '';
  switch (type) {
    case 'currency':
      return new Intl.NumberFormat('en-IN', {
        style: 'currency', currency: 'INR', maximumFractionDigits: 0,
      }).format(Number(value));
    case 'date':
      return new Date(value).toLocaleDateString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
      });
    case 'number':
      return Number(value).toLocaleString('en-IN');
    default:
      return String(value);
  }
}
