# Teacher Student Mark — Feature Requirements

## Overview

A **read-only** screen that shows **all marks** from `StudentMarkSheet`, grouped by
teacher (`subjTeacher` column). No teacher filter is applied — every mark record is
shown, organised by who taught the subject.

The screen has two display modes toggled by a top segment/tab:
- **By Student** — grouped teacher → student rows
- **By Subject** — grouped teacher → subject → course → student rows

Entry points:
- **Dashboard `appviewsheet` caption** (see Navigation section)

---

## Data Sources

| Source | Key fields used |
|---|---|
| `StudentMarkSheetModel` | `regNumber`, `subject`, `subjTeacher`, `examName`, `marksObtained`, `maxMarks`, `grade`, `norm_rating` |
| `StudentModel` | `regNumber`, `fullName`, `course` |

`subjTeacher` stores the **teacher's name** (not email). No timetable join is needed.
`recordedBy` is **not used** for grouping or filtering — teacher ownership is derived
exclusively from `subjTeacher`.

---

## Screen: `TeacherStudentMarkList`

**File:** `src/components/teachers/studentmark/TeacherStudentMarkList.tsx`

### Route params

```ts
TeacherStudentMarkList: {
  teacherEmail?: string;   // unused for filtering; kept for potential future use
  teacherName?: string;    // unused; header falls back to "Student Marks"
  headerTitle?: string;    // override header title
}
```

### Header

- Back arrow + title (`headerTitle` or `"Student Marks"`)
- Refresh icon (re-syncs `SHEETS.STUDENT_MARK_SHEET`)
- Segment control: **By Student** | **By Subject**

### By Student mode

Three-level accordion:

```
▶ Priya Sharma                                   [12]
      ▶ Ravi Kumar (REG001) (course)  [4]
          Subject | Mark/Max | Grade | Exam Type
          ──────────────────────────────────────
          Maths   | 45/50    | A+    | Monthly Exam-1
          Science | 38/50    | A     | Monthly Exam-1
```

**Level 1 — Teacher header** (`subjTeacher` value)
- Shows total mark-row count for that teacher
- Tap to expand/collapse; default collapsed

**Level 2 — Student sub-header** — `fullName (regNumber)` + course below
- Shows mark-row count for that student under this teacher
- Tap to expand/collapse; default collapsed
- Tapping the name area navigates to `TeacherStudentMarkDetailsScreen`

**Level 3 — Mark row** (one per `StudentMarkSheetModel`)
- Columns: Subject · Marks (marksObtained/maxMarks) · Grade · Exam Type (examName)

### By Subject mode

Five-level accordion:

```
▶ Priya Sharma                                   [12]
    ▶ Maths                        [A+]          [6]
        ▶ BSc CS (course)                        [3]
            ▶ Ravi Kumar (REG001)                [2]
                 Exam Type      | Mark/Max | Grade
                 ─────────────────────────────────
                 Monthly Exam-1 | 45/50    | A+
                 Monthly Exam-2 | 47/50    | A+
```

**Level 1 — Teacher header** (`subjTeacher`)
- Shows total mark-row count; tap to expand/collapse

**Level 2 — Subject sub-header** — subject name + avg grade badge (green) + count
- Avg grade computed over all marks for this subject (nearest letter via `GRADE_SCORE`)
- Tap to expand/collapse

**Level 3 — Course sub-header** — `courseDivision` value + count
- Tap to expand/collapse

**Level 4 — Student sub-header** — `fullName (regNumber)` + count
- Tapping the name area navigates to `TeacherStudentMarkDetailsScreen`

**Level 5 — Mark row**
- Columns: Exam Type · Marks (marksObtained/maxMarks) · Grade

### Search bar

Single input (below segment control) — filters across:
`subjTeacher`, `student fullName`, `regNumber`, `subject`, `examName`, `grade`

When search is active all sections auto-expand.

### Empty state

> "No mark records found."

---

## Screen: `TeacherStudentMarkDetails`

**File:** `src/screens/TeacherStudentMarkDetailsScreen.tsx`

Reached by tapping a student sub-header in either mode.
Shows a single student's complete mark profile (all marks, no teacher filter).

### Route params

```ts
TeacherStudentMarkDetails: {
  teacherEmail: string;   // kept for API compatibility; not used for filtering
  regNumber: string;
  studentName?: string;
}
```

The screen calls `useTeacherStudentMarks()` (no args) and filters client-side to
`regNumber`.

### Layout

**Hero card:** student `fullName`, `regNumber`, `course` badge

**Avg norm_rating chip** — computed over all marks for this student

**Subject-wise breakdown** (one card per subject, sorted A→Z):

```
┌─ Maths ──────────────────────── [A+] ──────────┐
│ Exam Type         Grade                         │
│ Monthly Exam-1    A+                            │
│ Monthly Exam-2    A+                            │
│ Q1 Exam           A                             │
│                                                 │
│ Avg norm_rating: 6.4    Avg grade: A+           │
└─────────────────────────────────────────────────┘
```

Each card shows:
- **Header:** subject name + avg grade badge (green, nearest letter via `GRADE_SCORE`)
- **Rows:** Exam Type + Grade only (no Mark/Max column)
- **Footer:** `Avg norm_rating: x.x` and `Avg grade: X` (each shown when available)

Each card is always open (non-collapsible). **Read-only — no FAB.**

---

## Route Params

```ts
// in HomeStackParamList:
TeacherStudentMarkList: {
  teacherEmail?: string;
  teacherName?: string;
  headerTitle?: string;
};
TeacherStudentMarkDetails: {
  teacherEmail: string;
  regNumber: string;
  studentName?: string;
};
```

---

## Navigation

### Flow

```
Dashboard caption → TeacherStudentMarkList
  └─ [tap student sub-header in either mode]
       └─ TeacherStudentMarkDetailsScreen
```

### `TabNavigator.tsx` — `makeTabStack`

```tsx
<Stack.Screen name="TeacherStudentMarkList"    component={TeacherStudentMarkList} />
<Stack.Screen name="TeacherStudentMarkDetails" component={TeacherStudentMarkDetailsScreen} />
```

### `HomeStack.tsx`

```tsx
<Stack.Screen name="TeacherStudentMarkList"    component={TeacherStudentMarkList} />
<Stack.Screen name="TeacherStudentMarkDetails" component={TeacherStudentMarkDetailsScreen} />
```

### `screenRegistry.ts`

```ts
'Teacher Student Marks':         'TeacherStudentMarkList',
'Teacher Student Marks View':    'TeacherStudentMarkList',
'TeacherStudentMark View':       'TeacherStudentMarkList',
'Teacher Marks':                 'TeacherStudentMarkList',
'Teacher Marks View':            'TeacherStudentMarkList',
```

---

## Data Layer

**No new model, no new repository.**

| Repo | Usage |
|---|---|
| `studentMarkSheetRepository.findAll()` | All mark records |
| `studentRepository.findAll()` | Name + course lookup: `regNumber` → `fullName`, `course` |

All joins are done **in-memory** inside `useMemo` in the hook.

---

## Custom hook: `useTeacherStudentMarks`

**File:** `src/components/teachers/studentmark/useTeacherStudentMarks.ts`

```ts
interface TeacherMarkRow {
  mark: StudentMarkSheetModel;
  studentName: string;
  courseDivision: string;   // student.course
}

interface UseTeacherStudentMarksResult {
  rows: TeacherMarkRow[];
  loading: boolean;
  avgNormRating: number | null;
  distinctStudentCount: number;
  distinctSubjectCount: number;
  distinctTeacherCount: number;
  sync: () => Promise<void>;
  syncing: boolean;
}

function useTeacherStudentMarks(): UseTeacherStudentMarksResult
```

**Logic:**

1. Load all mark rows and student rows in `Promise.all`.
2. Build a `Map<regNumber, StudentModel>` for name / course lookup.
3. Map every mark to a `TeacherMarkRow` — no filtering.
4. Return derived aggregates.

Sync pulls `SHEETS.STUDENT_MARK_SHEET` only.

---

## Avg grade helper (`avgGradeLabel`)

Used in both `TeacherStudentMarkList` and `TeacherStudentMarkDetailsScreen`.

```ts
// Defined locally in each file (not shared via hook)
import { GRADE_SCORE } from '../db/models/studentmarksheet.model';

const GRADE_ENTRIES = Object.entries(GRADE_SCORE).sort(([, a], [, b]) => b - a);

function avgGradeLabel(rows: TeacherMarkRow[]): string | null  // list variant
function avgGradeLabel(grades: string[]): string | null        // string variant
```

- Maps each grade to its `GRADE_SCORE` numeric value.
- Averages the scores.
- Returns the grade label whose score is **closest** to the average.

---

## Index file

**File:** `src/components/teachers/studentmark/index.ts`

```ts
export { default as TeacherStudentMarkList } from './TeacherStudentMarkList';
```

---

## File Map

### New files

| File | Purpose |
|---|---|
| `src/components/teachers/studentmark/TeacherStudentMarkList.tsx` | Main list (By Student / By Subject) |
| `src/components/teachers/studentmark/useTeacherStudentMarks.ts` | Data hook — load + enrich all marks |
| `src/components/teachers/studentmark/index.ts` | Barrel export |
| `src/screens/TeacherStudentMarkDetailsScreen.tsx` | Per-student detail view |

### Modified files

| File | Change |
|---|---|
| `src/navigation/HomeStack.tsx` | Import + 2 × `Stack.Screen` + 2 param types |
| `src/navigation/TabNavigator.tsx` | Import + 2 × `Stack.Screen` inside `makeTabStack` |
| `src/navigation/screenRegistry.ts` | 5 caption → route mappings |

### Files intentionally NOT modified

| File | Reason |
|---|---|
| `src/db/schema.ts` | No new table |
| `src/db/models/studentmarksheet.model.ts` | Model unchanged |
| `src/db/repositories/studentmarksheet.repository.ts` | No new query needed |
| `src/db/repositories/coursetimetable.repository.ts` | No longer used by this feature |
| `src/screens/TeacherDetailsScreen.tsx` | No quick-action added |

---

## Constraints

- **Read-only** — no FAB, no edit/delete, no form navigation.
- **No new repository** — all reads use existing singletons.
- **No new model** — `TeacherMarkRow` is a local interface inside the hook file.
- **No timetable join** — ownership is derived purely from `subjTeacher` (teacher name).
- Sync on demand only: pulls `SHEETS.STUDENT_MARK_SHEET`; no auto-push.
- No summary bar (avg rating / student count) in the list screen.
