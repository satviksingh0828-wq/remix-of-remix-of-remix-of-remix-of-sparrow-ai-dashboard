-- Accounts > Capital Ledger and Journal hardening
-- Adds one capital and one opening-balance-equity ledger per branch,
-- enforces revenue opening-balance rules, and provides atomic balanced posting.
begin;

create extension if not exists pgcrypto;

alter table public.ledger_accounts
  add column if not exists system_code text;
alter table public.ledger_accounts
  add column if not exists is_default_capital boolean not null default false;
alter table public.ledger_accounts
  add column if not exists is_opening_offset boolean not null default false;

-- Existing journal offset rows were created without a real ledger account. They
-- are repaired below after the branch offset ledgers are provisioned.
create index if not exists ledger_accounts_system_code_idx
  on public.ledger_accounts(branch_id, system_code)
  where system_code is not null;

create unique index if not exists ledger_accounts_default_capital_uidx
  on public.ledger_accounts(branch_id)
  where is_default_capital;
create unique index if not exists ledger_accounts_opening_offset_uidx
  on public.ledger_accounts(branch_id)
  where is_opening_offset;

create or replace function public.account_branch_name(p_branch_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(nullif(trim(branch_name), ''), 'Branch')
  from public.branches
  where id = p_branch_id;
$$;

create or replace function public.provision_branch_system_accounts(p_branch_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_branch_name text := public.account_branch_name(p_branch_id);
  v_capital_id uuid;
  v_offset_id uuid;
begin
  if p_branch_id is null then
    raise exception 'Branch is required';
  end if;

  insert into public.ledger_accounts(
    branch_id, account_name, account_type, description, ledger_type,
    account_kind, system_code, is_system, is_default_capital, is_active
  ) values (
    p_branch_id, 'Capital - ' || v_branch_name, 'equity',
    'Default capital ledger for ' || v_branch_name, 'capital', 'ledger',
    'CAPITAL', true, true, true
  )
  on conflict (branch_id, account_name) do update set
    system_code = coalesce(public.ledger_accounts.system_code, excluded.system_code),
    is_system = true,
    is_default_capital = true,
    ledger_type = 'capital',
    is_active = true
  returning id into v_capital_id;

  if v_capital_id is null then
    select id into v_capital_id
    from public.ledger_accounts
    where branch_id = p_branch_id and is_default_capital
    limit 1;
  end if;

  insert into public.ledger_accounts(
    branch_id, account_name, account_type, description, ledger_type,
    account_kind, system_code, is_system, is_opening_offset, is_active
  ) values (
    p_branch_id, 'Opening Balance Equity - ' || v_branch_name, 'equity',
    'Automatic opening-balance offset for ' || v_branch_name, 'capital', 'ledger',
    'OPENING_BALANCE_EQUITY', true, true, true
  )
  on conflict (branch_id, account_name) do update set
    system_code = coalesce(public.ledger_accounts.system_code, excluded.system_code),
    is_system = true,
    is_opening_offset = true,
    is_active = true
  returning id into v_offset_id;

  if v_offset_id is null then
    select id into v_offset_id
    from public.ledger_accounts
    where branch_id = p_branch_id and is_opening_offset
    limit 1;
  end if;
end;
$$;

-- Provision system accounts before repairing existing orphan offset lines.
do $$
declare
  r record;
begin
  for r in select id from public.branches loop
    perform public.provision_branch_system_accounts(r.id);
  end loop;
end;
$$;

update public.ledger_accounts
set system_code = 'CAPITAL', is_system = true, is_default_capital = true,
    ledger_type = 'capital', account_kind = 'ledger', is_active = true
where is_default_capital = true or system_code = 'CAPITAL';

update public.ledger_accounts
set system_code = 'OPENING_BALANCE_EQUITY', is_system = true,
    is_opening_offset = true, account_kind = 'ledger', is_active = true
where is_opening_offset = true or system_code = 'OPENING_BALANCE_EQUITY';

-- Repair legacy offset lines by linking them to the branch's real offset ledger.
update public.journal_lines jl
set ledger_account_id = oe.id,
    account_kind = 'ledger',
    branch_id = coalesce(jl.branch_id, je.branch_id)
from public.journal_entries je
join public.ledger_accounts oe
  on oe.branch_id = je.branch_id and oe.is_opening_offset
where jl.journal_entry_id = je.id
  and jl.ledger_account_id is null;

-- Revenue ledgers never hold opening balances.
update public.ledger_accounts
set opening_balance = 0, opening_balance_date = null, opening_balance_side = 'dr'
where ledger_type = 'revenue';

-- Add idempotent checks that are not expressible in the original table create.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'ledger_accounts_revenue_no_opening') then
    alter table public.ledger_accounts
      add constraint ledger_accounts_revenue_no_opening
      check (ledger_type <> 'revenue' or (opening_balance = 0 and opening_balance_date is null));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'journal_lines_ledger_required') then
    alter table public.journal_lines
      add constraint journal_lines_ledger_required check (ledger_account_id is not null);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'ledger_accounts_capital_system_only') then
    alter table public.ledger_accounts
      add constraint ledger_accounts_capital_system_only
      check (ledger_type <> 'capital' or is_default_capital or is_opening_offset);
  end if;
end;
$$;

create or replace function public.validate_journal_entry(p_entry_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_branch_id uuid;
  v_count integer;
  v_debit numeric(18,2);
  v_credit numeric(18,2);
begin
  select branch_id into v_branch_id from public.journal_entries where id = p_entry_id;
  if v_branch_id is null then raise exception 'Journal branch is required'; end if;

  select count(*), coalesce(sum(debit), 0), coalesce(sum(credit), 0)
  into v_count, v_debit, v_credit
  from public.journal_lines
  where journal_entry_id = p_entry_id;

  if v_count < 2 then raise exception 'A journal entry must have at least two lines'; end if;
  if round(v_debit, 2) <> round(v_credit, 2) then
    raise exception 'Journal entry is not balanced: debit % and credit %', v_debit, v_credit;
  end if;
  if v_debit <= 0 then raise exception 'Journal entry total must be greater than zero'; end if;

  if exists (
    select 1
    from public.journal_lines jl
    left join public.ledger_accounts la on la.id = jl.ledger_account_id
    where jl.journal_entry_id = p_entry_id
      and (la.id is null or la.branch_id <> v_branch_id or not la.is_active)
  ) then
    raise exception 'Every journal line must use an active ledger from the entry branch';
  end if;
end;
$$;

create or replace function public.validate_journal_entry_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    if not exists (select 1 from public.journal_entries where id = old.journal_entry_id) then
      return old;
    end if;
    perform public.validate_journal_entry(old.journal_entry_id);
  elsif tg_table_name = 'journal_lines' then
    perform public.validate_journal_entry(new.journal_entry_id);
  else
    perform public.validate_journal_entry(new.id);
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists journal_entries_validate_balance on public.journal_entries;
create constraint trigger journal_entries_validate_balance
after insert or update on public.journal_entries
deferrable initially deferred
for each row execute function public.validate_journal_entry_trigger();

drop trigger if exists journal_lines_validate_balance on public.journal_lines;
create constraint trigger journal_lines_validate_balance
after insert or update or delete on public.journal_lines
deferrable initially deferred
for each row execute function public.validate_journal_entry_trigger();

create or replace function public.create_revenue_ledger(
  p_branch_id uuid,
  p_description text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_name text := nullif(trim(p_description), '');
begin
  if p_branch_id is null then raise exception 'Branch is required'; end if;
  if v_name is null then raise exception 'Ledger description is required'; end if;
  insert into public.ledger_accounts(
    branch_id, account_name, account_type, description, ledger_type,
    account_kind, opening_balance, opening_balance_date, opening_balance_side,
    is_system, is_active
  ) values (
    p_branch_id, v_name, 'income', v_name, 'revenue', 'ledger', 0, null, 'dr', false, true
  ) returning id into v_id;
  return v_id;
end;
$$;

-- Keep older clients safe: revenue remains supported, while capital can only
-- be maintained through the branch Capital tab.
create or replace function public.create_manual_ledger(
  p_branch_id uuid,
  p_ledger_type text,
  p_description text,
  p_opening_balance numeric,
  p_opening_balance_date date,
  p_opening_balance_side text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_ledger_type <> 'revenue' then
    raise exception 'Manual capital ledgers are not allowed; use the branch Capital tab';
  end if;
  if coalesce(p_opening_balance, 0) <> 0 or p_opening_balance_date is not null then
    raise exception 'Revenue ledgers cannot have opening balances';
  end if;
  return public.create_revenue_ledger(p_branch_id, p_description);
end;
$$;

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
  v_offset_id uuid;
  v_old_entry_id uuid;
  v_entry_id uuid;
  v_amount numeric(14,2) := round(abs(coalesce(p_opening_balance, 0)), 2);
  v_side text := lower(coalesce(p_opening_balance_side, 'cr'));
begin
  if p_branch_id is null then raise exception 'Branch is required'; end if;
  if p_opening_balance_date is null and v_amount > 0 then raise exception 'Opening balance date is required'; end if;
  if v_side not in ('dr', 'cr') then raise exception 'Opening balance side must be dr or cr'; end if;
  perform public.provision_branch_system_accounts(p_branch_id);

  select id into v_capital_id from public.ledger_accounts
  where branch_id = p_branch_id and is_default_capital for update;
  select id into v_offset_id from public.ledger_accounts
  where branch_id = p_branch_id and is_opening_offset for update;

  select id into v_old_entry_id from public.journal_entries
  where reference = 'account_opening:capital:' || p_branch_id::text
    and source_module = 'auto';
  if v_old_entry_id is not null then
    delete from public.journal_entries where id = v_old_entry_id;
  end if;

  update public.ledger_accounts
  set opening_balance = v_amount,
      opening_balance_date = case when v_amount > 0 then p_opening_balance_date else null end,
      opening_balance_side = v_side
  where id = v_capital_id;

  if v_amount > 0 then
    insert into public.journal_entries(
      entry_date, branch_id, description, reference, source_module, status, approved_at
    ) values (
      p_opening_balance_date, p_branch_id, 'Opening balance - Capital',
      'account_opening:capital:' || p_branch_id::text, 'auto', 'approved', now()
    ) returning id into v_entry_id;

    insert into public.journal_lines(
      journal_entry_id, line_no, branch_id, ledger_account_id,
      account_kind, line_description, debit, credit
    ) values
      (v_entry_id, 1, p_branch_id, case when v_side = 'dr' then v_capital_id else v_offset_id end,
       'ledger', 'Capital opening balance', case when v_side = 'dr' then v_amount else 0 end,
       case when v_side = 'cr' then v_amount else 0 end),
      (v_entry_id, 2, p_branch_id, case when v_side = 'dr' then v_offset_id else v_capital_id end,
       'ledger', 'Opening balance offset', case when v_side = 'cr' then v_amount else 0 end,
       case when v_side = 'dr' then v_amount else 0 end);
  end if;
  return v_capital_id;
end;
$$;

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
  v_total_debit numeric(18,2) := 0;
  v_total_credit numeric(18,2) := 0;
begin
  if v_branch_id is null then raise exception 'Branch is required'; end if;
  if v_description is null then raise exception 'Description is required'; end if;
  if jsonb_typeof(p_payload->'lines') <> 'array' then raise exception 'Journal lines are required'; end if;
  if jsonb_array_length(p_payload->'lines') < 2 then raise exception 'At least two journal lines are required'; end if;

  insert into public.journal_entries(
    entry_date, branch_id, description, reference, source_module, status
  ) values (
    v_entry_date, v_branch_id, v_description, v_reference, 'manual', 'approved'
  ) returning id into v_entry_id;

  for v_line in select value from jsonb_array_elements(p_payload->'lines') loop
    v_line_no := v_line_no + 1;
    v_ledger_id := nullif(v_line->>'ledger_account_id', '')::uuid;
    v_debit := round(coalesce(nullif(v_line->>'debit', '')::numeric, 0), 2);
    v_credit := round(coalesce(nullif(v_line->>'credit', '')::numeric, 0), 2);
    if v_ledger_id is null then raise exception 'Line % has no account', v_line_no; end if;
    if v_debit < 0 or v_credit < 0 or (v_debit > 0 and v_credit > 0) or (v_debit = 0 and v_credit = 0) then
      raise exception 'Line % must contain either a positive debit or a positive credit', v_line_no;
    end if;
    if not exists (select 1 from public.ledger_accounts where id = v_ledger_id and branch_id = v_branch_id and is_active) then
      raise exception 'Line % account does not belong to the selected branch', v_line_no;
    end if;
    insert into public.journal_lines(
      journal_entry_id, line_no, branch_id, ledger_account_id, account_kind,
      bank_account_id, cash_account_id, line_description, debit, credit
    )
    select v_entry_id, v_line_no, v_branch_id, la.id, la.account_kind,
      la.source_bank_account_id, la.source_cash_account_id,
      nullif(trim(v_line->>'line_description'), ''), v_debit, v_credit
    from public.ledger_accounts la where la.id = v_ledger_id;
    v_total_debit := v_total_debit + v_debit;
    v_total_credit := v_total_credit + v_credit;
  end loop;

  if v_total_debit <= 0 or round(v_total_debit, 2) <> round(v_total_credit, 2) then
    raise exception 'Journal is not balanced: debit % and credit %', v_total_debit, v_total_credit;
  end if;
  perform public.validate_journal_entry(v_entry_id);
  update public.journal_entries set approved_at = now() where id = v_entry_id;
  return v_entry_id;
end;
$$;

-- Correct auto-opening behavior for bank and cash rows by regenerating their
-- opening entries with a real Opening Balance Equity ledger.
create or replace function public.sync_bank_account_ledger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ledger_id uuid;
  v_offset_id uuid;
  v_entry_id uuid;
  v_amount numeric(14,2) := round(abs(coalesce(new.opening_balance, 0)), 2);
  v_name text := trim(coalesce(new.account_holder_name, new.bank_name, 'Bank account')) || ' / ' || trim(coalesce(new.bank_name, 'Bank')) || ' (' || public.account_branch_name(new.branch_id) || ')';
begin
  perform public.provision_branch_system_accounts(new.branch_id);
  select id into v_offset_id from public.ledger_accounts where branch_id = new.branch_id and is_opening_offset;
  insert into public.ledger_accounts(
    branch_id, account_name, account_type, description, ledger_type, account_kind,
    source_bank_account_id, opening_balance, opening_balance_date, opening_balance_side, is_system, is_active
  ) values (
    new.branch_id, v_name, 'asset', v_name, 'bank', 'bank', new.id, v_amount, new.opening_balance_date, 'dr', true,
    coalesce(new.status, 'active') = 'active'
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
           (v_entry_id, 2, new.branch_id, v_offset_id, 'ledger', 'Opening balance offset', 0, v_amount);
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
  v_offset_id uuid;
  v_entry_id uuid;
  v_amount numeric(14,2) := round(abs(coalesce(new.opening_balance, 0)), 2);
  v_name text := trim(coalesce(new.responsible_person, 'Cash account')) || ' (Cash / ' || public.account_branch_name(new.branch_id) || ')';
begin
  perform public.provision_branch_system_accounts(new.branch_id);
  select id into v_offset_id from public.ledger_accounts where branch_id = new.branch_id and is_opening_offset;
  insert into public.ledger_accounts(
    branch_id, account_name, account_type, description, ledger_type, account_kind,
    source_cash_account_id, opening_balance, opening_balance_date, opening_balance_side, is_system, is_active
  ) values (new.branch_id, v_name, 'asset', v_name, 'cash', 'cash', new.id, v_amount, new.opening_balance_date, 'dr', true, true)
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
           (v_entry_id, 2, new.branch_id, v_offset_id, 'ledger', 'Opening balance offset', 0, v_amount);
  end if;
  return new;
end;
$$;

create or replace function public.provision_branch_system_accounts_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.provision_branch_system_accounts(new.id);
  return new;
end;
$$;

drop trigger if exists branches_provision_accounts on public.branches;
create trigger branches_provision_accounts
after insert on public.branches
for each row execute function public.provision_branch_system_accounts_trigger();

grant execute on function public.provision_branch_system_accounts(uuid) to anon, authenticated;
grant execute on function public.provision_branch_system_accounts_trigger() to anon, authenticated;
grant execute on function public.create_revenue_ledger(uuid, text) to anon, authenticated;
grant execute on function public.create_manual_ledger(uuid, text, text, numeric, date, text) to anon, authenticated;
grant execute on function public.set_capital_opening_balance(uuid, numeric, date, text) to anon, authenticated;
grant execute on function public.post_manual_journal(jsonb) to anon, authenticated;
grant execute on function public.validate_journal_entry(uuid) to anon, authenticated;

commit;

-- Verification queries.
select b.id, b.branch_name,
  count(*) filter (where la.is_default_capital) as capital_ledgers,
  count(*) filter (where la.is_opening_offset) as opening_offset_ledgers
from public.branches b
left join public.ledger_accounts la on la.branch_id = b.id
 group by b.id, b.branch_name
 order by b.branch_name;
select ledger_type, count(*) as invalid_revenue_opening_rows
from public.ledger_accounts
where ledger_type = 'revenue' and (opening_balance <> 0 or opening_balance_date is not null)
group by ledger_type;
select je.id, je.voucher_number, round(sum(jl.debit), 2) as total_debit, round(sum(jl.credit), 2) as total_credit
from public.journal_entries je
join public.journal_lines jl on jl.journal_entry_id = je.id
group by je.id, je.voucher_number
having round(sum(jl.debit), 2) <> round(sum(jl.credit), 2);
