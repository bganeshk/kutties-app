import { useState, useEffect, useMemo, useCallback } from 'react';
import { teacherRepository } from '../../../db/repositories/teacher.repository';
import { studentMarkSheetRepository } from '../../../db/repositories/studentmarksheet.repository';
import { teacherActivityRepository } from '../../../db/repositories/teacheractivity.repository';
import { syncSheet } from '../../../sync/sync.service';
import { SHEETS } from '../../../utils/constants';
import type { TeacherModel } from '../../../db/models/teacher.model';
import type { StudentMarkSheetModel } from '../../../db/models/studentmarksheet.model';
import type { TeacherActivityModel } from '../../../db/models/teacheractivity.model';
import {
  computeTeacherAcademicRating,
  computeTeacherSubjectRatings,
  computeTeacherActivityRating,
  computeTeacherActivityCount,
  computeTeacherOverallRating,
  computeTeacherActivityCategoryBreakdown,
  type TeacherSubjectRating,
  type TeacherActivityCategoryRow,
} from './teacherRatingUtils';

// ── Derived type ──────────────────────────────────────────────────────────────

export interface TeacherRating {
  teacher: TeacherModel;
  overallRating: number | null;
  academicRating: number | null;
  activityRating: number | null;
  activityCount: number;
  subjectRatings: TeacherSubjectRating[];
  assignmentCategories: TeacherActivityCategoryRow[];
  taskCategories: TeacherActivityCategoryRow[];
  assignmentClosed: number;
  assignmentOverdue: number;
  assignmentTotal: number;
  assignmentAvgRating: number | null;
  taskClosed: number;
  taskOverdue: number;
  taskTotal: number;
  taskAvgRating: number | null;
  notificationTotal: number;
  notificationOpen: number;
  notificationClosed: number;
}

// ── List entry (flat list with section headers) ───────────────────────────────

export type DepartmentHeader = { type: 'dept'; dept: string; count: number };
export type RatingRow        = { type: 'teacher'; data: TeacherRating };
export type ListEntry        = DepartmentHeader | RatingRow;

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useTeacherRatings() {
  const [teachers, setTeachers]     = useState<TeacherModel[]>([]);
  const [marks, setMarks]           = useState<StudentMarkSheetModel[]>([]);
  const [activities, setActivities] = useState<TeacherActivityModel[]>([]);
  const [loading, setLoading]       = useState(true);
  const [syncing, setSyncing]       = useState(false);
  const [error, setError]           = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [t, m, a] = await Promise.all([
        teacherRepository.findAll(),
        studentMarkSheetRepository.findAll(),
        teacherActivityRepository.findAll(),
      ]);
      setTeachers(t);
      setMarks(m);
      setActivities(a);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const sync = useCallback(async () => {
    setSyncing(true);
    try {
      await Promise.all([
        syncSheet(SHEETS.STAFF),
        syncSheet(SHEETS.STUDENT_MARK_SHEET),
        syncSheet(SHEETS.TEACHER_ACTIVITY),
      ]);
      await load();
    } catch (e: any) {
      setError(e?.message ?? 'Sync failed');
    } finally {
      setSyncing(false);
    }
  }, [load]);

  // ── Per-teacher derived data ───────────────────────────────────────────────

  const ratings = useMemo<TeacherRating[]>(() => {
    return teachers.map((teacher) => {
      // Trim + lowercase both sides to guard against Excel whitespace
      const teacherEmail = (teacher.email ?? '').trim().toLowerCase();

      // Marks joined by teacher email (subjTeacher stores email as unique key)
      const teacherMarks = teacherEmail
        ? marks.filter((m) => (m.subjTeacher ?? '').trim().toLowerCase() === teacherEmail)
        : [];

      // Activities joined by teacher email (case-insensitive, non-empty guard)
      const teacherActivities = teacherEmail
        ? activities.filter((a) => (a.assignee ?? '').trim().toLowerCase() === teacherEmail)
        : [];

      const assignments   = teacherActivities.filter((a) => a.activityType === 'Assignment');
      const tasks         = teacherActivities.filter((a) => a.activityType === 'Task');
      const notifications = teacherActivities.filter((a) => a.activityType === 'Notification');

      const closedAssignments = assignments.filter((a) => a.status === 'closed');
      const closedTasks       = tasks.filter((a) => a.status === 'closed');

      const academicRating  = computeTeacherAcademicRating(teacherMarks);
      const activityRating  = computeTeacherActivityRating(teacherActivities);
      const overallRating   = computeTeacherOverallRating(academicRating, activityRating);

      const assignmentAvgRating = computeTeacherActivityRating(assignments);
      const taskAvgRating       = computeTeacherActivityRating(tasks);

      return {
        teacher,
        overallRating,
        academicRating,
        activityRating,
        activityCount:         computeTeacherActivityCount(teacherActivities),
        subjectRatings:        computeTeacherSubjectRatings(teacherMarks),
        assignmentCategories:  computeTeacherActivityCategoryBreakdown(closedAssignments),
        taskCategories:        computeTeacherActivityCategoryBreakdown(closedTasks),
        assignmentClosed:      closedAssignments.length,
        assignmentOverdue:     assignments.filter((a) => a.isOverdue).length,
        assignmentTotal:       assignments.length,
        assignmentAvgRating,
        taskClosed:            closedTasks.length,
        taskOverdue:           tasks.filter((a) => a.isOverdue).length,
        taskTotal:             tasks.length,
        taskAvgRating,
        notificationTotal:     notifications.length,
        notificationOpen:      notifications.filter((a) => a.status !== 'closed').length,
        notificationClosed:    notifications.filter((a) => a.status === 'closed').length,
      };
    });
  }, [teachers, marks, activities]);

  // ── Grouped flat list ─────────────────────────────────────────────────────

  const buildList = useCallback(
    (search: string, deptFilter: string): ListEntry[] => {
      const q = search.toLowerCase().trim();

      const filtered = ratings.filter((r) => {
        // Treat blank/undefined status as active
        const status = (r.teacher.status ?? '').trim().toLowerCase();
        if (status !== '' && status !== 'active') return false;

        // Exclude teachers with no mark sheet AND no activity records
        if (r.academicRating == null && r.activityRating == null) return false;

        const matchSearch =
          !q ||
          (r.teacher.name ?? '').toLowerCase().includes(q) ||
          (r.teacher.email ?? '').toLowerCase().includes(q);
        const matchDept =
          !deptFilter || (r.teacher.department ?? '') === deptFilter;
        return matchSearch && matchDept;
      });

      // Group by department, sort alphabetically
      const deptMap = new Map<string, TeacherRating[]>();
      for (const r of filtered) {
        const dept = r.teacher.department?.trim() || 'Unassigned';
        const group = deptMap.get(dept) ?? [];
        group.push(r);
        deptMap.set(dept, group);
      }

      const entries: ListEntry[] = [];
      const sortedDepts = Array.from(deptMap.keys()).sort((a, b) =>
        a.localeCompare(b),
      );

      for (const dept of sortedDepts) {
        const group = deptMap.get(dept)!;
        group.sort((a, b) => (b.overallRating ?? -1) - (a.overallRating ?? -1));
        entries.push({ type: 'dept', dept, count: group.length });
        for (const r of group) entries.push({ type: 'teacher', data: r });
      }

      return entries;
    },
    [ratings],
  );

  const departments = useMemo(
    () =>
      Array.from(
        new Set(teachers.map((t) => t.department?.trim() ?? '').filter(Boolean)),
      ).sort(),
    [teachers],
  );

  return { loading, syncing, error, ratings, buildList, departments, reload: load, sync };
}
