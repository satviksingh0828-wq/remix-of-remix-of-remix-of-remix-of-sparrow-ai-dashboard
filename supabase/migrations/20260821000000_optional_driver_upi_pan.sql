-- Keep driver UPI and PAN details optional at the database level as they are in
-- the Driver Master form. DROP NOT NULL is safe even when the columns are
-- already nullable.
alter table public.drivers
  alter column upi_id drop not null,
  alter column pan_number drop not null;

-- The current driver document schema has driver, Aadhaar, and driving licence
-- photo columns only. There is no PAN card photo column or PAN photo constraint
-- to relax.
