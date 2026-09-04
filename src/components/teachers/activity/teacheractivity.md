# Teacher Activity — Feature Requirements

## Overview

Teacher Activity mirrors the Student Activity feature.  
Activities (Assignments, Tasks, Notifications) can be assigned **to** a teacher by another teacher/admin, or self-created.  
The teacher can submit them for review; a reviewer can close them with a rating.

---

## Excel Sheet: `TeacherActivity`

Same column structure as `StudentActivity`, with the `Assignee` column holding a **teacher email** (instead of a student reg number).

| Column                  | Type            | Notes                                          |
|-------------------------|-----------------|------------------------------------------------|
| id                      | string (UUID)   | Primary key                                    |
| ActivityType            | string          | `Assignment` \| `Task` \| `Notification`       |
| Category                | string          | From `assignmentCatRef` ref-table              |
| Course                  | string          | Optional — subject / course context            |
| Assignor                | string          | Teacher email of the creator                   |
| Assignee                | string          | Teacher email of the assignee                  |
| Reviewer                | string          | Teacher email — required for Assignment / Task |
| Title                   | string          |                                                |
| Description             | string          |                                                |
| StartDate               | string          | `dd/MMM/yyyy`                                  |
| EndDate                 | string          | `dd/MMM/yyyy` — not required for Notification  |
| Status                  | string          | `open` \| `in-progress` \| `in-review` \| `closed` |
| IsOverdue               | boolean         | Computed on close                              |
| SubmissionAttachments   | string          | Pipe-separated URLs                            |
| SubmissionNote          | string          |                                                |
| Rating                  | number          | 1–5, or -1 (overdue sentinel)                  |
| RatingNote              | string          | Reviewer's note                                |
| ClosedBy                | string          | Teacher email                                  |
| ClosedAt                | string          | ISO timestamp                                  |
| Revision                | number          |                                                |
| norm_rating             | number          | Computed: activityType weight × rating (see below) |
| Lastmodified            | string          | ISO timestamp                                  |

---

## norm_rating Logic

`norm_rating` is a **computed, persisted** column.
It is **never entered by the user** — it is calculated whenever a `rating` is written and stored both in the local DB and synced back to the Excel sheet.

### Formula

```
Normal (rating 1–5):
  Assignment   → norm_rating = 3 × rating
  Task         → norm_rating = 2 × rating
  Notification → norm_rating = rating   (no weight)

Overdue (rating = -1):
  Any type     → norm_rating = -1       (no multiplier — exact rating)
```

**Key rule:** The type-weight multiplier is **skipped when `rating < 0`**.
This means an overdue Assignment always yields `norm_rating = -1`, not `-3`.

The helper `computeActivityNormRating(activityType, rating)` lives in
`src/db/models/studentactivity.model.ts` and is imported directly by the teacher model:

```ts
export function computeActivityNormRating(
  activityType?: ActivityType,
  rating?: number,
): number | undefined {
  if (rating == null) return undefined;
  if (rating < 0)    return rating;           // overdue sentinel — no multiplier
  if (activityType === 'Assignment') return 3 * rating;
  if (activityType === 'Task')       return 2 * rating;
  return rating;
}
```

### When it is written

| Event                              | Who sets it                                                          |
|------------------------------------|----------------------------------------------------------------------|
| Reviewer closes activity (review mode) | `TeacherActivityForm` sets `rating` → mapper computes `norm_rating` |
| Activity closes overdue (isOverdue = true on review) | `rating` is forced to `-1`; `norm_rating` computed from that        |
| `toTeacherActivityModel()` (pull from Excel) | Mapper always recomputes `norm_rating` from stored `activityType` + `rating` |
| `backfillNormRating()` in `sync.service.ts` | Backfill pass recomputes and marks row `pending_update` if value changed |

### Sync wiring (`sync.service.ts`) ✅ done

1. **`SHEET_HEADERS['TeacherActivity']`** — identical header list to `StudentActivity`, includes `norm_rating`.
2. **`REQUIRED_COLUMNS['TeacherActivity']`** — `['norm_rating']` ensures the column is added to pre-existing workbooks.
3. **`backfillNormRating()`** — includes a `TeacherActivity` block; return type extended to `{ marksheet, activity, teacherActivity }`.

### registry.ts — COLUMN_MAP ✅ done

`EXCEL_KEY_MAPS['TeacherActivity']` added with the same field → Excel-column mappings as `StudentActivity`, including `norm_rating: 'norm_rating'`.

### registry.ts — TRANSFORMER ✅ done

`TRANSFORMERS['TeacherActivity']` added — `normalizeRow('TeacherActivity', raw)` now correctly maps raw rows through `toTeacherActivityModel`.

### Usage in rating / analytics

`norm_rating` feeds any teacher-performance dashboard or category-breakdown views, analogous to how `ratingUtils.ts` uses it for students:

- **Category breakdown** — group closed teacher activities by `category`, average their `norm_rating` per group.
- **Overall activity rating** — average `norm_rating` across all closed activities for a teacher.
- **Overdue penalty** — rows where `norm_rating = -1` count as a fixed negative contribution regardless of type weight.

---

## Data Layer

### Storage model

The project uses a **generic `synced_rows` SQLite table** (one JSON blob per row), keyed by sheet name.
There is **no dedicated Drizzle table** for activities — `schema.ts` does not need changes.
All activity repos extend `BaseRepository` which reads/writes `synced_rows` keyed by sheet name.

### Model — `src/db/models/teacheractivity.model.ts` ✅ done

- `TeacherActivityModel` interface — mirrors `StudentActivityModel`; `assignee` is teacher email
- `toTeacherActivityModel(row)` — mapper; calls `computeActivityNormRating` imported from `studentactivity.model`
- `parseTeacherAttachments()` / `serializeTeacherAttachments()` — local helpers (mirrors student variants)
- Re-exports `ActivityType` and `ActivityStatus` from `studentactivity.model`

### Repository — `src/db/repositories/teacheractivity.repository.ts` ✅ done

- `TeacherActivityRepository` / `teacherActivityRepository` singleton
- Methods: `findByAssignee`, `findByAssignor`, `findByReviewer`, `findByCourse`,
  `findByStatus`, `findByCourseAndTeacher`, `findOverdue`, `search`
- Sheet name used internally: `'TeacherActivity'` (via `SHEETS.TEACHER_ACTIVITY`)

### Repository index — `src/db/repositories/index.ts` ✅ done

Exports `TeacherActivityRepository` and `teacherActivityRepository`.

### Model index — `src/db/models/index.ts` ✅ done

`export * from './teacheractivity.model'` added.
Note: `studentactivity.model` is **not** re-exported from this index (it exists in the file system but was never added to the barrel). Consumer files import it directly — this is fine for now.

### Sync constant — `src/utils/constants.ts` ✅ done

```ts
TEACHER_ACTIVITY: 'TeacherActivity',
```

---

## Shared Types / Helpers (deferred)

The MD originally specified moving shared code to dedicated files. This **was not implemented** — all shared logic stays in the student files and is re-imported by the teacher files.

| Artefact                        | Where it actually lives                        | Originally planned location          |
|---------------------------------|------------------------------------------------|--------------------------------------|
| `ActivityType`, `ActivityStatus`| `studentactivity.model.ts` (re-exported by teacher model) | `src/db/models/activity.types.ts`   |
| `computeActivityNormRating()`   | `studentactivity.model.ts`                     | `src/db/models/activity.utils.ts`    |
| `isActivityOverdue()`           | `studentactivity.model.ts`                     | `src/db/models/activity.utils.ts`    |
| `parseAttachments()`            | `studentactivity.model.ts`                     | `src/db/models/activity.utils.ts`    |
| `serializeAttachments()`        | `studentactivity.model.ts`                     | `src/db/models/activity.utils.ts`    |
| `TYPE_COLORS`, `STATUS_COLORS`, `TYPE_ICONS` | `StudentActivityRow.tsx`         | `src/components/shared/activity/activityStyles.ts` |
| `ACTIVITY_TYPES`, `STATUS_OPTIONS` | `StudentActivityForm.tsx`                   | `src/components/shared/activity/activityConstants.ts` |

> **Rule:** Do not refactor these to shared locations until both student and teacher screens are stable.
> When moved, update all imports in both `studactivity/` and `teachers/activity/` and delete the originals.

---

## Screens

### 1. `TeacherActivityList` ✅ done

**File:** `src/components/teachers/activity/TeacherActivityList.tsx`

| Aspect               | Student version                              | Teacher version                                  |
|----------------------|----------------------------------------------|--------------------------------------------------|
| Repository           | `studentActivityRepository`                  | `teacherActivityRepository`                      |
| Section grouping     | Course → Student sub-header → rows           | Course → Teacher sub-header → rows               |
| Sub-header icon      | `person-outline`                             | `person-circle-outline`                          |
| Sub-header key       | Student reg number                           | Teacher email                                    |
| Name lookup          | `studentRepository`                          | `teacherRepository`                              |
| Sheet constant       | `SHEETS.STUDENT_ACTIVITY`                    | `SHEETS.TEACHER_ACTIVITY`                        |
| FAB target           | `StudentActivityForm`                        | `TeacherActivityForm`                            |
| Row component        | `StudentActivityRow`                         | `TeacherActivityRow`                             |
| Detail route         | `StudentActivityDetails`                     | `TeacherActivityDetails`                         |
| Prefill param        | `studentRegNumber`                           | `teacherEmail`                                   |

### 2. `TeacherActivityRow` ✅ done

**File:** `src/components/teachers/activity/TeacherActivityRow.tsx`

- Identical visual layout to `StudentActivityRow`
- Inline copies of `TYPE_COLORS`, `STATUS_COLORS`, `TYPE_ICONS` (shared files not yet created)
- Props accept `TeacherActivityModel`

### 3. `TeacherActivityForm` ✅ done

**File:** `src/components/teachers/activity/TeacherActivityForm.tsx`

| Aspect               | Student version                              | Teacher version                                  |
|----------------------|----------------------------------------------|--------------------------------------------------|
| Assignee dropdown    | Student reg numbers grouped by course        | Teacher emails (all active teachers)             |
| Assignor dropdown    | Teacher email                                | Teacher email                                    |
| Reviewer dropdown    | Teacher email                                | Teacher email                                    |
| Course options       | Derived from student's enrolled course       | Free-select from course list                     |
| Repository save      | `studentActivityRepository`                  | `teacherActivityRepository`                      |
| Sheet sync           | `SHEETS.STUDENT_ACTIVITY`                    | `SHEETS.TEACHER_ACTIVITY`                        |
| Prefill param        | `prefilledRegNumber`                         | `prefilledEmail`                                 |

**Modes:** `add` | `edit` | `submit` | `review` — same rules as student form.

### 4. `TeacherActivityDetailsScreen` ✅ done

**File:** `src/screens/TeacherActivityDetailsScreen.tsx`

Copy of `StudentActivityDetailsScreen` with all model / repository / route-name references replaced with teacher equivalents.

---

## Navigation

### `HomeStack.tsx` ✅ done

Param types registered:

```ts
TeacherActivityList:    { teacherEmail?: string; course?: string; headerTitle?: string }
TeacherActivityDetails: { item: TeacherActivityModel }
TeacherActivityForm:    { mode: 'add'|'edit'|'submit'|'review'; item?: TeacherActivityModel; prefilledEmail?: string; prefilledCourse?: string }
```

Three `Stack.Screen` registrations added.

### `screenRegistry.ts` ✅ done

Seven caption → route mappings added:

```ts
'Teacher Activity':            'TeacherActivityList',
'Teacher Activity View':       'TeacherActivityList',
'TeacherActivity View':        'TeacherActivityList',
'Teacher Assignments':         'TeacherActivityList',
'Teacher Assignments View':    'TeacherActivityList',
'Teacher Tasks':               'TeacherActivityList',
'Teacher Tasks View':          'TeacherActivityList',
```

---

## Index files ✅ done

| File                                        | What is exported                                                           |
|---------------------------------------------|----------------------------------------------------------------------------|
| `src/components/teachers/activity/index.ts` | `TeacherActivityList`, `TeacherActivityForm`, `TeacherActivityRow`         |
| `src/db/models/index.ts`                    | `* from './teacheractivity.model'`                                         |
| `src/db/repositories/index.ts`             | `TeacherActivityRepository`, `teacherActivityRepository`                   |

---

## Remaining Work

### Future work (not blocking)

| # | Task |
|---|------|
| 2 | Move shared types/helpers to `src/db/models/activity.types.ts` and `activity.utils.ts`; update all imports |
| 3 | Move shared UI constants to `src/components/shared/activity/activityStyles.ts` and `activityConstants.ts`; update imports in both student and teacher row/form files |
| 4 | Teacher-performance rating / analytics screens (analogous to `StudentRatingList` / `StudentRatingDetail`) |

---

## File map

### New files created

| File | Purpose |
|------|---------|
| `src/db/models/teacheractivity.model.ts` | Model, mapper, attachment helpers |
| `src/db/repositories/teacheractivity.repository.ts` | Repository singleton |
| `src/components/teachers/activity/TeacherActivityRow.tsx` | List row component |
| `src/components/teachers/activity/TeacherActivityList.tsx` | Grouped SectionList screen |
| `src/components/teachers/activity/TeacherActivityForm.tsx` | Add/Edit/Submit/Review form |
| `src/components/teachers/activity/index.ts` | Barrel export |
| `src/screens/TeacherActivityDetailsScreen.tsx` | Detail view screen |

### Modified files

| File | Change |
|------|--------|
| `src/db/models/studentactivity.model.ts` | Fixed `computeActivityNormRating` overdue guard (`if (rating < 0) return rating`) |
| `src/db/models/index.ts` | Added `teacheractivity.model` export |
| `src/db/repositories/index.ts` | Added `teacherActivityRepository` export |
| `src/utils/constants.ts` | Added `TEACHER_ACTIVITY: 'TeacherActivity'` |
| `src/db/models/registry.ts` | Added `TeacherActivity` to both `TRANSFORMERS` and `EXCEL_KEY_MAPS` |
| `src/sync/sync.service.ts` | Added `TeacherActivity` to `SHEET_HEADERS`, `REQUIRED_COLUMNS`, `backfillNormRating()` |
| `src/navigation/HomeStack.tsx` | Imports, param types, 3 × `Stack.Screen` registrations |
| `src/navigation/screenRegistry.ts` | 7 teacher activity caption → route mappings |

### Files intentionally NOT modified

| File | Reason |
|------|--------|
| `src/db/schema.ts` | Generic `synced_rows` table handles all activity data — no schema change needed |
| `src/navigation/TabNavigator.tsx` | Teacher Activity is reached from existing teacher detail screens, not a top-level tab |
