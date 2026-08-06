---
name: Payroll accounting
description: How salary, advance deductions, and expenditure entries are represented.
---

Payroll expenditure entries use the gross salary amount, while advance recovery is tracked separately on the payroll record and reduces the net amount payable to the driver.

**Why:** An advance is a recovery of money already given to the driver, not a reduction of the driver's salary expense.

**How to apply:** Keep `salary_amount`, `advance_deduction`, and `net_amount` distinct in payroll flows; link the expenditure entry to the payroll while recording the gross salary in expenditure.