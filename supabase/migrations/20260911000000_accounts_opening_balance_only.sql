-- Accounts masters record the opening balance only. Current balances are maintained elsewhere.

alter table public.bank_accounts
  drop column if exists current_balance,
  drop column if exists current_balance_date;

alter table public.cash_accounts
  add column if not exists opening_balance numeric(14,2) not null default 0,
  add column if not exists opening_balance_date date,
  drop column if exists current_balance,
  drop column if exists current_balance_date;
