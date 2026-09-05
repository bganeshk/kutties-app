# Course Activity — Requirements

> **Last updated:** reflects reftbl-driven dropdowns and reuse decisions from StudentActivity / TeacherActivity modules.


## Overview

A **Course Activity** is an activity assigned to a **course** or the **school** as a whole,
rather than to an individual student. It mirrors the structure of `StudentActivity` but
differs in scope, assignee resolution, and grading targets.

---

## Scope & Assignee Rules

| Assignment Level | Default Assignee         | Override Allowed?      |
|-----------------|--------------------------|------------------------|
| Course (class)  | Class teacher of that course | Yes — any teacher   |
| School          | Principal / admin staff  | Yes — any teacher      |

- The `assignee` field stores a **teacher email** (not a student reg number).
- The `scope` field distinguishes `'course'` from `'school'`.
- When scope is `'course'`, the `course` field is required.
- When scope is `'school'`, the `course` field is optional (school-wide event).

---

## Grading / Rating Target

Course activities support two grading modes, set at creation time via `gradingTarget`:

| `gradingTarget`    | Meaning                                                            |
|--------------------|--------------------------------------------------------------------|
| `'individual'`     | Each participating student is rated/awarded separately.            |
| `'class'`          | The class (course) as a whole receives a single rating/award.      |

- When `gradingTarget = 'individual'`, child `StudentActivity` records are created
  (one per participating student) and linked via `courseActivityId`.
- When `gradingTarget = 'class'`, the rating sits on the `CourseActivity` record itself.

---

## Examples

**Example 1 — Sports Day (school-level, individual grading)**
- `scope`: `'school'`
- `gradingTarget`: `'individual'`
- `activityType`: `'Task'` or `'Assignment'`
- Coordinator (assignee): a teacher
- Each student earns their own rating/award → linked `StudentActivity` per student

**Example 2 — Christmas Decoration (class-level, class grading)**
- `scope`: `'course'`
- `gradingTarget`: `'class'`
- `activityType`: `'Task'`
- Coordinator: class teacher or a designated student leader (stored in `coordinator` field)
- The whole class gets one rating → rating stored on `CourseActivity`

---

## Reference Data (reftbl)

Both activity **category** and **activity type** are driven by the `reftbl` sheet
(same mechanism used by `StudentActivityForm` and `TeacherActivityForm`):

| Field          | reftbl column key   | Notes                                                         |
|----------------|---------------------|---------------------------------------------------------------|
| `category`     | `assignmentCatRef`  | Already used by Student & Teacher activity forms via `getRefOptions('assignmentCatRef')` |
| `activityType` | `assignmentTyperef` | New column to be added to reftbl; replaces the hard-coded `['Assignment', 'Task', 'Notification']` constant |

- Both dropdowns use the shared `RefDropdown` component (wraps `SingleSelectDropdown` with a loading spinner).
- Load pattern: `ensureReftbl()` once, then `getRefOptions(key)` — identical to the existing forms.
- **Important:** `assignmentTyperef` column must be added to the reftbl Excel sheet before this
  feature goes live. Until then, fall back to the hard-coded list as a default.

---

## Reusable Components (from existing modules)

The following shared and module-level components are used **as-is** — no duplication:

| Component | Location | Used for |
|-----------|----------|----------|
| `RefDropdown` | `src/components/shared/RefDropdown.tsx` | Category and activity-type dropdowns |
| `SingleSelectDropdown` | `src/components/shared/SingleSelectDropdown.tsx` | Course, assignee, reviewer, scope, gradingTarget pickers |
| `Field` / `InputField` | `src/components/shared/FormField.tsx` | All form fields |
| `FormDatePicker` | `src/components/shared/FormDatePicker.tsx` | Start/end date pickers |
| `Snackbar` / `useSnackbar` | `src/components/shared/Snackbar.tsx` | Save/error toasts |
| `ConfirmDialog` | `src/components/shared/ConfirmDialog.tsx` | Delete confirmation |
| `AuditRow` | `src/components/shared/AuditRow.tsx` | Last-modified audit row in forms |
| `InfoRow` | `src/components/shared/InfoRow.tsx` | Details screen field rows |
| `KStyles` / `Colors` | `src/styles/kutties-styles.ts` | All layout and colour tokens |

**Activity Row visual constants** (`TYPE_COLORS`, `STATUS_COLORS`, `TYPE_ICONS`) are
duplicated in both `StudentActivityRow` and `TeacherActivityRow` with identical values.
For `CourseActivityRow`, copy the same constants locally (no shared export exists yet).

**Course + class-teacher auto-fill logic** is already in `TeacherActivityForm`
(`courseRepository.findAll()` → `courseClassTeachers[]` → auto-set assignee on course change).
`CourseActivityForm` reuses this exact pattern.

---

## Data Model — `CourseActivityModel`

Extends the same field set as `StudentActivityModel` / `TeacherActivityModel` with these additions:

| Field            | Type                              | Description                                              |
|------------------|-----------------------------------|----------------------------------------------------------|
| `id`             | `string`                          | UUID primary key                                         |
| `activityType`   | `string`                          | From reftbl `assignmentTyperef` (e.g. Assignment / Task) |
| `scope`          | `'course' \| 'school'`            | Whether the activity belongs to a class or the school    |
| `course`         | `string?`                         | Course name (required when scope = `'course'`)           |
| `category`       | `string?`                         | From reftbl `assignmentCatRef` (e.g. "Sports")           |
| `title`          | `string`                          | Activity title                                           |
| `description`    | `string?`                         | Full description / instructions                          |
| `startDate`      | `string?`                         | `dd/MMM/yyyy`                                            |
| `endDate`        | `string?`                         | `dd/MMM/yyyy`                                            |
| `assignor`       | `string?`                         | Staff email — who created / assigned the activity        |
| `assignee`       | `string?`                         | Teacher email — coordinator (defaults to class teacher)  |
| `coordinator`    | `string?`                         | Optional student leader name/id (Example 2)              |
| `reviewer`       | `string?`                         | Staff email — reviewer for Assignment/Task               |
| `gradingTarget`  | `'individual' \| 'class'`         | Where rating/award is applied                            |
| `status`         | `ActivityStatus`                  | `'open' \| 'in-progress' \| 'in-review' \| 'closed'`    |
| `isOverdue`      | `boolean?`                        | Computed; stored on close                                |
| `rating`         | `number?`                         | 1–5 (class-level grading only); `-1` = overdue sentinel  |
| `ratingNote`     | `string?`                         | Reviewer note on the rating                              |
| `submissionNote` | `string?`                         | Coordinator's submission note                            |
| `submissionAttachments` | `string[]?`              | Pipe-separated URLs                                      |
| `closedBy`       | `string?`                         | Staff email who closed                                   |
| `closedAt`       | `string?`                         | ISO timestamp                                            |
| `revision`       | `number?`                         | Sync revision counter                                    |
| `norm_rating`    | `number?`                         | Weighted rating (mirrors StudentActivity logic)          |

`ActivityStatus` is re-exported from `studentactivity.model.ts` (same as `TeacherActivityModel`).

---

## Excel Sheet

Sheet name: `CourseActivity`

Columns (PascalCase, mirroring existing activity sheets):
```
id, ActivityType, Scope, Course, Category, Title, Description,
StartDate, EndDate, Assignor, Assignee, Coordinator, Reviewer,
GradingTarget, Status, IsOverdue, SubmissionAttachments, SubmissionNote,
Rating, RatingNote, ClosedBy, ClosedAt, norm_rating, Revision, Lastmodified
```

**reftbl prerequisite:** add column `assignmentTyperef` to the `reftbl` sheet with
values such as `Assignment`, `Task`, `Notification` (one value per row, same pattern
as `assignmentCatRef`).

---

## UI Flows

### List Screen (`CourseActivityList`)
- Grouped by **scope** (School → Course sections), then by course name.
- Collapsible sections (same accordion pattern as `StudentActivityList`).
- Filters: status, activity type, assignee (teacher).
- FAB → `CourseActivityForm` (mode: `'add'`).

### Form Screen (`CourseActivityForm`)
- Modes: `'add' | 'edit' | 'submit' | 'review'`
- In `add/edit` mode:
  - **Activity Type** — `RefDropdown` backed by reftbl `assignmentTyperef`.
    Falls back to hard-coded `['Assignment', 'Task', 'Notification']` if reftbl returns empty.
  - **Category** — `RefDropdown` backed by reftbl `assignmentCatRef` (identical to existing forms).
  - Scope picker (`'course'` / `'school'`) — `SingleSelectDropdown`.
  - Course picker — `SingleSelectDropdown` (visible only when scope = `'course'`);
    auto-fills `assignee` with class teacher on selection (reuses TeacherActivityForm pattern).
  - GradingTarget picker (`'individual'` / `'class'`) — `SingleSelectDropdown`.
  - Assignee (teacher) — `SingleSelectDropdown` from `teacherRepository`.
  - Coordinator field — free-text `InputField` (optional).
  - Assignor, Reviewer, Title, Description, Dates — same shared components as existing forms.
- In `submit` mode: submission note + attachments (same as `StudentActivityForm`).
- In `review` mode: rating (1–5, star row) + rating note + close action.
  - Rating shown only when `gradingTarget = 'class'`.
  - When `gradingTarget = 'individual'`, show an info message directing reviewer to rate
    students individually via their `StudentActivity` records.

### Details Screen (`CourseActivityDetailsScreen`)
- Hero card with title, type badge, status chip, scope tag.
- Sections: Activity info, Description, People, Grading, Submission, Close Info, Audit.
- Action buttons: Submit (in-progress + Assignment), Review & Rate (in-review).

---

## Navigation Entry Points

### How the app resolves screens from dashboard tiles

The dashboard is data-driven: each tile in the Excel `dashboard` sheet has a `Dashcaption`,
`appviewsheet`, and `parentview`. Navigation is resolved in two steps:

1. **`HomeScreen`** renders tiles where `parentview = 'Home'`.
   A tile with children (`hasChildren = true`) navigates to **`SubItemScreen`** using its
   `Dashcaption` as the new `parentview`.
   A tile without children calls `resolveScreen(appviewsheet)` to jump directly to a list screen.

2. **`SubItemScreen`** renders tiles for the given `parentview`.
   Uses `resolveScreen` plus caption-specific `is*Caption()` helpers for screens that need
   extra params (e.g. `isTeacherActivityCaption`, `isStudentActivityCaption`).

3. **`CoursesTabStack`** (Courses bottom tab) opens `SubItemScreen` rooted at
   `parentview = 'Course'`, then follows the same sub-item drill-down.

### Entry paths for Course Activity

Both paths below end at the same `CourseActivityList` screen:

| Entry | Path |
|-------|------|
| **Home dashboard → Course tile** | `HomeScreen` → `SubItemScreen (parentview="Course")` → `CourseActivityList` |
| **Courses tab** | `CoursesTabStack` root → `SubItemScreen (parentview="Course")` → `CourseActivityList` |

**Dashboard tile required:**
Add a row to the `dashboard` Excel sheet:
`Dashcaption = "Course Activity"`, `parentview = "Course"`, `appviewsheet = "Course Activity View"`

Additionally, **`CourseDetailsScreen`** gains an "Activity" quick-action button that navigates
directly to `CourseActivityList` with the course pre-filtered:

```ts
navigation.navigate('CourseActivityList', {
  course: item.courseName,
  headerTitle: `${item.courseName} Activities`,
})
```

### Route Definitions (`HomeStackParamList`)

```ts
CourseActivityList: {
  course?: string;
  scope?: 'course' | 'school';
  headerTitle?: string;
} | undefined;
CourseActivityDetails: { item: CourseActivityModel };
CourseActivityForm: {
  mode: 'add' | 'edit' | 'submit' | 'review';
  item?: CourseActivityModel;
  prefilledCourse?: string;
};
```

### `screenRegistry.ts` additions

```ts
// APP_SCREEN_MAP entries to add
'Course Activity':         'CourseActivityList',
'Course Activity View':    'CourseActivityList',
'CourseActivity View':     'CourseActivityList',
'Course Activities':       'CourseActivityList',
'Course Activities View':  'CourseActivityList',
```

New helper (same pattern as `isStudentActivityCaption`):

```ts
const COURSE_ACTIVITY_CAPTIONS = new Set([
  'course activity',
  'course activity view',
  'courseactivity view',
  'course activities',
  'course activities view',
]);
export function isCourseActivityCaption(caption: string): boolean {
  return COURSE_ACTIVITY_CAPTIONS.has(caption.trim().toLowerCase());
}
```

`SubItemScreen` gains one new `else if` branch after the `TeacherActivity` block:

```ts
} else if (screenName === 'CourseActivityList' || isCourseActivityCaption(caption)) {
  navigation.navigate('CourseActivityList', { headerTitle: caption });
}
```

---

## Implementation Files

| File | Purpose |
|------|---------|
| `src/db/models/courseactivity.model.ts` | Model, types, mapper |
| `src/db/repositories/courseactivity.repository.ts` | CRUD + query helpers |
| `src/utils/constants.ts` | Add `COURSE_ACTIVITY: 'CourseActivity'` to `SHEETS` |
| `src/components/course/activity/CourseActivityRow.tsx` | List row component |
| `src/components/course/activity/CourseActivityList.tsx` | Grouped list screen |
| `src/components/course/activity/CourseActivityForm.tsx` | Add/Edit/Submit/Review form |
| `src/components/course/activity/index.ts` | Barrel export |
| `src/screens/CourseActivityDetailsScreen.tsx` | Details screen |
| `src/navigation/screenRegistry.ts` | Add `Course Activity` map entries + `isCourseActivityCaption()` |
| `src/screens/SubItemScreen.tsx` | Add `else if` branch for `isCourseActivityCaption` |
| `src/navigation/HomeStack.tsx` | Register 3 new routes; `CourseDetailsScreen` action button |
| `src/navigation/TabNavigator.tsx` | Register 3 new routes in `CoursesTabStack` + `makeTabStack` |
| `src/screens/CourseDetailsScreen.tsx` | Add "Activity" quick-action button |
