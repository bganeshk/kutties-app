# Student Observation — Requirements

## Overview

The **Student Observation** feature lets teachers record structured behavioural observations
against a predefined question set. Each question is answered **Yes / No** or left unanswered
(`""`), with an optional free-text **Remark**. Records are stored in the
`student_Observation_track` Excel sheet (synced to the local SQLite `synced_rows` table).

The observation questions are **read-only reference data** stored in `student_Observation_Qn`.
No admin screen exists for questions — they are managed entirely in Excel.

---

## Excel Sheets

### `student_Observation_Qn` — Question master (read-only, never written from the app)

| Excel column | Type    | Description |
|---|---|---|
| `id`         | string  | Unique question ID |
| `Question`   | string  | The observation question text |
| `Category`   | string  | Section header grouping (e.g. `Behaviour`, `Social`) |
| `SortOrder`  | number  | Display order within a category; lower = first |
| `Active`     | boolean | `true` = shown in forms; `false` = hidden |
| `course`     | string  | `'all'` or blank = every student; any other value = that course only |

**Course-filtering rule (applied at form load time):**

> Show a question when `active === true` AND (`course === 'all'` OR `course` is blank/undefined
> OR `course` matches the selected student's `course` field, case-insensitive).

### `student_Observation_track` — Observation answers (read + write)

| Excel column   | Type                      | Description |
|---|---|---|
| `id`           | string                    | UUID — primary key |
| `Student`      | string                    | Student `regNumber` |
| `ObsDate`      | string                    | Date of observation — `dd/MMM/yyyy` |
| `QuestionId`   | string                    | FK → `student_Observation_Qn.id` |
| `Answer`       | string                    | `"Yes"` / `"No"` / `""` (unanswered) |
| `Remark`       | string                    | Free-text remark (optional) |
| `RecordedBy`   | string                    | Teacher name who submitted |
| `revision`     | number                    | Sync revision counter |
| `lastmodified` | string                    | ISO timestamp of last change |

---

## Domain Models

### `StudentObservationQnModel`

```ts
export interface StudentObservationQnModel {
  id: string;
  question?: string;   // Excel: Question
  category?: string;   // Excel: Category
  sortOrder?: number;  // Excel: SortOrder
  active?: boolean;    // Excel: Active
  course?: string;     // Excel: course
}
```

### `StudentObservationTrackModel`

```ts
export interface StudentObservationTrackModel extends AuditFields {
  id: string;
  regNumber?:  string;
  obsDate?:    string;
  questionId?: string;
  answer?:     'Yes' | 'No' | '';
  remark?:     string;
  recordedBy?: string;
  revision?:   number;
}
```

---

## Component Files

```
src/components/student/observation/
  StudentObservationList.tsx   — list screen (all sessions, or single-student)
  StudentObservationForm.tsx   — add / edit / view form (one session = all applicable questions)
  index.ts                     — re-exports List + Form
```

> **No question-management screen exists.** Questions are maintained in Excel only.
> All `'Observation Qn'` / `'Observation'` dashboard cards navigate to `StudentObservationList`.

---

## List Screen — `StudentObservationList`

### Navigation params

```ts
StudentObservationList: {
  studentRegNumber?: string;
  studentName?:      string;
  headerTitle?:      string;
} | undefined;
```

When `studentRegNumber` is provided the list is **single-student mode** (entry from
`StudentDetailsScreen`). When absent it shows all students grouped by course.

### Layout — multi-student mode

Groups by **Course → Student**, collapsible:

```
┌─ GRADE 5 ───────────────────────────────────────────────── ▶ ┐
│  👤 Ravi Kumar  (KT-2024-001)                           [3]  │  ← tap to expand
│     ├── 12/Jul/2025 — 6 answers · 2 remarks                  │
│     └── 05/Jul/2025 — 6 answers                              │
└──────────────────────────────────────────────────────────────┘
```

### Layout — single-student mode

Groups by **date descending**; tap a session row to open `StudentObservationForm` in `'view'` mode:

```
┌── 12/Jul/2025 ──────────────────────────────────────── ▶ ─── ┐
│  6 answers · 2 remarks · Recorded by: Ms Priya               │
└──────────────────────────────────────────────────────────────┘
```

### Header bar

- Back button (present when navigated from `StudentDetailsScreen`)
- Title: `"<StudentName>'s Observations"` (single) or `"Student Observations"` (all)
- Sync / refresh icon (right)

### Search bar

Live-filter by student name, reg number, recorded-by teacher name, or date string.

### FAB

`+` → navigates to `StudentObservationForm` with `mode: 'add'` and `prefilledRegNumber`
pre-set in single-student mode.

---

## Form Screen — `StudentObservationForm`

### Navigation params

```ts
StudentObservationForm: {
  mode: 'add' | 'edit' | 'view';
  sessionRecords?: StudentObservationTrackModel[];  // edit/view only
  prefilledRegNumber?: string;                      // add mode, from StudentDetails
};
```

One **session** = one student + one date + answers to all applicable active questions.
Each answer is a separate row in `student_Observation_track`, but they are entered and
displayed together as a single form.

### Section 1 — Student

| Field       | Control                          | Editable in add | Editable in edit | Shown in view |
|---|---|---|---|---|
| Student     | `SingleSelectDropdown` (grouped by course, active only) | ✅ | ❌ (locked) | ✅ |
| Date        | `FormDatePicker` (`editable={!isView}`) | ✅ | ✅ | ✅ read-only |
| Recorded By | `SingleSelectDropdown` (teacher list)   | ✅ | ✅ | ✅ read-only |

### Section 2 — Observations

Questions are loaded after `loadingStudents` resolves:

1. `studentObservationQnRepository.findAll()` — if empty → `syncSheet(STUDENT_OBSERVATION_QN)`
2. `studentObservationQnRepository.findActive(student.course)` — course-filtered, active only
3. When student changes in **add** mode (`handleRegChange`) → `loadQuestions(reg)` re-runs

Questions are grouped by `category` (section header), sorted by `sortOrder` within each group.

For each question:

```
┌─ Behaviour ──────────────────────────────────────────────────┐
│  Q: Shows respect to classmates?                             │
│  [ Yes ]  [ No ]  [ — ]     ← toggle; — = unanswered/clear  │
│  Remark: ──────────────────────────────────────────────────  │
└──────────────────────────────────────────────────────────────┘
```

- **Yes** — green background when selected
- **No** — red background when selected
- **—** — grey; tapping when already selected clears answer back to `""`
- **Remark** — `TextInput`, single-line, optional; shown as read-only text in `view` mode
- In `view` mode all buttons are non-interactive (`activeOpacity={1}`, no `onPress`)

**Loading state:** `ActivityIndicator` + `"Loading questions…"` while `loadingQns === true`

**Empty state:** `"No observation questions configured for this course."` when `questions.length === 0`

### Section 3 — Audit (edit / view only)

Shows `lastmodified` from `sessionRecords[0]`.

### Validation (add / edit only)

| Rule | Error field |
|---|---|
| `regNumber` non-empty | `errors.regNumber` |
| `obsDate` non-empty | `errors.obsDate` |
| `recordedBy` non-empty | `errors.recordedBy` |
| At least one answer is `"Yes"` or `"No"` | `errors.answers` (shown above questions section) |

### Save behaviour

One `StudentObservationTrackModel` row is **upserted** per applicable question (including rows
with `answer === ""` to preserve a complete snapshot). Existing row IDs are reused on edit via
`existingIdMap`. After save: `syncSheet(STUDENT_OBSERVATION_TRACK)` fire-and-forget →
`navigation.goBack()`.

### Edit / view actions (header icons)

| Mode | Available icons |
|---|---|
| `add` | Close (`×`) |
| `view` | Edit (pencil) — `navigation.replace('StudentObservationForm', { mode:'edit', ... })` |
| `edit` | Close (`×`) + Trash (→ `ConfirmDialog` → `deleteSession`) |

### Delete behaviour

Deletes **all** `student_Observation_track` rows for `(regNumber, obsDate)` via
`studentObservationTrackRepository.deleteSession()` → sync → `navigation.goBack()`.

---

## Navigation Entry Points

### 1 — `StudentDetailsScreen` quick-action button ← **primary**

```tsx
<TouchableOpacity
  style={KStyles.detailsQaBtn}
  onPress={() => navigation.navigate('StudentObservationList', {
    studentRegNumber: item.regNumber,
    studentName:      item.fullName,
    headerTitle:      `${item.fullName ?? 'Student'}'s Observations`,
  })}
  activeOpacity={0.75}
>
  <Ionicons name="eye-outline" size={20} color="#00796B" />
  <Text style={KStyles.detailsQaBtnText}>Observation</Text>
</TouchableOpacity>
```

### 2 — Dashboard cards (via `screenRegistry.ts`)

All of the following `appviewsheet` / `Dashcaption` values resolve to `StudentObservationList`:

```
'Student Observation'        'Student Observation View'
'Observation'                'Observation View'
'Observation Qn'             'Observation Qn View'
'Student Observation Qn'     'Student Observation Qn View'
'ObservationQn'
```

Navigation goes through the generic `else` branch in `SubItemScreen` with
`{ headerTitle: caption }`.

### 3 — `makeTabStack` (Students tab) + `HomeStack`

Both `StudentObservationList` and `StudentObservationForm` are registered as
`<Stack.Screen>` in both navigators.

---

## DB / Sync Constants (`src/utils/constants.ts`)

```ts
STUDENT_OBSERVATION_QN:    'student_Observation_Qn',
STUDENT_OBSERVATION_TRACK: 'student_Observation_track',
```

---

## Repository Layer

### `studentObservationQnRepository`

| Method | Description |
|---|---|
| `findAll()` | All questions (active + inactive) |
| `findActive(studentCourse?)` | Active questions filtered by course. Pass `undefined`/`''` for all active. Sorted by `sortOrder` then question text. |

### `studentObservationTrackRepository`

| Method | Description |
|---|---|
| `findAll()` | All track records |
| `findByStudent(regNumber)` | All records for a student |
| `findBySession(regNumber, obsDate)` | All records for one session |
| `save(record)` | Upsert a single answer row |
| `deleteSession(regNumber, obsDate)` | Delete all rows for a session |
| `delete(id)` | Delete a single row |

---

## Model Registry (`src/db/models/registry.ts`)

### TRANSFORMERS

```ts
student_Observation_Qn:    (raw) => toStudentObservationQnModel(raw),
student_Observation_track: (raw) => toStudentObservationTrackModel(raw),
```

### EXCEL_KEY_MAPS

```ts
student_Observation_Qn: {
  question:  'Question',
  category:  'Category',
  sortOrder: 'SortOrder',
  active:    'Active',
  // 'course' matches the Excel column name exactly
},
student_Observation_track: {
  regNumber:    'Student',
  obsDate:      'ObsDate',
  questionId:   'QuestionId',
  answer:       'Answer',
  remark:       'Remark',
  recordedBy:   'RecordedBy',
  revision:     'revision',
  lastmodified: 'lastmodified',
},
```

---

## Icon Map (`src/utils/iconMap.ts`)

```ts
'Observation':            { ionicon: 'eye-outline',  color: '#00796B' },
'Student Observation':    { ionicon: 'eye-outline',  color: '#00796B' },
'Observation Qn':         '❓',
'Student Observation Qn': '❓',
```

---

## Question Loading — Known Issue & Fix

**Bug:** In `add` mode with no prefilled student, `loadQuestions('')` is called as soon as
`loadingStudents` becomes false. Because `regToStudent` is populated from the same
`useEffect`, `regToStudent[reg]?.course` returns `undefined` → `findActive(undefined)` →
returns **all active questions** regardless of course.

**Expected behaviour:** questions should only appear after a student is selected. If no student
is selected, the questions section should show a placeholder (`"Select a student to load questions"`).

**Fix (not yet applied):**

```ts
// Initial load — only load questions when a student is already known
useEffect(() => {
  if (!loadingStudents) {
    if (regNumber) {
      loadQuestions(regNumber);
    } else {
      setLoadingQns(false);   // ← stop spinner; show placeholder
    }
  }
}, [loadingStudents]); // eslint-disable-line react-hooks/exhaustive-deps
```

And in the JSX empty-state:

```tsx
questions.length === 0 && !regNumber
  ? <Text>Select a student to load questions.</Text>
  : <Text>No observation questions configured for this course.</Text>
```

---

## No-data States

| Condition | Behaviour |
|---|---|
| No observation records for student | Empty-state icon + `"No observations recorded yet"` |
| Questions loading | `ActivityIndicator` + `"Loading questions…"` |
| No student selected (add mode) | `"Select a student to load questions."` *(pending fix above)* |
| No active questions after student selected | `"No observation questions configured for this course."` |
