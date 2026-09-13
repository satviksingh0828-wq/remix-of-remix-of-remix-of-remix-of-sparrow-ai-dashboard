-- Branch capital prerequisite and asset/liability opening balances.
-- Each branch has one active default Capital account. Asset and Liability
-- ledgers require that account and create a balanced opening journal against it.

begin;

-- Retire duplicate default-capital flags before adding the one-per-branch index.
with ranked as (
  select id,
         row_number() over (partition by branch_id order by is_active desc, created_at, id) as rn
  from public.ledger_accounts
  where is_default_capital
)
update public.ledger_accounts la
set is_default_capital = false,
    is_active = false,
    description = coalesce(nullif(la.description, ''), la.account_name) || ' (legacy duplicate capital)'
from ranked r
where la.id = r.id and r.rn > 1;

create unique index if not exists ledger_accounts_one_default_capital_per_branch
  on public.ledger_accounts(branch_id)
  where is_default_capital;

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
declare
  v_id uuid;
  v_capital_id uuid;
  v_entry_id uuid;
  v_name text := nullif(trim(p_description), '');
  v_type text := lower(trim(coalesce(p_ledger_type, '')));
  v_amount numeric(14,2) := round(abs(coalesce(p_opening_balance, 0)), 2);
  v_side text := lower(coalesce(p_opening_balance_side, case when v_type = 'liability' then 'cr' else 'dr' end));
begin
  if p_branch_id is null then raise exception 'Branch is required'; end if;
  if v_type not in ('asset', 'liability', 'income', 'expenditure') then
    raise exception 'Ledger type must be asset, liability, income, or expenditure';
  end if;
  if v_name is null then raise exception 'Ledger description is required'; end if;
  if v_side not in ('dr', 'cr') then raise exception 'Opening balance side must be dr or cr'; end if;
  if v_type in ('income', 'expenditure') and (v_amount <> 0 or p_opening_balance_date is not null) then
    raise exception 'Income and expenditure ledgers cannot have opening balances';
  end if;
  if v_type in ('asset', 'liability') and v_amount > 0 and p_opening_balance_date is null then
    raise exception 'Opening balance date is required for asset and liability ledgers';
  end if;

  select id into v_capital_id
  from public.ledger_accounts
  where branch_id = p_branch_id and is_default_capital and is_active
  for update;
  if v_capital_id is null then
    raise exception 'Create the branch Capital account before creating other ledgers';
  end if;

  insert into public.ledger_accounts(
    branch_id, account_name, account_type, description, ledger_type,
    account_kind, opening_balance, opening_balance_date, opening_balance_side,
    is_system, is_active
  ) values (
    p_branch_id, v_name, v_type, v_name, v_type, 'ledger',
    v_amount, case when v_amount > 0 then p_opening_balance_date else null end,
    v_side, false, true
  ) returning id into v_id;

  if v_amount > 0 then
    insert into public.journal_entries(
      entry_date, branch_id, description, reference, source_module, status, approved_at
    ) values (
      p_opening_balance_date, p_branch_id, 'Opening balance - ' || v_name,
      'ledger_opening:' || v_id::text, 'auto', 'approved', now()
    ) returning id into v_entry_id;

    insert into public.journal_lines(
      journal_entry_id, line_no, branch_id, ledger_account_id, account_kind,
      line_description, debit, credit
    ) values (
      v_entry_id, 1, p_branch_id, v_id, 'ledger',
      'Opening balance - ' || v_name,
      case when v_side = 'dr' then v_amount else 0 end,
      case when v_side = 'cr' then v_amount else 0 end
    ), (
      v_entry_id, 2, p_branch_id, v_capital_id, 'ledger',
      'Opening balance offset to branch Capital',
      case when v_side = 'cr' then v_amount else 0 end,
      case when v_side = 'dr' then v_amount else 0 end
    );
    perform public.validate_journal_entry(v_entry_id);
  end if;

  return v_id;
end;
$$;

grant execute on function public.create_manual_ledger(uuid, text, text, numeric, date, text)
to anon, authenticated;

commit;

-- Verification queries:
-- select branch_id, count(*) from public.ledger_accounts where is_default_capital group by branch_id having count(*) <> 1;
-- select je.voucher_number, round(sum(jl.debit),2) debit, round(sum(jl.credit),2) credit
-- from public.journal_entries je join public.journal_lines jl on jl.journal_entry_id = je.id
-- where je.reference like 'ledger_opening:%'
-- group by je.id, je.voucher_number having round(sum(jl.debit),2) <> round(sum(jl.credit),2);
