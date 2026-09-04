import { useState, useEffect, useMemo, useCallback } from 'react';
import { studentRepository } from '../../../db/repositories/student.repository';
import { studentMarkSheetRepository } from '../../../db/repositories/studentmarksheet.repository';
import { studentActivityRepository } from '../../../db/repositories/studentactivity.repository';
import { syncSheet } from '../../../sync/sync.service';
import { SHEETS } from '../../../utils/constants';
import type { StudentModel } from '../../../db/models/student.model';
import type { StudentMarkSheetModel } from '../../../db/models/studentmarksheet.model';
import type { StudentActivityModel } from '../../../db/models/studentactivity.model';
import {
  computeAcademicRating,
  computeSubjectRatings,
  computeActivityRating,
  computeActivityCount,
  computeOverallRating,
  computeActivityCategoryBreakdown,
  type SubjectRating,
  type ActivityCategoryRow,
} from './ratingUtils';

// ── Derived type ──────────────────────────────────────────────────────────────

export interface StudentRating {
  student: StudentModel;
  overallRating: number | null;
  academicRating: number | null;
  activityRating: number | null;
  activityCount: number;
  subjectRatings: SubjectRating[];
  assignmentCategories: ActivityCategoryRow[];
  taskCategories: ActivityCategoryRow[];
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

export type CourseHeader = { type: 'course'; course: string; count: number };
export type RatingRow    = { type: 'student'; data: StudentRating };
export type ListEntry    = CourseHeader | RatingRow;

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useStudentRatings() {
  const [students, setStudents]   = useState<StudentModel[]>([]);
  const [marks, setMarks]         = useState<StudentMarkSheetModel[]>([]);
  const [activities, setActivities] = useState<StudentActivityModel[]>([]);
  const [loading, setLoading]     = useState(true);
  const [syncing, setSyncing]     = useState(false);
  const [error, setError]         = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [s, m, a] = await Promise.all([
        studentRepository.findAll(),
        studentMarkSheetRepository.findAll(),
        studentActivityRepository.findAll(),
      ]);
      setStudents(s);
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
        syncSheet(SHEETS.STUDENTS),
        syncSheet(SHEETS.STUDENT_MARK_SHEET),
        syncSheet(SHEETS.STUDENT_ACTIVITY),
      ]);
      await load();
    } catch (e: any) {
      setError(e?.message ?? 'Sync failed');
    } finally {
      setSyncing(false);
    }
  }, [load]);

  // ── Per-student derived data ──────────────────────────────────────────────

  const ratings = useMemo<StudentRating[]>(() => {
    return students.map((student) => {
      const reg = student.regNumber ?? '';

      const studentMarks = marks.filter(
        (m) => (m.regNumber ?? '').toLowerCase() === reg.toLowerCase(),
      );
      const studentActivities = activities.filter(
        (a) => (a.assignee ?? '').toLowerCase() === reg.toLowerCase(),
      );

      const assignments   = studentActivities.filter((a) => a.activityType === 'Assignment');
      const tasks         = studentActivities.filter((a) => a.activityType === 'Task');
      const notifications = studentActivities.filter((a) => a.activityType === 'Notification');

      const closedAssignments = assignments.filter((a) => a.status === 'closed');
      const closedTasks       = tasks.filter((a) => a.status === 'closed');

      const academicRating  = computeAcademicRating(studentMarks);
      const activityRating  = computeActivityRating(studentActivities);
      const overallRating   = computeOverallRating(academicRating, activityRating);

      const assignmentAvgRating = computeActivityRating(assignments);
      const taskAvgRating       = computeActivityRating(tasks);

      return {
        student,
        overallRating,
        academicRating,
        activityRating,
        activityCount:          computeActivityCount(studentActivities),
        subjectRatings:         computeSubjectRatings(studentMarks),
        assignmentCategories:   computeActivityCategoryBreakdown(closedAssignments),
        taskCategories:         computeActivityCategoryBreakdown(closedTasks),
        assignmentClosed:       closedAssignments.length,
        assignmentOverdue:      assignments.filter((a) => a.isOverdue).length,
        assignmentTotal:        assignments.length,
        assignmentAvgRating,
        taskClosed:             closedTasks.length,
        taskOverdue:            tasks.filter((a) => a.isOverdue).length,
        taskTotal:              tasks.length,
        taskAvgRating,
        notificationTotal:      notifications.length,
        notificationOpen:       notifications.filter((a) => a.status !== 'closed').length,
        notificationClosed:     notifications.filter((a) => a.status === 'closed').length,
      };
    });
  }, [students, marks, activities]);

  // ── Grouped flat list ─────────────────────────────────────────────────────

  const buildList = useCallback(
    (search: string, courseFilter: string): ListEntry[] => {
      const q = search.toLowerCase().trim();

      const filtered = ratings.filter((r) => {
        // Exclude students with no mark sheet AND no activity records
        if (r.academicRating == null && r.activityRating == null) return false;

        const matchSearch =
          !q ||
          (r.student.fullName ?? '').toLowerCase().includes(q) ||
          (r.student.regNumber ?? '').toLowerCase().includes(q);
        const matchCourse =
          !courseFilter || (r.student.course ?? '') === courseFilter;
        return matchSearch && matchCourse;
      });

      // Group by course, sort courses alphabetically
      const courseMap = new Map<string, StudentRating[]>();
      for (const r of filtered) {
        const course = r.student.course ?? 'Unassigned';
        const group  = courseMap.get(course) ?? [];
        group.push(r);
        courseMap.set(course, group);
      }

      const entries: ListEntry[] = [];
      const sortedCourses = Array.from(courseMap.keys()).sort((a, b) =>
        a.localeCompare(b),
      );

      for (const course of sortedCourses) {
        const group = courseMap.get(course)!;
        group.sort((a, b) => (b.overallRating ?? -1) - (a.overallRating ?? -1));
        entries.push({ type: 'course', course, count: group.length });
        for (const r of group) entries.push({ type: 'student', data: r });
      }

      return entries;
    },
    [ratings],
  );

  const courses = useMemo(
    () =>
      Array.from(new Set(students.map((s) => s.course ?? '').filter(Boolean))).sort(),
    [students],
  );

  return { loading, syncing, error, ratings, buildList, courses, reload: load, sync };
}
