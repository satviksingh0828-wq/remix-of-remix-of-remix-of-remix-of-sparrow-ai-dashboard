-- Accounts: capital-only opening balances and bank/cash transfers.
-- Run after 20260912120000_accounts_capital_journal.sql.
-- Safe to re-run: all functions and repair statements are idempotent.
begin;

-- Journal descriptions are optional for both manual entries and transfers.
alter table public.journal_entries alter column description drop not null;

-- Opening Balance Equity is no longer a user-facing or posting account. Move any
-- legacy opening-offset lines into the branch Capital account before hiding it.
-- Drop the old constraint first because the legacy row is capital-typed but is
-- about to lose its opening-offset flag.
do $$
begin
  if exists (select 1 from pg_constraint where conname = 'ledger_accounts_capital_system_only') then
    alter table public.ledger_accounts drop constraint ledger_accounts_capital_system_only;
  end if;
end;
$$;

update public.journal_lines jl
set ledger_account_id = capital.id,
    account_kind = 'ledger',
    branch_id = je.branch_id
from public.journal_entries je,
     public.ledger_accounts old_offset,
     public.ledger_accounts capital
where jl.journal_entry_id = je.id
  and old_offset.id = jl.ledger_account_id
  and old_offset.is_opening_offset
  and capital.branch_id = je.branch_id
  and capital.is_default_capital;

-- Capital opening balances are stored on the Capital ledger itself; remove the
-- old synthetic Capital-versus-Opening-Equity voucher after its offset is repaired.
delete from public.journal_entries
where source_module = 'auto'
  and reference like 'account_opening:capital:%';

update public.ledger_accounts
set is_opening_offset = false,
    is_active = false,
    is_system = false,
    description = 'Legacy opening offset; replaced by branch Capital'
where is_opening_offset = true or system_code = 'OPENING_BALANCE_EQUITY';

-- Permit system inter-branch due-to/due-from ledgers while keeping manual
-- capital-ledger creation blocked.
do $$
begin
  alter table public.ledger_accounts
    add constraint ledger_accounts_capital_system_only
    check (ledger_type <> 'capital' or is_default_capital or is_opening_offset or system_code like 'INTER_BRANCH:%');
end;
$$;

create or replace function public.provision_branch_system_accounts(p_branch_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_branch_name text := public.account_branch_name(p_branch_id);
begin
  if p_branch_id is null then raise exception 'Branch is required'; end if;
  insert into public.ledger_accounts(
    branch_id, account_name, account_type, description, ledger_type,
    account_kind, system_code, is_system, is_default_capital, is_active
  ) values (
    p_branch_id, 'Capital - ' || v_branch_name, 'equity',
    'Default capital ledger for ' || v_branch_name, 'capital', 'ledger',
    'CAPITAL', true, true, true
  )
  on conflict (branch_id, account_name) do update set
    system_code = 'CAPITAL', is_system = true, is_default_capital = true,
    ledger_type = 'capital', account_kind = 'ledger', is_active = true;
end;
$$;

-- Capital is the only counter-account for bank/cash opening balances.
create or replace function public.sync_bank_account_ledger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ledger_id uuid;
  v_capital_id uuid;
  v_entry_id uuid;
  v_amount numeric(14,2) := round(abs(coalesce(new.opening_balance, 0)), 2);
  v_name text := trim(coalesce(new.account_holder_name, new.bank_name, 'Bank account')) || ' / ' || trim(coalesce(new.bank_name, 'Bank')) || ' (' || public.account_branch_name(new.branch_id) || ')';
begin
  perform public.provision_branch_system_accounts(new.branch_id);
  select id into v_capital_id from public.ledger_accounts where branch_id = new.branch_id and is_default_capital;
  insert into public.ledger_accounts(
    branch_id, account_name, account_type, description, ledger_type, account_kind,
    source_bank_account_id, opening_balance, opening_balance_date, opening_balance_side, is_system, is_active
  ) values (
    new.branch_id, v_name, 'asset', v_name, 'bank', 'bank', new.id,
    v_amount, new.opening_balance_date, 'dr', true, coalesce(new.status, 'active') = 'active'
  )
  on conflict (source_bank_account_id) where source_bank_account_id is not null do update set
    branch_id = excluded.branch_id, account_name = excluded.account_name, description = excluded.description,
    opening_balance = excluded.opening_balance, opening_balance_date = excluded.opening_balance_date,
    is_active = excluded.is_active
  returning id into v_ledger_id;
  delete from public.journal_entries where reference = 'account_opening:bank:' || new.id::text and source_module = 'auto';
  if new.opening_balance_date is not null and v_amount > 0 then
    insert into public.journal_entries(entry_date, branch_id, description, reference, source_module, status, approved_at)
    values (new.opening_balance_date, new.branch_id, 'Opening balance - ' || v_name, 'account_opening:bank:' || new.id::text, 'auto', 'approved', now()) returning id into v_entry_id;
    insert into public.journal_lines(journal_entry_id, line_no, branch_id, ledger_account_id, account_kind, bank_account_id, line_description, debit, credit)
    values (v_entry_id, 1, new.branch_id, v_ledger_id, 'bank', new.id, 'Bank opening balance', v_amount, 0),
           (v_entry_id, 2, new.branch_id, v_capital_id, 'ledger', 'Opening balance credited to Capital', 0, v_amount);
  end if;
  return new;
end;
$$;

create or replace function public.sync_cash_account_ledger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ledger_id uuid;
  v_capital_id uuid;
  v_entry_id uuid;
  v_amount numeric(14,2) := round(abs(coalesce(new.opening_balance, 0)), 2);
  v_name text := trim(coalesce(new.responsible_person, 'Cash account')) || ' (Cash / ' || public.account_branch_name(new.branch_id) || ')';
begin
  perform public.provision_branch_system_accounts(new.branch_id);
  select id into v_capital_id from public.ledger_accounts where branch_id = new.branch_id and is_default_capital;
  insert into public.ledger_accounts(
    branch_id, account_name, account_type, description, ledger_type, account_kind,
    source_cash_account_id, opening_balance, opening_balance_date, opening_balance_side, is_system, is_active
  ) values (
    new.branch_id, v_name, 'asset', v_name, 'cash', 'cash', new.id,
    v_amount, new.opening_balance_date, 'dr', true, true
  )
  on conflict (source_cash_account_id) where source_cash_account_id is not null do update set
    branch_id = excluded.branch_id, account_name = excluded.account_name, description = excluded.description,
    opening_balance = excluded.opening_balance, opening_balance_date = excluded.opening_balance_date, is_active = true
  returning id into v_ledger_id;
  delete from public.journal_entries where reference = 'account_opening:cash:' || new.id::text and source_module = 'auto';
  if new.opening_balance_date is not null and v_amount > 0 then
    insert into public.journal_entries(entry_date, branch_id, description, reference, source_module, status, approved_at)
    values (new.opening_balance_date, new.branch_id, 'Opening balance - ' || v_name, 'account_opening:cash:' || new.id::text, 'auto', 'approved', now()) returning id into v_entry_id;
    insert into public.journal_lines(journal_entry_id, line_no, branch_id, ledger_account_id, account_kind, cash_account_id, line_description, debit, credit)
    values (v_entry_id, 1, new.branch_id, v_ledger_id, 'cash', new.id, 'Cash opening balance', v_amount, 0),
           (v_entry_id, 2, new.branch_id, v_capital_id, 'ledger', 'Opening balance credited to Capital', 0, v_amount);
  end if;
  return new;
end;
$$;

-- The Capital tab now stores the opening amount directly on Capital. No
-- synthetic Opening Balance Equity journal is created.
create or replace function public.set_capital_opening_balance(
  p_branch_id uuid,
  p_opening_balance numeric,
  p_opening_balance_date date,
  p_opening_balance_side text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_capital_id uuid;
  v_amount numeric(14,2) := round(abs(coalesce(p_opening_balance, 0)), 2);
  v_side text := lower(coalesce(p_opening_balance_side, 'cr'));
begin
  if p_branch_id is null then raise exception 'Branch is required'; end if;
  if p_opening_balance_date is null and v_amount > 0 then raise exception 'Opening balance date is required'; end if;
  if v_side not in ('dr', 'cr') then raise exception 'Opening balance side must be dr or cr'; end if;
  perform public.provision_branch_system_accounts(p_branch_id);
  select id into v_capital_id from public.ledger_accounts where branch_id = p_branch_id and is_default_capital for update;
  delete from public.journal_entries where reference = 'account_opening:capital:' || p_branch_id::text and source_module = 'auto';
  update public.ledger_accounts
  set opening_balance = v_amount,
      opening_balance_date = case when v_amount > 0 then p_opening_balance_date else null end,
      opening_balance_side = v_side
  where id = v_capital_id;
  return v_capital_id;
end;
$$;

-- Optional descriptions are accepted; the journal reference remains optional too.
create or replace function public.post_manual_journal(p_payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entry_id uuid;
  v_branch_id uuid := nullif(p_payload->>'branch_id', '')::uuid;
  v_entry_date date := coalesce(nullif(p_payload->>'entry_date', '')::date, current_date);
  v_description text := nullif(trim(p_payload->>'description'), '');
  v_reference text := nullif(trim(p_payload->>'reference'), '');
  v_line jsonb;
  v_line_no integer := 0;
  v_ledger_id uuid;
  v_debit numeric(14,2);
  v_credit numeric(14,2);
begin
  if v_branch_id is null then raise exception 'Branch is required'; end if;
  if jsonb_typeof(p_payload->'lines') <> 'array' then raise exception 'Journal lines are required'; end if;
  if jsonb_array_length(p_payload->'lines') < 2 then raise exception 'At least two journal lines are required'; end if;
  insert into public.journal_entries(entry_date, branch_id, description, reference, source_module, status)
  values (v_entry_date, v_branch_id, v_description, v_reference, 'manual', 'approved') returning id into v_entry_id;
  for v_line in select value from jsonb_array_elements(p_payload->'lines') loop
    v_line_no := v_line_no + 1;
    v_ledger_id := nullif(v_line->>'ledger_account_id', '')::uuid;
    v_debit := round(coalesce(nullif(v_line->>'debit', '')::numeric, 0), 2);
    v_credit := round(coalesce(nullif(v_line->>'credit', '')::numeric, 0), 2);
    if v_ledger_id is null then raise exception 'Line % has no account', v_line_no; end if;
    if v_debit < 0 or v_credit < 0 or (v_debit > 0 and v_credit > 0) or (v_debit = 0 and v_credit = 0) then raise exception 'Line % must contain either a positive debit or a positive credit', v_line_no; end if;
    if not exists (select 1 from public.ledger_accounts where id = v_ledger_id and branch_id = v_branch_id and is_active) then raise exception 'Line % account does not belong to the selected branch', v_line_no; end if;
    insert into public.journal_lines(journal_entry_id, line_no, branch_id, ledger_account_id, account_kind, line_description, debit, credit)
    values (v_entry_id, v_line_no, v_branch_id, v_ledger_id, 'ledger', nullif(trim(v_line->>'line_description'), ''), v_debit, v_credit);
  end loop;
  perform public.validate_journal_entry(v_entry_id);
  return v_entry_id;
end;
$$;

create or replace function public.post_bank_cash_transfer(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_transfer_id uuid := gen_random_uuid();
  v_date date := coalesce(nullif(p_payload->>'entry_date', '')::date, current_date);
  v_amount numeric(14,2) := round(abs(coalesce(nullif(p_payload->>'amount', '')::numeric, 0)), 2);
  v_source_branch uuid := nullif(p_payload->>'source_branch_id', '')::uuid;
  v_destination_branch uuid := nullif(p_payload->>'destination_branch_id', '')::uuid;
  v_source_account uuid := nullif(p_payload->>'source_account_id', '')::uuid;
  v_destination_account uuid := nullif(p_payload->>'destination_account_id', '')::uuid;
  v_source_due uuid;
  v_destination_due uuid;
  v_source_entry uuid;
  v_destination_entry uuid;
  v_description text := nullif(trim(p_payload->>'description'), '');
  v_reference text := nullif(trim(p_payload->>'reference'), '');
  v_source_name text;
  v_destination_name text;
  v_source_branch_name text;
  v_destination_branch_name text;
  v_source_kind text;
  v_destination_kind text;
begin
  if v_source_branch is null or v_destination_branch is null then raise exception 'Source and destination branches are required'; end if;
  if v_source_account is null or v_destination_account is null then raise exception 'Source and destination bank/cash accounts are required'; end if;
  if v_amount <= 0 then raise exception 'Transfer amount must be greater than zero'; end if;
  select account_name, account_kind into v_source_name, v_source_kind from public.ledger_accounts where id = v_source_account and branch_id = v_source_branch and ledger_type in ('bank','cash') and is_active;
  select account_name, account_kind into v_destination_name, v_destination_kind from public.ledger_accounts where id = v_destination_account and branch_id = v_destination_branch and ledger_type in ('bank','cash') and is_active;
  if v_source_name is null or v_destination_name is null then raise exception 'Transfer accounts must be active bank or cash ledgers in their selected branches'; end if;
  select branch_name into v_source_branch_name from public.branches where id = v_source_branch;
  select branch_name into v_destination_branch_name from public.branches where id = v_destination_branch;
  if v_source_branch = v_destination_branch then
    insert into public.journal_entries(entry_date, branch_id, description, reference, source_module, status)
    values (v_date, v_source_branch, coalesce(v_description, 'Bank / cash transfer'), coalesce(v_reference, 'transfer:' || v_transfer_id::text), 'inter_branch', 'approved') returning id into v_source_entry;
    insert into public.journal_lines(journal_entry_id, line_no, branch_id, ledger_account_id, account_kind, line_description, debit, credit)
    values (v_source_entry, 1, v_source_branch, v_destination_account, v_destination_kind, 'Transfer received into ' || v_destination_name, v_amount, 0),
           (v_source_entry, 2, v_source_branch, v_source_account, v_source_kind, 'Transfer sent from ' || v_source_name, 0, v_amount);
    perform public.validate_journal_entry(v_source_entry);
    return jsonb_build_object('transfer_id', v_transfer_id, 'sender_entry_id', v_source_entry, 'receiver_entry_id', v_source_entry);
  end if;

  perform public.provision_branch_system_accounts(v_source_branch);
  perform public.provision_branch_system_accounts(v_destination_branch);
  insert into public.ledger_accounts(branch_id, account_name, account_type, description, ledger_type, account_kind, system_code, is_system, is_active)
  values (v_source_branch, coalesce(v_destination_branch_name, 'Destination') || ' Branch A/c', 'inter_branch', 'Amount due from ' || coalesce(v_destination_branch_name, 'destination branch'), 'capital', 'ledger', 'INTER_BRANCH:' || v_destination_branch::text, true, true)
  on conflict (branch_id, account_name) do update set is_active = true, system_code = excluded.system_code
  returning id into v_source_due;
  insert into public.ledger_accounts(branch_id, account_name, account_type, description, ledger_type, account_kind, system_code, is_system, is_active)
  values (v_destination_branch, coalesce(v_source_branch_name, 'Source') || ' Branch A/c', 'inter_branch', 'Amount payable to ' || coalesce(v_source_branch_name, 'source branch'), 'capital', 'ledger', 'INTER_BRANCH:' || v_source_branch::text, true, true)
  on conflict (branch_id, account_name) do update set is_active = true, system_code = excluded.system_code
  returning id into v_destination_due;

  insert into public.journal_entries(entry_date, branch_id, description, reference, source_module, status)
  values (v_date, v_source_branch, coalesce(v_description, 'Inter-branch transfer to ' || coalesce(v_destination_branch_name, 'destination branch')), coalesce(v_reference, 'transfer:' || v_transfer_id::text || ':sender'), 'inter_branch', 'approved') returning id into v_source_entry;
  insert into public.journal_lines(journal_entry_id, line_no, branch_id, ledger_account_id, account_kind, line_description, debit, credit)
  values (v_source_entry, 1, v_source_branch, v_source_due, 'ledger', 'Amount due from ' || coalesce(v_destination_branch_name, 'destination branch'), v_amount, 0),
         (v_source_entry, 2, v_source_branch, v_source_account, v_source_kind, 'Bank / cash sent to ' || coalesce(v_destination_branch_name, 'destination branch'), 0, v_amount);

  insert into public.journal_entries(entry_date, branch_id, description, reference, source_module, status)
  values (v_date, v_destination_branch, coalesce(v_description, 'Inter-branch transfer from ' || coalesce(v_source_branch_name, 'source branch')), coalesce(v_reference, 'transfer:' || v_transfer_id::text || ':receiver'), 'inter_branch', 'approved') returning id into v_destination_entry;
  insert into public.journal_lines(journal_entry_id, line_no, branch_id, ledger_account_id, account_kind, line_description, debit, credit)
  values (v_destination_entry, 1, v_destination_branch, v_destination_account, v_destination_kind, 'Bank / cash received from ' || coalesce(v_source_branch_name, 'source branch'), v_amount, 0),
         (v_destination_entry, 2, v_destination_branch, v_destination_due, 'ledger', 'Amount payable to ' || coalesce(v_source_branch_name, 'source branch'), 0, v_amount);
  perform public.validate_journal_entry(v_source_entry);
  perform public.validate_journal_entry(v_destination_entry);
  return jsonb_build_object('transfer_id', v_transfer_id, 'sender_entry_id', v_source_entry, 'receiver_entry_id', v_destination_entry);
end;
$$;

grant execute on function public.post_bank_cash_transfer(jsonb) to anon, authenticated;
grant execute on function public.set_capital_opening_balance(uuid, numeric, date, text) to anon, authenticated;
grant execute on function public.post_manual_journal(jsonb) to anon, authenticated;
commit;

-- Verification: no active Opening Balance Equity account should remain, and all
-- journal vouchers should remain balanced.
select count(*) as active_opening_equity_accounts
from public.ledger_accounts
where is_opening_offset = true and is_active = true;
select je.id, je.voucher_number, round(sum(jl.debit), 2) as total_debit, round(sum(jl.credit), 2) as total_credit
from public.journal_entries je join public.journal_lines jl on jl.journal_entry_id = je.id
group by je.id, je.voucher_number
having round(sum(jl.debit), 2) <> round(sum(jl.credit), 2);
