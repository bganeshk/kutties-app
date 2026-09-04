# Teacher Rating Screen — Requirements

## Overview

The **Teacher Rating** screen is a **read-only** screen that aggregates data from two
existing sheets — `StudentMarkSheet` (using `subjTeacher` as the teacher key) and
`TeacherActivity` — to compute a holistic performance rating for each teacher.  
There is **no separate Excel sheet** backing this screen; all data is derived at runtime
from the SQLite-local copies of those two sheets.

---

## Data Sources

| Source | Sheet key | Key join field |
|---|---|---|
| Academic ratings | `StudentMarkSheet` | `subjTeacher` (stores teacher **email**) |
| Activity ratings | `TeacherActivity` | `assignee` (stores teacher **email**) |
| Teacher master | `teachers` | `email` (unique identifier for both joins) |

> **Important join note:**
> `StudentMarkSheet.subjTeacher` contains the teacher's **email** (unique key, not name).
> `TeacherActivity.assignee` contains the teacher's **email**.
> Both are matched against `teacher.email` (case-insensitive).

---

## Computed Fields per Teacher

### 1. Academic Rating
- **Formula:** average of `norm_rating` across all `StudentMarkSheet` rows where
  `subjTeacher` matches the teacher's email (case-insensitive).
- Exclude rows where `norm_rating` is `undefined` / `null`.
- **Range:** floating-point, rounded to 1 decimal place for display.

### 2. Subject-wise Rating
- Group matched `StudentMarkSheet` rows by `subject`.
- For each subject, compute the average `norm_rating` of all its rows.
- Display as a list of `{ subject, avgNormRating, examCount }` pairs, sorted
  alphabetically by subject.

### 3. Activity Rating
- **Formula:** average of `norm_rating` across all `TeacherActivity` rows for the
  teacher where `status === 'closed'` and `norm_rating` is not `null`.
- `norm_rating` per row = activityType weight × `rating`
  (`Assignment` → ×3, `Task` → ×2, anything else → ×1).
- Overdue rows (`rating = -1`) yield `norm_rating = -1` (no multiplier).
- **Range:** floating-point, rounded to 1 decimal place for display.

### 4. Activity Count
- Total number of `TeacherActivity` rows for the teacher where `status === 'closed'`.

### 5. Overall Rating
- **Formula:** weighted average of Academic Rating and Activity Rating:
  ```
  overallRating = (academicRating × 0.7) + (activityRating × 0.3)
  ```
- If one component has no data (no marks or no closed activities), use the available
  component as-is (weight = 1.0 for that component).
- Rounded to 1 decimal place for display.

---

## Screen Layout

### List View — grouped by Department

Each department acts as a **section header** row, followed by teacher rows belonging to
that department. Teachers within a department are sorted by **Overall Rating descending**
(highest performer first). Departments are sorted alphabetically.

#### Section Header row
```
┌─────────────────────────────────────────────────────────────┐
│  🏫  <Department Name>                         [n teachers]  │
└─────────────────────────────────────────────────────────────┘
```

If a teacher has no `department` set, they appear under `"Unassigned"`.

#### Teacher summary row (in the list)
```
┌──────────────────────────────────────────────────────────────┐
│  <Teacher Name>  (<Email>)                Overall: ★ 4.2     │
│  Academic: 3.8     Activity: 4.8   Activities: 12            │
└──────────────────────────────────────────────────────────────┘
```

Fields shown in the list row:
- `name` + `email` (from teachers sheet)
- `overallRating` (star badge)
- `academicRating`
- `activityRating`
- `activityCount`

#### Detail / Expanded view (tap on a teacher row)

Opens a read-only detail screen (`TeacherRatingDetail`) with the following sections,
rendered as a `ScrollView` with collapsible cards.

---

##### Section 1 — Teacher Header Card
```
┌──────────────────────────────────────────────────────────────┐
│  [ photo / initials ]   Priya Sharma                         │
│                         Department: Science · Status: Active  │
└──────────────────────────────────────────────────────────────┘
```

- If `idphoto` is set, render image; otherwise render a circle with the teacher's initials.
- Show `name`, `email`, `department`, and `status`.
- Tapping navigates to `TeacherDetails` for that teacher.

---

##### Section 2 — Overall Rating Banner
```
┌──────────────────────────────────────────────────────────────┐
│          ★  4.2          Overall Rating                       │
│   Academic 3.8  ──────────────────────  Activity 4.8         │
└──────────────────────────────────────────────────────────────┘
```

- Large centred star + numeric value.
- Two sub-labels below: Academic Rating on the left, Activity Rating on the right.
- If a component is unavailable, display `—` in its place.

---

##### Section 3 — Academic Rating (collapsible card)

**Card header:** `📚 Academic Rating — 3.8`

**Content:**

Subject-wise rating table, one row per subject, sorted alphabetically:

| Subject | Avg Rating | Exams |
|---------|-----------|-------|
| English | 5.2       | 8     |
| Maths   | 4.5       | 8     |
| Science | 3.8       | 6     |

- **Subject** — `subject` field from `StudentMarkSheet`.
- **Avg Rating** — average `norm_rating` for that subject (rounded to 1 dp).
- **Exams** — count of `StudentMarkSheet` rows for that subject.
- Footer line: `Total exams recorded: <n>`

No-data state: `"No mark sheet records found for this teacher."`

---

##### Section 4 — Assignment Rating (collapsible card)

**Card header:** `📝 Assignments — Avg Rating 12.3  |  Closed: 5  |  Overdue: 2`

Header fields (always visible):
- Average `norm_rating` of closed Assignment rows.
- `Closed` — count of Assignment rows where `status === 'closed'`.
- `Overdue` — count of Assignment rows where `isOverdue === true`.

**Content — Category breakdown table:**

Group closed Assignment rows by `category`. For each category:

| Category | Count | Avg Rating | Overdue |
|----------|-------|-----------|---------|
| Lesson Plan | 3  | 13.5      | 1       |
| Admin       | 2  | 10.0      | 0       |

- **Category** — `category` field on the activity row; show `"Uncategorised"` if blank.
- **Count** — number of closed Assignment rows in this category.
- **Avg Rating** — average `norm_rating` for this category's rows.
- **Overdue** — count of rows in this category where `isOverdue === true`.

Footer line: `Total assignments: <all rows regardless of status>`

No-data state: `"No assignments recorded for this teacher."`

---

##### Section 5 — Task Rating (collapsible card)

**Card header:** `✅ Tasks — Avg Rating 8.1  |  Closed: 7  |  Overdue: 1`

Same structure as the Assignment card above but for `activityType === 'Task'`.

Footer line: `Total tasks: <all rows regardless of status>`

No-data state: `"No tasks recorded for this teacher."`

---

##### Section 6 — Notifications (informational, no rating)

**Card header:** `🔔 Notifications — Total: 4  |  Open: 1  |  Closed: 3`

Simple count summary only. Notifications carry no `norm_rating` and do not affect any
score. No category breakdown needed.

Omit this card entirely if there are zero Notification rows for the teacher.

---

## Rating Scale Reference (for display)

Same conventions as the student rating screen — display the raw computed value (e.g.
`★ 3.8`) rather than forcing a 0–5 or 0–10 scale.

For activity ratings, max `norm_rating` per row = `Assignment (×3) × rating 5 = 15`.

---

## Filter / Search Bar

- **Search by name or email** — live filter as user types.
- **Department filter dropdown** — "All Departments" (default) or pick a specific department.
- Both filters work simultaneously (AND logic).

---

## No-data States

| Condition | Message |
|---|---|
| No teachers loaded | "No teacher records found. Sync to load data." |
| No mark sheet rows for teacher | Academic Rating shown as `—` |
| No closed activity rows for teacher | Activity Rating shown as `—`, Activity Count = 0 |

---

## Navigation & Screen Names

### Screen registry

| Screen | Navigator name | Route params |
|---|---|---|
| Rating list | `TeacherRatingList` | _(none)_ |
| Rating detail | `TeacherRatingDetail` | `{ teacher: TeacherModel }` |

Add to `screenRegistry.ts` `APP_SCREEN_MAP`:
```ts
'Teacher Rating':        'TeacherRatingList',
'Teacher Rating View':   'TeacherRatingList',
'TeacherRating View':    'TeacherRatingList',
```

---

### Entry points

#### 1 — Home tab (dashboard card)

The dashboard (`HomeScreen`) navigates via `resolveScreen(appviewsheet)` when a card is
tapped. No code change needed beyond the `screenRegistry.ts` entries above.

```
Home tab → HomeMain (HomeStack)
         → resolveScreen("Teacher Rating")
         → TeacherRatingList
         → TeacherRatingDetail  (tap a teacher row)
```

#### 2 — Teachers tab (sub-item dashboard)

Both new screens must be registered in `makeTabStack`'s `Stack.Navigator` inside
`TabNavigator.tsx` alongside the existing teacher screens.

```
Teachers tab → SubItems (teachers dashboard)
             → Landing / TeacherRatingList  (via dashboard card)
             → TeacherRatingDetail          (tap a teacher row)
```

#### 3 — TeacherDetailsScreen quick-action button

Add a **"Rating"** quick-action button in `TeacherDetailsScreen` alongside existing
quick-action buttons. It navigates directly to `TeacherRatingDetail` for that specific
teacher, bypassing the list:

```tsx
<TouchableOpacity
  style={KStyles.detailsQaBtn}
  onPress={() => navigation.navigate('TeacherRatingDetail', { teacher: item })}
  activeOpacity={0.75}
>
  <Ionicons name="star-outline" size={20} color="#F57F17" />
  <Text style={KStyles.detailsQaBtnText}>Rating</Text>
</TouchableOpacity>
```

---

### Changes required in `HomeStackParamList` (`HomeStack.tsx`)

Add two entries to the `HomeStackParamList` type and two `<Stack.Screen>` registrations:

```ts
// In HomeStackParamList:
TeacherRatingList:   undefined;
TeacherRatingDetail: { teacher: TeacherModel };
```

```tsx
// In HomeStack Stack.Navigator:
<Stack.Screen name="TeacherRatingList"   component={TeacherRatingList} />
<Stack.Screen name="TeacherRatingDetail" component={TeacherRatingDetail} />
```

### Changes required in `TabNavigator.tsx`

Add the same two screens inside `makeTabStack`'s `Stack.Navigator`:

```tsx
<Stack.Screen name="TeacherRatingList"   component={TeacherRatingList} />
<Stack.Screen name="TeacherRatingDetail" component={TeacherRatingDetail} />
```

---

## Component Files

```
src/components/teachers/rating/
  TeacherRatingList.tsx     — list screen (FlatList, department section headers, search/filter)
  TeacherRatingDetail.tsx   — detail screen (read-only, subject table, activity breakdown)
  useTeacherRatings.ts      — custom hook: loads teachers + marks + activities,
                              computes all derived fields, returns sorted data
  teacherRatingUtils.ts     — pure functions: computeTeacherAcademicRating,
                              computeTeacherSubjectRatings, computeTeacherActivityRating,
                              computeTeacherActivityCount, computeTeacherOverallRating,
                              computeTeacherActivityCategoryBreakdown
  index.ts                  — re-exports
  rating.md                 — this file
```

---

## Implementation Notes

- **No writes** — this screen never calls `save`, `delete`, or `sync push`.
- **Sync** — a pull-only sync button refreshes `StudentMarkSheet`, `TeacherActivity`, and
  `teachers` (staff) from the API before recomputing.
- **Performance** — all computation happens inside `useTeacherRatings` using `useMemo`.
  FlatList uses `keyExtractor` on `teacher.id`.
- **Repositories to use:**
  - `studentMarkSheetRepository.findAll()` → `StudentMarkSheetModel[]`
  - `teacherActivityRepository.findAll()` → `TeacherActivityModel[]`
  - `teacherRepository.findAll()` → `TeacherModel[]`
- **No new model or DB schema** — purely a derived/computed view over existing tables.
- **Join strategy:**
  - Mark → teacher: `mark.subjTeacher?.toLowerCase() === teacher.email?.toLowerCase()`
  - Activity → teacher: `activity.assignee?.toLowerCase() === teacher.email?.toLowerCase()`

---

## `teacherRatingUtils.ts` — Pure Functions

```ts
// Mirrors ratingUtils.ts (student) but typed for teacher data sources

export interface TeacherSubjectRating {
  subject: string;
  avgNormRating: number;
  examCount: number;
}

export interface TeacherActivityCategoryRow {
  category: string;
  count: number;
  avgRating: number;
  overdueCount: number;
}

export function computeTeacherSubjectRatings(marks: StudentMarkSheetModel[]): TeacherSubjectRating[]
export function computeTeacherAcademicRating(marks: StudentMarkSheetModel[]): number | null
export function computeTeacherActivityCategoryBreakdown(activities: TeacherActivityModel[]): TeacherActivityCategoryRow[]
export function computeTeacherActivityRating(activities: TeacherActivityModel[]): number | null
export function computeTeacherActivityCount(activities: TeacherActivityModel[]): number
export function computeTeacherOverallRating(academicRating: number | null, activityRating: number | null): number | null
export function fmtRating(value: number | null): string   // shared helper — returns '—' for null
```

---

## `useTeacherRatings.ts` — Hook Interface

```ts
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

export type DepartmentHeader = { type: 'dept'; dept: string; count: number };
export type RatingRow        = { type: 'teacher'; data: TeacherRating };
export type ListEntry        = DepartmentHeader | RatingRow;

export function useTeacherRatings(): {
  loading: boolean;
  syncing: boolean;
  error: string | null;
  ratings: TeacherRating[];
  buildList: (search: string, deptFilter: string) => ListEntry[];
  departments: string[];
  reload: () => Promise<void>;
  sync: () => Promise<void>;
}
```

Sync pulls `SHEETS.STAFF`, `SHEETS.STUDENT_MARK_SHEET`, and `SHEETS.TEACHER_ACTIVITY`.

`buildList` filters to **active** teachers only, excludes teachers with no mark
sheet AND no activity records, groups by `teacher.department ?? 'Unassigned'`, sorts
departments alphabetically, sorts teachers within each department by `overallRating`
descending.

---

## File Map

### New files

| File | Purpose |
|---|---|
| `src/components/teachers/rating/teacherRatingUtils.ts` | Pure compute functions |
| `src/components/teachers/rating/useTeacherRatings.ts` | Data hook |
| `src/components/teachers/rating/TeacherRatingList.tsx` | List screen |
| `src/components/teachers/rating/TeacherRatingDetail.tsx` | Detail screen |
| `src/components/teachers/rating/index.ts` | Barrel export |

### Modified files

| File | Change |
|---|---|
| `src/navigation/HomeStack.tsx` | Import 2 components + 2 param types + 2 `Stack.Screen` entries |
| `src/navigation/TabNavigator.tsx` | Import 2 components + 2 `Stack.Screen` entries in `makeTabStack` |
| `src/navigation/screenRegistry.ts` | 3 caption → route mappings for `TeacherRatingList` |
| `src/screens/TeacherDetailsScreen.tsx` | Add "Rating" quick-action button |

### Files intentionally NOT modified

| File | Reason |
|---|---|
| `src/db/schema.ts` | No new table |
| `src/db/models/teacher.model.ts` | Model unchanged |
| `src/db/repositories/teacher.repository.ts` | No new query needed |
| `src/db/models/studentmarksheet.model.ts` | Model unchanged |
| `src/db/models/teacheractivity.model.ts` | Model unchanged |
