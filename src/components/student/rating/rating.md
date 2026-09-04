# Student Rating Screen — Requirements

## Overview

The **Student Rating** screen is a **read-only** screen that aggregates data from two existing
sheets — `StudentMarkSheet` and `StudentActivity` — to compute a holistic performance rating
for each student. There is **no separate Excel sheet** backing this screen; all data is derived
at runtime from the SQLite-local copies of those two sheets.

---

## Data Sources

| Source | Sheet key | Key join field |
|---|---|---|
| Academic ratings | `StudentMarkSheet` | `regNumber` |
| Activity ratings | `StudentActivity` | `assignee` (stores student `regNumber`) |
| Student master | `students` | `regNumber`, `course` |

---

## Computed Fields per Student

### 1. Academic Rating
- **Formula:** average of `norm_rating` across all `StudentMarkSheet` rows for the student.
- `norm_rating` on each row = `EXAM_WEIGHT[examName] × GRADE_SCORE[grade]`
  (already stored on the model via `computeNormRating`).
- Exclude rows where `norm_rating` is `undefined` / `null`.
- **Range:** floating-point, rounded to 1 decimal place for display.

### 2. Subject-wise Rating
- Group `StudentMarkSheet` rows by `subject`.
- For each subject, compute the average `norm_rating` of all its rows.
- Display as a list of `{ subject, avgNormRating }` pairs, sorted alphabetically by subject.

### 3. Activity Rating
- **Formula:** average of `norm_rating` across all `StudentActivity` rows for the student.
- `norm_rating` on each row = activityType weight × `rating`
  (`Assignment` → ×3, `Task` → ×2, anything else → ×1).
- Exclude rows where `norm_rating` is `undefined` / `null`.
- Only include rows whose `status === 'closed'` (only rated/closed activities matter).
- **Range:** floating-point, rounded to 1 decimal place for display.

### 4. Activity Count
- Total number of `StudentActivity` rows for the student where `status === 'closed'`.

### 5. Overall Rating
- **Formula:** weighted average of Academic Rating and Activity Rating.
  ```
  overallRating = (academicRating × 0.7) + (activityRating × 0.3)
  ```
- If one component has no data (no marks or no closed activities), use the available
  component as-is (weight = 1.0 for that component).
- Rounded to 1 decimal place for display.

---

## Screen Layout

### List View — grouped by Course

Each course acts as a **section header** row, followed by student rows belonging to that course.
Students within a course are sorted by **Overall Rating descending** (highest performer first).
Courses are sorted alphabetically.

#### Section Header row
```
┌─────────────────────────────────────────────────────────────┐
│  📘  <Course Name>                             [n students]  │
└─────────────────────────────────────────────────────────────┘
```

#### Student summary row (in the list)
```
┌──────────────────────────────────────────────────────────────┐
│  <Student Name>  (<RegNumber>)             Overall: ★ 4.2    │
│  Academic: 3.8     Activity: 4.8   Activities: 12            │
└──────────────────────────────────────────────────────────────┘
```

Fields shown in the list row:
- `fullName` + `regNumber` (from students sheet)
- `overallRating` (star badge)
- `academicRating`
- `activityRating`
- `activityCount`

#### Detail / Expanded view (tap on a student row)

Opens a read-only detail screen (`StudentRatingDetail`) with the following sections, rendered
as a `ScrollView` with collapsible cards.

---

##### Section 1 — Student Header Card

```
┌──────────────────────────────────────────────────────────────┐
│  [ photo / initials ]   Ravi Kumar (KT-2024-001)             │
│                         Course: Grade 5 · Status: Active     │
└──────────────────────────────────────────────────────────────┘
```

- If `idphoto` is set, render image; otherwise render a circle with the student's initials.
- Show `fullName`, `regNumber`, `course`, and `status`.

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
- **Exams** — count of `StudentMarkSheet` rows for that subject (all exam entries counted).
- Footer line: `Total exams recorded: <n>`

No-data state: `"No mark sheet records found for this student."`

---

##### Section 4 — Assignment Rating (collapsible card)

**Card header:** `📝 Assignments — Avg Rating 12.3  |  Closed: 5  |  Overdue: 2`

Header fields (always visible):
- Average `norm_rating` of closed Assignment rows (`Assignment` weight ×3, so max per row = 15).
- `Closed` — count of Assignment rows where `status === 'closed'`.
- `Overdue` — count of Assignment rows where `isOverdue === true`.

**Content — Category breakdown table:**

Group closed Assignment rows by `category`. For each category:

| Category | Count | Avg Rating | Overdue |
|----------|-------|-----------|---------|
| Maths    | 3     | 13.5      | 1       |
| Science  | 2     | 10.0      | 0       |

- **Category** — `category` field on the activity row; show `"Uncategorised"` if blank.
- **Count** — number of closed Assignment rows in this category.
- **Avg Rating** — average `norm_rating` for this category's rows.
- **Overdue** — count of rows in this category where `isOverdue === true`.

Footer line: `Total assignments: <closed + open + in-progress + in-review>`

No-data state: `"No assignments recorded for this student."`

---

##### Section 5 — Task Rating (collapsible card)

**Card header:** `✅ Tasks — Avg Rating 8.1  |  Closed: 7  |  Overdue: 1`

Header fields (always visible):
- Average `norm_rating` of closed Task rows (`Task` weight ×2, so max per row = 10).
- `Closed` — count of Task rows where `status === 'closed'`.
- `Overdue` — count of Task rows where `isOverdue === true`.

**Content — Category breakdown table:**

Group closed Task rows by `category`. For each category:

| Category    | Count | Avg Rating | Overdue |
|-------------|-------|-----------|---------|
| Class Work  | 4     | 8.5       | 0       |
| Home Work   | 3     | 7.5       | 1       |

- Same column semantics as the Assignment table above.
- Footer line: `Total tasks: <closed + open + in-progress + in-review>`

No-data state: `"No tasks recorded for this student."`

---

##### Section 6 — Notifications (informational, no rating)

**Card header:** `🔔 Notifications — Total: 4  |  Open: 1  |  Closed: 3`

Simple count summary only — Notifications carry no `norm_rating` and do not affect any score.
No category breakdown table needed.

No-data state: omit the card entirely if there are zero Notification rows.

---

## Rating Scale Reference (for display)

The max possible `norm_rating` per marksheet row is `Annual Exam (weight 4) × A+ (score 7) = 28`.
Display the overall and academic ratings out of the **average max** rather than an absolute max —
show the number as-is (e.g. `★ 3.8`) rather than forcing a 0–5 or 0–10 scale.

For activities, max `norm_rating` per row = `Assignment (×3) × rating 5 = 15`.

---

## Filter / Search Bar

- **Search by name or reg number** — live filter as user types.
- **Course filter dropdown** — "All Courses" (default) or pick a specific course.
- Both filters work simultaneously (AND logic).

---

## No-data States

| Condition | Message |
|---|---|
| No students loaded | "No student records found. Sync to load data." |
| No mark sheet rows for student | Academic Rating shown as `—` |
| No closed activity rows for student | Activity Rating shown as `—`, Activity Count = 0 |

---

## Navigation & Screen Names

### Screen registry

| Screen | Navigator name | Route params |
|---|---|---|
| Rating list | `StudentRatingList` | _(none)_ |
| Rating detail | `StudentRatingDetail` | `{ student: StudentModel }` |

Add to `screenRegistry.ts` `APP_SCREEN_MAP`:
```ts
'Student Rating':        'StudentRatingList',
'Student Rating View':   'StudentRatingList',
'Rating View':           'StudentRatingList',
```

---

### Entry points

#### 1 — Home tab (dashboard card)

The dashboard (`HomeScreen`) navigates via `resolveScreen(appviewsheet)` when a card is tapped.
No code change needed beyond the `screenRegistry.ts` entries above — the card works once
`'Student Rating'` (or a variant) is set as the `appviewsheet` value in the Excel dashboard sheet.

```
Home tab → HomeMain (HomeStack)
         → resolveScreen("Student Rating")
         → StudentRatingList
         → StudentRatingDetail  (tap a student row)
```

#### 2 — Students tab (sub-item dashboard)

The **Students** tab uses `makeTabStack('Students', 'Students')` which renders `SubItemScreen`
as its root and shares the full `HomeStackParamList`. Both new screens must be registered in
`makeTabStack`'s `Stack.Navigator` (inside `TabNavigator.tsx`) alongside the existing
student screens.

```
Students tab → SubItems (students dashboard)
             → Landing / StudentRatingList  (via dashboard card)
             → StudentRatingDetail          (tap a student row)
```

#### 3 — StudentDetailsScreen quick-action button

Add a **"Rating"** quick-action button in `StudentDetailsScreen` alongside the existing
Fees / Attendance / Assignments buttons. It navigates directly to `StudentRatingDetail`
for that specific student, bypassing the list:

```tsx
<TouchableOpacity
  style={KStyles.detailsQaBtn}
  onPress={() => navigation.navigate('StudentRatingDetail', { student: item })}
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
StudentRatingList:   undefined;
StudentRatingDetail: { student: StudentModel };
```

```tsx
// In HomeStack Stack.Navigator:
<Stack.Screen name="StudentRatingList"   component={StudentRatingList} />
<Stack.Screen name="StudentRatingDetail" component={StudentRatingDetail} />
```

### Changes required in `TabNavigator.tsx`

Add the same two screens inside `makeTabStack`'s `Stack.Navigator` (they are already typed
via the shared `HomeStackParamList`):

```tsx
<Stack.Screen name="StudentRatingList"   component={StudentRatingList} />
<Stack.Screen name="StudentRatingDetail" component={StudentRatingDetail} />
```

---

## Component Files

```
src/components/student/rating/
  StudentRatingList.tsx     — list screen (FlatList, section headers, search/filter)
  StudentRatingDetail.tsx   — detail screen (read-only, subject table, activity breakdown)
  useStudentRatings.ts      — custom hook: loads students + marks + activities,
                              computes all derived fields, returns sorted data
  ratingUtils.ts            — pure functions: computeAcademicRating,
                              computeSubjectRatings, computeActivityRating,
                              computeOverallRating, computeActivityCount
  index.ts                  — re-exports
```

---

## Implementation Notes

- **No writes** — this screen never calls `save`, `delete`, or `sync push`.
- **Sync** — a pull-only sync button (same pattern as other list screens) refreshes
  `StudentMarkSheet` and `StudentActivity` from the API before recomputing.
- **Performance** — all computation happens inside `useStudentRatings` using `useMemo`.
  FlatList uses `keyExtractor` on `regNumber`.
- **Repositories to use:**
  - `studentMarksheetRepository.getAll()` → `StudentMarkSheetModel[]`
  - `studentActivityRepository.getAll()` → `StudentActivityModel[]`
  - `studentRepository.getAll()` → `StudentModel[]`
- **No new model or DB schema** — purely a derived/computed view over existing tables.
