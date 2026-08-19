import * as XLSX from 'xlsx';
import type { Employee, Department, Holiday, Attendance, Payroll, EmployeeInput, HolidayInput, DepartmentInput, Gender, EmployeeStatus } from './types';
import { fullName, computeSalary, effectivePaymentStatus } from './types';
import { ymd } from './attendance-utils';

export function saveWorkbook(wb: XLSX.WorkBook, filename: string) {
  XLSX.writeFile(wb, filename);
}

export function makeSheet(rows: Record<string, unknown>[], header?: string[]) {
  return XLSX.utils.json_to_sheet(rows, header ? { header } : undefined);
}

export async function readWorkbookFromFile(file: File): Promise<XLSX.WorkBook> {
  const buf = await file.arrayBuffer();
  return XLSX.read(buf, { type: 'array' });
}

export function sheetToRows(ws: XLSX.WorkSheet): Record<string, unknown>[] {
  return XLSX.utils.sheet_to_json(ws, { defval: '' });
}

/* ---------- Employees ---------- */

export function exportEmployees(
  employees: Employee[],
  departmentById: Map<string, Department>,
  positionById: Map<string, { name: string }>,
) {
  const rows = employees.map(e => ({
    'Employee Number': e.employee_number ?? '',
    'First Name': e.first_name,
    'Middle Name': e.middle_name ?? '',
    'Last Name': e.last_name,
    'Mobile': e.mobile,
    'Address': e.address,
    'DOB': e.dob,
    'Gender': e.gender,
    'Joining Date': e.joining_date,
    'Work Start': e.work_start_time?.slice(0,5) ?? '',
    'Work End': e.work_end_time?.slice(0,5) ?? '',
    'Basic Salary': e.basic_salary,
    'HRA': e.hra,
    'Travel Allowance': e.travel_allowance,
    'Special Allowance': e.special_allowance,
    'Other Allowance': e.other_allowance,
    'PF Deduction': e.pf_deduction,
    'Tax Deduction': e.tax_deduction,
    'Paid Holidays / Month': e.paid_holidays_per_month,
    'Net Salary': computeSalary(e).net,
    'Emergency Contact': e.emergency_contact ?? '',
    'Status': e.status,
    'Inactive Reason': e.inactive_reason ?? '',
    'Date of Leaving': e.date_of_leaving ?? '',
    'Department': e.department_id ? (departmentById.get(e.department_id)?.name ?? '') : '',
    'Position': e.position_id ? (positionById.get(e.position_id)?.name ?? '') : '',
    'Unpaid Leave Deduction Rate': e.unpaid_leave_deduction_rate,
    'Paid Leave Payout Rate': e.paid_leave_payout_rate,
    'Pay Per Extra Work Day': e.pay_per_extra_work_day,
    'Location': e.location ?? '',
    'Bank Account Number': e.bank_account_number ?? '',
    'Bank Branch Name': e.bank_branch_name ?? '',
    'Bank Branch Address': e.bank_branch_address ?? '',
    'Bank IFSC Code': e.bank_ifsc_code ?? '',
    'Aadhaar Number': e.aadhaar_number ?? '',
    'PAN Number': e.pan_number ?? '',
    'Qualifications': (e.qualifications ?? []).join(', '),
  }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, makeSheet(rows), 'Employees');
  saveWorkbook(wb, `employees-${ymd(new Date())}.xlsx`);
}

const EMPLOYEE_IMPORT_HEADERS = [
  'Employee Number', 'First Name', 'Middle Name', 'Last Name', 'Mobile', 'Address', 'DOB', 'Gender',
  'Joining Date', 'Work Start', 'Work End', 'Basic Salary', 'HRA', 'Travel Allowance',
  'Special Allowance', 'Other Allowance', 'PF Deduction', 'Tax Deduction',
  'Paid Holidays / Month', 'Emergency Contact', 'Status', 'Inactive Reason',
  'Date of Leaving', 'Department', 'Position', 'Unpaid Leave Deduction Rate',
  'Paid Leave Payout Rate', 'Pay Per Extra Work Day', 'Location', 'Bank Account Number',
  'Bank Branch Name', 'Bank Branch Address', 'Bank IFSC Code', 'Aadhaar Number',
  'PAN Number', 'Qualifications',
];

export function downloadEmployeeTemplate() {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, makeSheet([], EMPLOYEE_IMPORT_HEADERS), 'Employees');
  XLSX.utils.book_append_sheet(wb, makeSheet([
    { Field: 'Dates', Guidance: 'Use YYYY-MM-DD. Work times use HH:MM.' },
    { Field: 'Required fields', Guidance: 'First Name, Last Name, Mobile, DOB, Joining Date, Department, and Position.' },
    { Field: 'Gender', Guidance: 'Allowed options: male | female | other' },
    { Field: 'Status', Guidance: 'Allowed options: active | inactive' },
    { Field: 'Department', Guidance: 'Must exactly match an existing department name.' },
    { Field: 'Position', Guidance: 'Must exactly match a position in the selected Department.' },
    { Field: 'Working days', Guidance: 'Not used here; configure working days in the Department template.' },
    { Field: 'Numeric fields', Guidance: 'Use numbers only. Empty numeric cells are imported as 0.' },
    { Field: 'Qualifications', Guidance: 'Separate multiple values with commas.' },
  ]), 'Instructions');
  XLSX.utils.book_append_sheet(wb, makeSheet([
    { Field: 'Gender', 'Allowed Options': 'male | female | other' },
    { Field: 'Status', 'Allowed Options': 'active | inactive' },
    { Field: 'Department', 'Allowed Options': 'Exact existing department name' },
    { Field: 'Position', 'Allowed Options': 'Exact position name from the selected department' },
  ]), 'Allowed Options');
  saveWorkbook(wb, 'employee-import-template.xlsx');
}

const s = (v: unknown) => String(v ?? '').trim();
const num = (v: unknown) => {
  const n = Number(String(v ?? '').replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? n : 0;
};

export function parseEmployees(
  rawRows: Record<string, unknown>[],
  departments: Department[],
  positions: Array<{ id: string; department_id: string; name: string }> = [],
): EmployeeInput[] {
  const deptByName = new Map(departments.map(d => [d.name.toLowerCase(), d] as const));
  return rawRows
    .map(r => {
      const first = s(r['First Name']);
      const last = s(r['Last Name']);
      if (!first || !last) return null;
      const mobileRaw = s(r['Mobile']).replace(/\D/g, '');
      const mobile = mobileRaw.startsWith('91') && mobileRaw.length > 10 ? `+${mobileRaw}` : `+91${mobileRaw.slice(-10)}`;
      const genderRaw = s(r['Gender']).toLowerCase();
      if (genderRaw && !['male', 'female', 'other'].includes(genderRaw)) {
        throw new Error(`Gender "${s(r['Gender'])}" is invalid. Use male, female, or other.`);
      }
      const gender: Gender = (['male','female','other'].includes(genderRaw) ? genderRaw : 'other') as Gender;
      const statusRaw = s(r['Status']).toLowerCase();
      if (statusRaw && !['active', 'inactive'].includes(statusRaw)) {
        throw new Error(`Status "${s(r['Status'])}" is invalid. Use active or inactive.`);
      }
      const status: EmployeeStatus = statusRaw === 'inactive' ? 'inactive' : 'active';
      const deptName = s(r['Department']).toLowerCase();
      const dept = deptName ? deptByName.get(deptName) : undefined;
      const positionName = s(r['Position']).toLowerCase();
      const position = positionName && dept
        ? positions.find(p => p.department_id === dept.id && p.name.toLowerCase() === positionName)
        : undefined;
      if (positionName && !position) {
        throw new Error(`Position "${s(r['Position'])}" was not found in department "${s(r['Department'])}".`);
      }
      return {
        employee_number: s(r['Employee Number']) || null,
        first_name: first,
        middle_name: s(r['Middle Name']) || null,
        last_name: last,
        mobile,
        address: s(r['Address']),
        dob: s(r['DOB']),
        gender,
        joining_date: s(r['Joining Date']),
        work_start_time: s(r['Work Start']) || '09:00',
        work_end_time: s(r['Work End']) || '18:00',
        basic_salary: num(r['Basic Salary']),
        hra: num(r['HRA']),
        travel_allowance: num(r['Travel Allowance']),
        special_allowance: num(r['Special Allowance']),
        other_allowance: num(r['Other Allowance']),
        pf_deduction: num(r['PF Deduction']),
        tax_deduction: num(r['Tax Deduction']),
        paid_holidays_per_month: num(r['Paid Holidays / Month']),
        emergency_contact: s(r['Emergency Contact']) || null,
        status,
        inactive_reason: status === 'inactive' ? (s(r['Inactive Reason']) || null) : null,
        date_of_leaving: status === 'inactive' ? (s(r['Date of Leaving']) || null) : null,
        department_id: dept?.id ?? null,
        position_id: position?.id ?? null,
        unpaid_leave_deduction_rate: num(r['Unpaid Leave Deduction Rate']),
        paid_leave_payout_rate: num(r['Paid Leave Payout Rate']),
        pay_per_extra_work_day: num(r['Pay Per Extra Work Day']),
        location: s(r['Location']) || null,
        bank_account_number: s(r['Bank Account Number']) || null,
        bank_branch_name: s(r['Bank Branch Name']) || null,
        bank_branch_address: s(r['Bank Branch Address']) || null,
        bank_ifsc_code: s(r['Bank IFSC Code']).toUpperCase() || null,
        aadhaar_number: s(r['Aadhaar Number']) || null,
        pan_number: s(r['PAN Number']).toUpperCase() || null,
        qualifications: s(r['Qualifications']).split(/[,;|]/).map(x => x.trim()).filter(Boolean),
      } as EmployeeInput;
    })
    .filter((x): x is EmployeeInput => !!x);
}

/* ---------- Departments ---------- */

export function exportDepartments(
  departments: Department[],
  positions: { id: string; department_id: string; name: string; is_head: boolean; reports_to_position_id?: string | null }[],
) {
  const positionById = new Map(positions.map(p => [p.id, p]));
  const departmentById = new Map(departments.map(d => [d.id, d]));
  const rowsWithAllFields = departments.map(d => ({
    'Department Name': d.name,
    'Reports To Department': d.reports_to_department_id ? departmentById.get(d.reports_to_department_id)?.name ?? '' : '',
    'Address': d.address,
    'Working Days': (d.working_days_of_week ?? []).join(','),
    'Latitude': d.latitude ?? '',
    'Longitude': d.longitude ?? '',
    'Device ID': d.device_id ?? '',
    'Device Password': d.device_password ?? '',
  }));
  const positionRows = positions.map(p => ({
    'Department Name': departmentById.get(p.department_id)?.name ?? '',
    'Position Name': p.name,
    'Reports To': p.reports_to_position_id ? positionById.get(p.reports_to_position_id)?.name ?? '' : '',
    'Head': p.is_head ? 'Yes' : 'No',
  }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, makeSheet(rowsWithAllFields), 'Departments');
  XLSX.utils.book_append_sheet(wb, makeSheet(positionRows, ['Department Name', 'Position Name', 'Reports To', 'Head']), 'Positions');
  saveWorkbook(wb, `departments-${ymd(new Date())}.xlsx`);
}

export type ImportedDepartmentPosition = { name: string; reportsTo: string | null; isHead: boolean };
export type ImportedDepartment = { department: DepartmentInput; reportsToDepartment: string | null; positions: ImportedDepartmentPosition[] };

export function downloadDepartmentTemplate() {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, makeSheet([], [
    'Department Name', 'Reports To Department', 'Address', 'Working Days',
    'Latitude', 'Longitude', 'Device ID', 'Device Password',
  ]), 'Departments');
  XLSX.utils.book_append_sheet(wb, makeSheet([], ['Department Name', 'Position Name', 'Reports To', 'Head']), 'Positions');
  XLSX.utils.book_append_sheet(wb, makeSheet([
    { Sheet: 'Departments', Guidance: 'Add one row per department. Working Days: Mon,Tue,Wed,Thu,Fri.' },
    { Sheet: 'Departments', Guidance: 'Working Days options: Sun | Mon | Tue | Wed | Thu | Fri | Sat (comma-separated).' },
    { Sheet: 'Departments', Guidance: 'Reports To Department: None/blank or an exact Department Name in this workbook.' },
    { Sheet: 'Positions', Guidance: 'Add positions using the exact Department Name. Head: Yes/No.' },
    { Sheet: 'Positions', Guidance: 'Head allowed options: Yes | No. At least one Yes is required per department.' },
    { Sheet: 'Positions', Guidance: 'Reports To must be blank or another Position Name in the same department.' },
    { Sheet: 'Positions', Guidance: 'At least one position in each department must have Head set to Yes.' },
  ]), 'Instructions');
  XLSX.utils.book_append_sheet(wb, makeSheet([
    { Field: 'Working Days', 'Allowed Options': 'Sun | Mon | Tue | Wed | Thu | Fri | Sat' },
    { Field: 'Reports To Department', 'Allowed Options': 'Blank or exact Department Name in this workbook' },
    { Field: 'Head', 'Allowed Options': 'Yes | No' },
    { Field: 'Reports To', 'Allowed Options': 'Blank or exact Position Name in the same department' },
  ]), 'Allowed Options');
  saveWorkbook(wb, 'department-position-import-template.xlsx');
}

export function parseDepartments(rawRows: Record<string, unknown>[], rawPositionRows: Record<string, unknown>[] = []): ImportedDepartment[] {
  const out: ImportedDepartment[] = [];
  const importedDepartmentNames = new Set(rawRows.map(r => s(r['Department Name'] ?? r['Name']).toLowerCase()).filter(Boolean));
  const orphanPosition = rawPositionRows.find(r => !importedDepartmentNames.has(s(r['Department Name']).toLowerCase()));
  if (orphanPosition) throw new Error(`Position department "${s(orphanPosition['Department Name'])}" was not found on the Departments sheet.`);
  for (const r of rawRows) {
    const name = s(r['Department Name'] ?? r['Name']);
    if (!name) continue;
    const days = s(r['Working Days']).split(/[,;|]/).map(x => x.trim()).filter(Boolean);
    const allowedDays = new Set(['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']);
    const invalidDay = days.find(day => !allowedDays.has(day));
    if (invalidDay) throw new Error(`Working day "${invalidDay}" is invalid for department "${name}".`);
    const importedPositions = rawPositionRows
      .filter(p => s(p['Department Name']).toLowerCase() === name.toLowerCase())
      .map(p => {
        const headValue = s(p['Head']).toLowerCase();
        if (headValue && !['yes', 'no', 'true', 'false', '1', '0', 'head'].includes(headValue)) {
          throw new Error(`Head value "${s(p['Head'])}" is invalid. Use Yes or No.`);
        }
        return {
          name: s(p['Position Name']),
          reportsTo: s(p['Reports To']) || null,
          isHead: ['yes', 'true', '1', 'head'].includes(headValue),
        };
      })
      .filter(p => p.name);
    // Continue to understand exports from older app versions.
    const legacyHead = s(r['Head Position']);
    const legacyOthers = s(r['Other Positions']).split(/[,;|]/).map(x => x.trim()).filter(Boolean);
    const positions = importedPositions.length
      ? importedPositions
      : [
          { name: legacyHead || 'Head', reportsTo: null, isHead: true },
          ...legacyOthers.map(positionName => ({ name: positionName, reportsTo: legacyHead || 'Head', isHead: false })),
        ];
    const duplicatePosition = positions.find((p, index) =>
      positions.findIndex(other => other.name.toLowerCase() === p.name.toLowerCase()) !== index,
    );
    if (duplicatePosition) throw new Error(`Position "${duplicatePosition.name}" is duplicated in department "${name}".`);
    if (!positions.some(p => p.isHead)) throw new Error(`Department "${name}" needs at least one Head position.`);
    const positionNames = new Set(positions.map(p => p.name.toLowerCase()));
    const invalidReport = positions.find(p => p.reportsTo && !positionNames.has(p.reportsTo.toLowerCase()));
    if (invalidReport) throw new Error(`"${invalidReport.name}" reports to an unknown position in department "${name}".`);
    out.push({
      department: {
        name,
        address: s(r['Address']),
        working_days_of_week: days.length ? days : ['Mon','Tue','Wed','Thu','Fri'],
        reports_to_department_id: null as string | null,
        latitude: s(r['Latitude']) ? num(r['Latitude']) : null,
        longitude: s(r['Longitude']) ? num(r['Longitude']) : null,
        device_id: s(r['Device ID']) || null,
        device_password: s(r['Device Password']) || null,
      },
      reportsToDepartment: s(r['Reports To Department']) || null,
      positions,
    });
  }
  const parentByDepartment = new Map(out.map(row => [row.department.name.toLowerCase(), row.reportsToDepartment?.toLowerCase() ?? null]));
  for (const row of out) {
    const start = row.department.name.toLowerCase();
    let current = row.reportsToDepartment?.toLowerCase() ?? null;
    const visited = new Set([start]);
    while (current) {
      if (!parentByDepartment.has(current)) throw new Error(`Reports To Department "${row.reportsToDepartment}" was not found on the Departments sheet.`);
      if (visited.has(current)) throw new Error(`Department reporting cycle detected for "${row.department.name}".`);
      visited.add(current);
      current = parentByDepartment.get(current) ?? null;
    }
  }
  return out;
}

/* ---------- Holidays ---------- */

export function exportHolidays(holidays: Holiday[]) {
  const rows = holidays.map(h => ({
    'Date': h.date,
    'Name': h.name,
    'Description': h.description ?? '',
  }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, makeSheet(rows), 'Holidays');
  saveWorkbook(wb, `holidays-${ymd(new Date())}.xlsx`);
}

export function parseHolidays(rawRows: Record<string, unknown>[]): HolidayInput[] {
  return rawRows
    .map(r => {
      const date = s(r['Date']);
      const name = s(r['Name']);
      if (!date || !name) return null;
      return { date, name, description: s(r['Description']) || null };
    })
    .filter((x): x is HolidayInput => !!x);
}

/* ---------- Attendance (daily export) ---------- */

export function exportAttendanceForDate(
  date: string,
  employees: Employee[],
  attendance: Attendance[],
  departmentById: Map<string, Department>,
) {
  const byEmp = new Map(attendance.map(a => [a.employee_id, a]));
  const rows = employees.map(e => {
    const rec = byEmp.get(e.id);
    return {
      'Employee': fullName(e),
      'Mobile': e.mobile,
      'Department': e.department_id ? (departmentById.get(e.department_id)?.name ?? '') : '',
      'Status': rec?.status ?? 'unmarked',
      'Note': rec?.note ?? '',
    };
  });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, makeSheet(rows), 'Attendance');
  saveWorkbook(wb, `attendance-${date}.xlsx`);
}

/* ---------- Employee Ledger ---------- */

export interface LedgerExportEntry {
  date: string;
  narration: string;
  dr: number;
  cr: number;
  balance: number;
}

export function exportLedger(
  entries: LedgerExportEntry[],
  employeeName: string,
  label: string,
) {
  const rows = entries.map(e => ({
    'Date':        new Date(e.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
    'Narration':   e.narration,
    'DR (₹)':     e.dr > 0 ? e.dr : '',
    'CR (₹)':     e.cr > 0 ? e.cr : '',
    'Balance (₹)': e.balance,
    'Balance Type': e.balance > 0.01 ? 'DR' : e.balance < -0.01 ? 'CR' : 'Nil',
  }));

  const header = ['Date', 'Narration', 'DR (₹)', 'CR (₹)', 'Balance (₹)', 'Balance Type'];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, makeSheet(rows, header), 'Ledger');
  saveWorkbook(wb, `ledger-${employeeName.replace(/\s+/g, '-').toLowerCase()}-${label}.xlsx`);
}

/* ---------- Payroll History ---------- */

export function exportPayrollHistory(
  payrolls: Payroll[],
  employeeById: Map<string, Employee>,
  label: string,
) {
  const rows = payrolls.map(p => {
    const emp = employeeById.get(p.employee_id);
    const start = new Date(p.period_start).toLocaleDateString('en-IN');
    const end   = new Date(p.period_end).toLocaleDateString('en-IN');
    return {
      'Employee':            emp ? fullName(emp) : p.employee_id,
      'Period':              `${start} – ${end}`,
      'Period Type':         p.period_type === 'half_month' ? 'Half Month' : 'Full Month',
      'Present Days':        p.present_days ?? '',
      'Working Days':        p.working_days ?? '',
      'Basic Salary':        Number(p.basic_salary)       || 0,
      'HRA':                 Number(p.hra)                || 0,
      'Travel Allowance':    Number(p.travel_allowance)   || 0,
      'Special Allowance':   Number(p.special_allowance)  || 0,
      'Other Allowance':     Number(p.other_allowance)    || 0,
      'Gross':               Number(p.gross)              || 0,
      'PF Deduction':        Number(p.pf_deduction)       || 0,
      'Tax Deduction':       Number(p.tax_deduction)      || 0,
      'Loan Deduction':      Number(p.loan_deduction)     || 0,
      'Advance Deduction':   Number(p.advance_deduction)  || 0,
      'Loss Deduction':      Number(p.loss_deduction)     || 0,
      'Net Pay':             Number(p.net)                || 0,
    };
  });

  const header = [
    'Employee','Period','Period Type','Present Days','Working Days',
    'Basic Salary','HRA','Travel Allowance','Special Allowance','Other Allowance',
    'Gross','PF Deduction','Tax Deduction','Loan Deduction','Advance Deduction',
    'Loss Deduction','Net Pay',
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, makeSheet(rows, header), 'Payroll');
  saveWorkbook(wb, `payroll-history-${label}.xlsx`);
}

/* ---------- Pending Payrolls Export ---------- */

export function exportPendingPayrolls({
  payrolls,
  employees,
}: {
  payrolls: Payroll[];
  employees: Employee[];
}) {
  const empMap = new Map(employees.map(e => [e.id, e]));
  const rows = payrolls.map(p => {
    const emp    = empMap.get(p.employee_id);
    const ps     = effectivePaymentStatus(p);
    const statusLabel = ps === 'generated' ? 'Pending' : 'Partially Paid';
    const deductions  =
      (Number(p.pf_deduction) || 0) +
      (Number(p.tax_deduction) || 0) +
      (Number(p.loan_deduction) || 0) +
      (Number(p.advance_deduction) || 0) +
      (Number(p.loss_deduction) || 0) +
      (Number(p.unpaid_leave_deduction) || 0);
    const paidAmt  = ps === 'partial_paid' && p.payment_amount != null ? Number(p.payment_amount) : null;
    const outstanding = paidAmt != null ? Math.max(0, Number(p.net) - paidAmt) : Number(p.net) || 0;
    return {
      'Employee':        emp ? fullName(emp) : p.employee_id,
      'Period Start':    new Date(p.period_start).toLocaleDateString('en-IN'),
      'Period End':      new Date(p.period_end).toLocaleDateString('en-IN'),
      'Period Type':     p.period_type === 'half_month' ? 'Half Month' : 'Full Month',
      'Gross (₹)':      (Number(p.gross) || 0) + (Number(p.paid_leave_payout_amount) || 0),
      'Total Deductions (₹)': deductions,
      'Net Pay (₹)':    Number(p.net) || 0,
      'Status':          statusLabel,
      'Amount Paid (₹)': paidAmt ?? '',
      'Outstanding (₹)': outstanding,
      'Payment Date':    p.payment_date ? new Date(p.payment_date).toLocaleDateString('en-IN') : '',
    };
  });

  const header = [
    'Employee','Period Start','Period End','Period Type',
    'Gross (₹)','Total Deductions (₹)','Net Pay (₹)',
    'Status','Amount Paid (₹)','Outstanding (₹)','Payment Date',
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, makeSheet(rows, header), 'Pending Payrolls');
  saveWorkbook(wb, `pending-payrolls-${ymd(new Date())}.xlsx`);
}
