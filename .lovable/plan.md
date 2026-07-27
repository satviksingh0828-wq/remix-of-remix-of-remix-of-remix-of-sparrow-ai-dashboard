
# Plan: Branches (merged), Contracts master, Excel I/O everywhere

This is a large change. Below is the scope and how I'll build it. I'll implement in order so we can pause/redirect at any step.

---

## 1. Merge "Departments" into "Branches"

Today the app has both `departments` and `branches`. You want a single concept: **Branches**. The "Controlling Department" selector on Vehicles / Drivers / Transporters will become **"Controlling Branch"**.

Database changes:
- Add `branch_id uuid` column on `vehicles`, `drivers`, `transporters` (FK → `branches`).
- Copy existing `department_id` values into `branch_id` where a matching branch exists by name (best-effort); otherwise leave null.
- Drop `department_id` columns and the `departments` table.

Code changes:
- Rename `DepartmentSelect` → `BranchSelect`, `use-departments` → `use-branches`.
- Update `configs.ts` (`hasDepartment` → `hasBranch`, subtitle key `department_name` → `branch_name`).
- Remove the Departments tab from Settings; keep only Company + Branches.

**Confirm:** OK to permanently drop the `departments` table and lose any department rows that don't map to a branch by name? (I can't preserve both without keeping the concept.)

## 2. Excel / CSV I/O on Branches

Add the same `CsvIO` toolbar (Template / Import / Export) to `BranchSettings` that Masters already uses. Columns = all branch fields.

## 3. New Masters tab: **Contracts**

New sidebar entry in `/masters` alongside Vehicle / Driver / Transporter / Location.

### 3a. Contract (header) — schema
Table `contracts`:
- `contract_name` (required)
- `weight_ranges` jsonb — array of `{ from_kg, to_kg | null for infinity }`
- `quantity_ranges` jsonb — array of `{ from_qty, to_qty | null }`
- `freight_basis` enum: `weight` | `quantity`
- `loading_basis` enum: `weight` | `quantity`
- Optional contracting-company block (same shape as `company` table but stored inline on the contract): legal name, type, industry, PAN, GSTIN, CIN, MSME, TAN, IEC, full address, phone, email, website.

Form flow when creating:
1. Enter contract name.
2. Add weight ranges — repeatable rows (from / to kg). Last row's "to" can be left blank = infinity.
3. Add quantity ranges — same UI.
4. Pick freight basis (weight vs quantity).
5. Pick loading basis (weight vs quantity).
6. Optional expandable "Contracting company details" section.
7. Save → contract appears in the Contracts list.

Contracts list supports Template / Import / Export (Excel-friendly CSV). For import/export, the ranges are serialised as JSON strings in one column each (simplest round-trip).

### 3b. Contract entries (lines) — schema
Clicking a contract opens its **entries** list. Table `contract_entries`:
- `contract_id` FK
- `from_location_id` FK → locations (nullable if free-typed, but normally selected)
- `to_location_id` FK → locations
- `from_pin_code`, `to_pin_code` — auto-filled from selected location; editable
- `freight_values` jsonb — `{ "<range_label>": amount }` for each range on the parent contract's freight basis
- `loading_values` jsonb — same shape for loading basis
- `monthly_change_amount`, `monthly_change_note`
- `yearly_change_amount`, `yearly_change_note`
- `per_manifest_change_amount`, `per_manifest_change_note`

Entry form UI:
- **From location** and **To location** each use a searchable combobox over existing locations, with a **"+ Add new location"** action that opens the existing location form in a dialog. On save, the dialog closes and the new location is auto-selected.
- Selecting a location auto-fills the pin-code field (separate input; user can override).
- Freight: renders one input per weight range (or per quantity range) based on the contract's `freight_basis`. Labels like `0–100 kg`, `100–200 kg`, …, `500+ kg`.
- Loading: same, driven by `loading_basis`.
- Monthly / Yearly / Per-manifest change: amount + note each.

Entries list supports Template / Import / Export in Excel. Freight and loading values export as JSON in one column each (keyed by range label) since the columns are contract-specific.

## 4. Technical notes (for the record)

- All new tables get `GRANT SELECT, INSERT, UPDATE, DELETE ... TO authenticated`, RLS enabled, and permissive `using (true)` policies matching the existing masters pattern.
- One migration for schema, then code in this order: BranchSelect + configs, BranchSettings CSV, Contracts config + custom Contract form, Contract entries page, entries CSV.
- Locations "add new" reuses the existing MasterList form component in a dialog wrapper — no duplicated form logic.
- Excel: we continue to use CSV (opens natively in Excel/Sheets) — same as existing masters. No new deps.

## 5. Open questions before I start

1. **Departments deletion** — OK to drop the table and merge into Branches as described? (Vehicles/Drivers/Transporters currently linked to a department will only keep the link if a branch exists with the same name.)
2. **Contracting-company block on contracts** — store inline on the `contracts` row (simple, one form), or as its own related row? I'd recommend inline unless you plan to reuse the same contracting company across many contracts.
3. **Range labels in Excel** — for entries import/export, is a single `freight_values` column containing JSON like `{"0-100":250,"100-200":400,"500+":900}` acceptable? Alternative is a wide export with one column per range, but then the template differs per contract.

Once you confirm, I'll run the migration and build in the order above.
