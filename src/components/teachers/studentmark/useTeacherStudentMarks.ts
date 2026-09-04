import { useState, useEffect, useMemo, useCallback } from 'react';
import { studentMarkSheetRepository } from '../../../db/repositories/studentmarksheet.repository';
import { studentRepository } from '../../../db/repositories/student.repository';
import { syncSheet } from '../../../sync/sync.service';
import { SHEETS } from '../../../utils/constants';
import type { StudentMarkSheetModel } from '../../../db/models/studentmarksheet.model';
import type { StudentModel } from '../../../db/models/student.model';

// ── Local types ───────────────────────────────────────────────────────────────

export interface TeacherMarkRow {
  mark: StudentMarkSheetModel;
  studentName: string;
  courseDivision: string; // student.course
}

export interface UseTeacherStudentMarksResult {
  rows: TeacherMarkRow[];
  loading: boolean;
  avgNormRating: number | null;
  distinctStudentCount: number;
  distinctSubjectCount: number;
  distinctTeacherCount: number;
  sync: () => Promise<void>;
  syncing: boolean;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useTeacherStudentMarks(): UseTeacherStudentMarksResult {
  const [marks, setMarks]       = useState<StudentMarkSheetModel[]>([]);
  const [students, setStudents] = useState<StudentModel[]>([]);
  const [loading, setLoading]   = useState(true);
  const [syncing, setSyncing]   = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [m, s] = await Promise.all([
        studentMarkSheetRepository.findAll(),
        studentRepository.findAll(),
      ]);
      setMarks(m);
      setStudents(s);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const sync = useCallback(async () => {
    setSyncing(true);
    try {
      await syncSheet(SHEETS.STUDENT_MARK_SHEET);
      await load();
    } finally {
      setSyncing(false);
    }
  }, [load]);

  // ── Derived rows (all marks, enriched with student info) ──────────────────

  const rows = useMemo<TeacherMarkRow[]>(() => {
    const studentMap = new Map<string, StudentModel>();
    for (const s of students) {
      if (s.regNumber) studentMap.set(s.regNumber.toLowerCase(), s);
    }

    return marks.map((m) => {
      const student = studentMap.get((m.regNumber ?? '').toLowerCase());
      return {
        mark: m,
        studentName: student?.fullName ?? m.regNumber ?? '',
        courseDivision: student?.course ?? '',
      };
    });
  }, [marks, students]);

  // ── Aggregates ────────────────────────────────────────────────────────────

  const avgNormRating = useMemo<number | null>(() => {
    const vals = rows
      .map((r) => r.mark.norm_rating)
      .filter((v): v is number => v != null);
    if (vals.length === 0) return null;
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  }, [rows]);

  const distinctStudentCount = useMemo(
    () => new Set(rows.map((r) => r.mark.regNumber ?? '')).size,
    [rows],
  );

  const distinctSubjectCount = useMemo(
    () => new Set(rows.map((r) => r.mark.subject ?? '')).size,
    [rows],
  );

  const distinctTeacherCount = useMemo(
    () => new Set(rows.map((r) => r.mark.subjTeacher ?? '')).size,
    [rows],
  );

  return {
    rows,
    loading,
    avgNormRating,
    distinctStudentCount,
    distinctSubjectCount,
    distinctTeacherCount,
    sync,
    syncing,
  };
}
