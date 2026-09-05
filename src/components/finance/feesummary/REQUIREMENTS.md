# Fee Summary — Requirements

## 1. Overview

Build a **Fee Summary** screen that aggregates data from the `stfee` sheet and presents a
month-by-month overview of fee collections. Each month card shows the total collected
amount alongside the total pending amount. Tapping a month drills down into a
class-wise (course-wise) breakdown for that month.

The screen is **read-only** — no create/edit/delete actions. It complements the existing
`FeePendingScreen` (which focuses on outstanding dues per student) and
`StudentFeeDetailsScreen` (single record view).

---

## 2. Data Source

### 2.1 Sheet

| Property      | Excel Column  | Type   | Notes                                        |
|---------------|---------------|--------|----------------------------------------------|
| `id`          | `id`          | string | UUID, primary key                            |
| `regNumber`   | `student`     | string | Student registration number                  |
| `dueDate`     | `dueDate`     | string | ISO date — determines the fee month          |
| `feeType`     | `feeType`     | string | Fee category (e.g. Monthly, Admission, etc.) |
| `amount`      | `amount`      | number | Fee amount (₹)                               |
| `paidDate`    | `paidDate`    | string | Populated when payment is received           |
| `paymentMode` | `paymentMode` | string | Payment method                               |
| `status`      | `status`      | string | `paid` / `partial` / `pending`               |

> **Repository:** `studentFeeRepository` (already exists — `findAll()` is sufficient).  
> **Student lookup:** `studentRepository.findAll()` — join on `regNumber` to resolve `course`.

### 2.2 Derived Fields

| Field            | Derivation                                                           |
|------------------|----------------------------------------------------------------------|
| `monthKey`       | First 7 chars of `dueDate` — `YYYY-MM`                              |
| `collectedAmount`| Sum of `amount` where `status === 'paid'` for the month             |
| `partialAmount`  | Sum of `amount` where `status === 'partial'` for the month          |
| `pendingAmount`  | Sum of `amount` where `status === 'pending'` (or no `paidDate`) for the month |
| `course`         | Resolved from student record via `regNumber → student.course`        |

> **Pending definition:** A fee record is considered pending when `status` is `'pending'`
> or `'partial'`. Records with `status === 'paid'` are collected.

---

## 3. Screens

### 3.1 FeeSummaryScreen

**Route name:** `FeeSummary`  
**Purpose:** Month-level roll-up — one card per calendar month with collected vs. pending totals.

#### 3.1.1 Header
- Title: **"Fee Summary"**
- Right icon: sync/refresh button — triggers `syncSheet(SHEETS.STUDENT_FEE)` and reloads data.

#### 3.1.2 Summary Banner
Shown above the month list when records exist:

| Metric           | Value                                      |
|------------------|--------------------------------------------|
| Total Collected  | Sum of all `paid` amounts across all months |
| Total Pending    | Sum of all `pending` + `partial` amounts   |
| Total Records    | Count of all fee records                   |

#### 3.1.3 Month List (`FlatList`)
- Sorted **newest month first** (descending by `monthKey`).
- One `FeeSummaryMonthCard` per month (see §4).
- Tapping a card navigates to `FeeSummaryDrillDown` with `{ monthKey, monthLabel }`.

#### 3.1.4 Empty State
- Icon: `cash-outline`
- Message: "No fee records found"

---

### 3.2 FeeSummaryDrillDown

**Route name:** `FeeSummaryDrillDown`  
**Params:** `{ monthKey: string; monthLabel: string }`  
**Purpose:** Class-wise (course-wise) fee breakdown for the selected month.

#### 3.2.1 Header
- Title: the `monthLabel` (e.g. "June 2025")
- Back navigation.

#### 3.2.2 Month Totals Banner
Repeat the collected / pending / record-count totals scoped to this month only.

#### 3.2.3 Course-wise List (`SectionList`)
- One section per unique `course` value among students with fee records in the month.
- Students with no resolvable course grouped under **"Unassigned"**.
- Section header shows: course name, count of records, collected total (₹), pending total (₹).
- Sections sorted alphabetically by course name; "Unassigned" always last.
- Each row: `FeeSummaryStudentRow` (see §5).
- Sections are **collapsible** — tapping a section header toggles its rows.

#### 3.2.4 Empty State
- Message: "No fee records for this month."

---

## 4. FeeSummaryMonthCard Component

Displayed inside `FeeSummaryScreen`.

| Area          | Content                                                        |
|---------------|----------------------------------------------------------------|
| Left          | Month label (bold, e.g. "June 2025"), record count (muted)     |
| Right — top   | Collected amount (₹, green, bold)                              |
| Right — bottom| Pending amount (₹, red/amber) — hidden when zero               |
| Progress bar  | Thin bar showing collected proportion of (collected + pending)  |
| Trailing      | Chevron icon                                                   |

---

## 5. FeeSummaryStudentRow Component

Displayed inside `FeeSummaryDrillDown` within each course section.

| Area       | Content                                                      |
|------------|--------------------------------------------------------------|
| Left icon  | Circular avatar with student initials or reg-number initial  |
| Left col   | Student full name (bold), reg number (muted), fee type (muted)|
| Right col  | Amount (₹, bold), status badge (`paid` / `partial` / `pending`) |
| Tap action | Navigates to `StudentFeeDetails` with the fee record         |

---

## 6. Navigation Wiring

### 6.1 HomeStack param types (`HomeStack.tsx`)

```ts
FeeSummary:         undefined;
FeeSummaryDrillDown: { monthKey: string; monthLabel: string };
```

### 6.2 Stack screens

```tsx
<Stack.Screen name="FeeSummary"          component={FeeSummaryScreen} />
<Stack.Screen name="FeeSummaryDrillDown" component={FeeSummaryDrillDown} />
```

### 6.3 `screenRegistry.ts` — caption → route mappings

| Caption (appviewsheet value) | Route        |
|------------------------------|--------------|
| `Fee Summary`                | `FeeSummary` |
| `FeeSummary`                 | `FeeSummary` |
| `Fee Collection Summary`     | `FeeSummary` |

---

## 7. File Structure

```
src/
  components/finance/feesummary/
    FeeSummaryScreen.tsx       ← month-level list screen
    FeeSummaryDrillDown.tsx    ← course-wise drill-down screen
    FeeSummaryMonthCard.tsx    ← month card component
    FeeSummaryStudentRow.tsx   ← per-student row component
    index.ts                   ← barrel export
    REQUIREMENTS.md            ← this file
```

No new model, repository, or sheet constant is needed — the feature reuses
`studentFeeRepository`, `studentRepository`, and `SHEETS.STUDENT_FEE`.

---

## 8. Computation Logic

```
// Group fee records by monthKey (YYYY-MM from dueDate)
// For each month:
//   collectedAmount = sum(amount) where status === 'paid'
//   pendingAmount   = sum(amount) where status === 'pending' || status === 'partial'
//   totalAmount     = collectedAmount + pendingAmount

// For drill-down, resolve course per record:
//   studentMap = Map<regNumber, StudentModel>
//   record.course = studentMap.get(record.regNumber)?.course ?? 'Unassigned'
// Group by course, sort alphabetically, Unassigned last
```

---

## 9. Out of Scope

- Creating, editing, or deleting fee records (use `StudentFeeDetailsScreen` for that).
- Filtering by fee type within the summary.
- Export to PDF / CSV.
- Year-level aggregation (month is the finest grain needed).
- Push notifications for pending fees.
