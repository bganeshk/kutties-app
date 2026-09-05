# Expense Tracker — Requirements

## 1. Overview

Build a screen set for tracking and managing school expenses. This follows the same
List / Form / Details pattern used by **StaffPay**, **StudentFee**, and **Enquiry**
throughout the app.

---

## 2. Data Model

### 2.1 Excel Sheet

| Property       | Excel Column    | Type    | Notes                                      |
|----------------|-----------------|---------|--------------------------------------------|
| `id`           | `id`            | string  | UUID, primary key                          |
| `recptNo`      | `Recpt No`      | string  | User-entered receipt / voucher number      |
| `expenseDate`  | `Expense Date`  | string  | ISO date `YYYY-MM-DD`, required            |
| `expenseType`  | `Expense Type`  | string  | Required — lookup from `expref` in reftbl  |
| `paymentMode`  | `Payment Mode`  | string  | Required — lookup from `paymentmethod` in reftbl |
| `amount`       | `Amount`        | number  | Required, numeric (₹)                      |
| `paidTo`       | `Paid To`       | string  | Optional — vendor / payee name             |
| `description`  | `Description`   | string  | Optional — free-text detail                |
| `remarks`      | `Remarks`       | string  | Optional — additional notes                |
| `revision`     | `revision`      | number  | Sync revision counter                      |
| `lastmodified` | `lastmodified`  | string  | ISO datetime, set on every save            |

> **Sheet name:** `expenses`
> **SHEETS constant:** `EXPENSE = 'expenses'`

### 2.2 Reference Data (reftbl)

| Field          | `reftbl` category key | Fallback values (offline)            |
|----------------|----------------------|--------------------------------------|
| `expenseType`  | `expref`             | `['Stationery', 'Utilities', 'Maintenance', 'Transport', 'Salary', 'Other']` |
| `paymentMode`  | `paymentmethod`      | `['Cash', 'Bank Transfer', 'Cheque', 'UPI']` |

---

## 3. Screens

### 3.1 ExpenseList

**Route name:** `ExpenseList`

**Purpose:** Browse, search, and filter all expense records.

**Features:**
- Header with title "Expenses" and a sync/refresh icon button.
- Search bar — filters by receipt no, expense type, payment mode, paid-to, remarks.
- Summary banner (when records exist) — shows record count and total amount (₹).
- Month/period chip filter — tap a chip on a row to toggle filtering by that month.
- **Two-level grouped list** (`SectionList`):
  - **Level 1 — Month sections:** records grouped by `expenseDate` month (newest month first). Section header shows month label, record count, and month total (₹).
  - **Level 2 — Expense-type sub-sections:** within each month, records are further grouped by `expenseType` (alphabetical). Sub-section header shows type label, record count, and type total (₹).
  - Both levels are collapsible — tapping a section header toggles its items.
  - When a search term is active, all sections are expanded automatically.
- Empty state with a wallet icon and "No expenses found" message.
- FAB (`+`) navigates to `ExpenseForm` with `mode: 'add'`.
- Tapping a row navigates to `ExpenseDetails`.

### 3.2 ExpenseForm

**Route name:** `ExpenseForm`
**Params:** `{ mode: 'add' | 'edit'; item?: ExpenseModel }`

**Purpose:** Add a new expense record or edit an existing one.

**Sections & Fields:**

| Section          | Field            | Control              | Required | Notes                                     |
|------------------|------------------|----------------------|----------|-------------------------------------------|
| Expense Details  | Receipt No       | Text InputField      | No       | User-entered voucher / receipt number     |
| Expense Details  | Expense Date     | FormDatePicker       | Yes      | Defaults to today on add                  |
| Expense Details  | Expense Type     | SingleSelectDropdown | Yes      | Options from `expref` in reftbl           |
| Expense Details  | Payment Mode     | SingleSelectDropdown | Yes      | Options from `paymentmethod` in reftbl    |
| Expense Details  | Amount (₹)       | Numeric InputField   | Yes      |                                           |
| Expense Details  | Paid To          | Text InputField      | No       | Vendor / payee                            |
| Description      | Description      | Multiline InputField | No       |                                           |
| Remarks          | Remarks          | Multiline InputField | No       |                                           |
| Audit            | Last Modified    | AuditRow (read-only) | —        | Shown in edit mode only                   |

**Validation:**
- `expenseDate` — required.
- `expenseType` — required.
- `paymentMode` — required.
- `amount` — required, must be a valid positive number.
- `recptNo` — optional, no format constraint (free text).

**Actions:**
- **Save** — validates, persists to SQLite via `expenseRepository.save()`, triggers background `syncSheet(SHEETS.EXPENSE)`, shows snackbar, navigates back.
- **Delete** (edit mode only, header trash icon) — shows `ConfirmDialog`, then deletes and syncs.
- **Cancel** (header close icon) — navigates back without saving.

### 3.3 ExpenseDetails

**Route name:** `ExpenseDetails`
**Params:** `{ item: ExpenseModel }`

**Purpose:** Read-only detail view for a single expense record.

**Sections:**

| Section       | Fields shown                                                  |
|---------------|---------------------------------------------------------------|
| Hero card     | Receipt no as title, Expense Date, Amount (large), Type badge |
| Expense Info  | Amount, Receipt No, Expense Date, Expense Type, Payment Mode, Paid To |
| Description   | Description (shown only when non-empty)                       |
| Remarks       | Remarks (shown only when non-empty)                           |
| Audit         | Last Modified (shown only when present)                       |

**Actions:**
- Header edit icon → navigates to `ExpenseForm` with `mode: 'edit'`.
- Header trash icon → `ConfirmDialog` then delete + sync + navigate back.
- FAB edit icon → same as header edit.

---

## 4. Row Component (ExpenseRow)

Displayed inside `ExpenseList` within each expense-type sub-section.

| Area       | Content                                                   |
|------------|-----------------------------------------------------------|
| Left icon  | Circular avatar with first letter of `expenseType`       |
| Left col   | Expense type (bold), Paid-to (muted), Expense date (muted)|
| Right col  | Amount (₹, bold), Payment mode badge                     |
| Chips row  | Month chip (tappable, toggles month filter), Receipt no  |
| Trailing   | Chevron icon                                              |

---

## 5. Repository — `ExpenseRepository`

Extends `BaseRepository<ExpenseModel>`.

| Method              | Behaviour                                                        |
|---------------------|------------------------------------------------------------------|
| `findAll()`         | Inherited — returns all records                                  |
| `findByType(type)`  | Returns all records where `expenseType` matches (case-insensitive)|
| `findByMonth(m)`    | Returns all records where `expenseDate` starts with the month prefix |
| `search(query)`     | Full-text across `recptNo`, `expenseType`, `paymentMode`, `paidTo`, `remarks` |

`toRow()` must map back to the exact Excel column names listed in §2.1.

---

## 6. Navigation Wiring

### 6.1 HomeStack param types

```ts
ExpenseList:    undefined;
ExpenseDetails: { item: ExpenseModel };
ExpenseForm:    { mode: 'add' | 'edit'; item?: ExpenseModel };
```

### 6.2 Stack screens (HomeStack.tsx)

```tsx
<Stack.Screen name="ExpenseList"    component={ExpenseList} />
<Stack.Screen name="ExpenseDetails" component={ExpenseDetailsScreen} />
<Stack.Screen name="ExpenseForm"    component={ExpenseForm} />
```

### 6.3 screenRegistry.ts — caption → route mappings

| Caption (appviewsheet value)  | Route         |
|-------------------------------|---------------|
| `Expenses`                    | `ExpenseList` |
| `Expenses View`               | `ExpenseList` |
| `School Expenses`             | `ExpenseList` |
| `School Expenses View`        | `ExpenseList` |
| `Expense`                     | `ExpenseList` |
| `Expense View`                | `ExpenseList` |
| `ExpenseList`                 | `ExpenseList` |

---

## 7. Registry & Constants

### 7.1 `utils/constants.ts`

```ts
EXPENSE: 'expenses',
```

### 7.2 `db/models/registry.ts` — transformer

```ts
expenses: (raw) => toExpenseModel(raw) as unknown as Record<string, unknown>,
```

### 7.3 `db/models/registry.ts` — EXCEL_KEY_MAPS

```ts
expenses: {
  recptNo:      'Recpt No',
  expenseDate:  'Expense Date',
  expenseType:  'Expense Type',
  paymentMode:  'Payment Mode',
  amount:       'Amount',
  paidTo:       'Paid To',
  description:  'Description',
  remarks:      'Remarks',
  revision:     'revision',
  lastmodified: 'lastmodified',
},
```

### 7.4 `db/models/index.ts`

Add: `export * from './expense.model';`

### 7.5 `db/repositories/index.ts`

Add: `export { ExpenseRepository, expenseRepository } from './expense.repository';`

---

## 8. Sync

Uses the existing `syncSheet(SHEETS.EXPENSE)` mechanism (fire-and-forget after save/delete).
No additional sync logic required.

---

## 9. File Structure

```
src/
  components/finance/expense/
    ExpenseList.tsx       ← list screen
    ExpenseForm.tsx       ← add / edit form
    ExpenseRow.tsx        ← list row component
    index.ts              ← barrel export
    REQUIREMENTS.md       ← this file

  screens/
    ExpenseDetailsScreen.tsx

  db/
    models/
      expense.model.ts
    repositories/
      expense.repository.ts
```

---

## 10. Change Log

| Version | Change                                                                                   |
|---------|------------------------------------------------------------------------------------------|
| v1      | Initial requirements                                                                     |
| v2      | Receipt No changed from auto-generated read-only to user-editable free-text field       |
| v2      | ExpenseList grouping: flat FlatList → two-level SectionList (month → expense type)      |

---

## 11. Out of Scope

- Expense categories / sub-categories beyond the single `expenseType` field.
- Attachments or photo receipts.
- Approval workflow.
- Budget vs. actual comparison.
- Export to PDF / CSV.
