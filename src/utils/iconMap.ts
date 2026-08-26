import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

export type IconEntry =
  | string
  | { ionicon: IoniconName; color: string };

const iconMap: Record<string, IconEntry> = {
  'Rating':               '⭐',
  'Manage':               '⚙️',
  'Time Table':           '🗓️',
  'Observation Qn':       '❓',
  'Fee Summary':          '🧾',
  'Expense':              { ionicon: 'arrow-up-circle', color: '#f3bd29' },
  'Staff Salary':         '💰',
  'Student Fee Summary':  '💵',
  'Class Fee Summary':    '💸',
  'Pending Fees':         { ionicon: 'swap-horizontal', color: '#C62828' },
  'Pending Fees ':        { ionicon: 'swap-horizontal', color: '#C62828' },
  'Monthly Fee Summary':  '📊',
  'Financial Summary':    '📈',
  'Expeses Summary':      '📉',
  'Assignments':          '📝',
  'Assingment':           '📝',
  'Attendance':           '🙋',
  'Leave':                '🏖️',
  'Collect Fee':          '💵',
  'Fee Pending':          { ionicon: 'swap-horizontal', color: '#C62828' },
  'Progress Card':        '🏆',
  'Activity':             '🏃',
  'Salary':               '💰',
  'Schedule':             '📅',
  'My Schedule':          '🕐',
  'Teachers':             '👩‍🏫',
  'Course':               '🎓',
  'Students':             '👨‍🎓',
  'Finance':              '💹',
  'My Task':              '📋',
  'Employees':            '🧑‍💼',
  'Course Attendance':    '🙋',
  'Scan Attendance QR':   { ionicon: 'qr-code', color: '#1565C0' },
  'Class Diary':          '📖',
  'Holidays':             '🌞',
  'My Students Marks':    '🥇',
  'Student Diary':        '📓',
  'Parent Note':          '💬',
  'FeedBack/Complaints':  '📣',
  'Enquiries':            '🔍',
  'Handbook':             '📚',
  'Meeting Notes':        '🗒️',
  'Health Data':          '🏥',
};

export function getIconForCaption(caption: string): IconEntry | null {
  return iconMap[caption.trim()] ?? null;
}
