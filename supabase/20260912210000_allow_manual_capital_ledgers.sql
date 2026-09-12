-- Allow the Create Ledger screen to create both Revenue and Capital ledgers.
-- The branch's system/default Capital ledger remains separately provisioned and
-- continues to own the branch-level opening balance.
begin;

alter table public.ledger_accounts
  drop constraint if exists ledger_accounts_capital_system_only;

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
  v_name text := nullif(trim(p_description), '');
  v_type text := lower(trim(coalesce(p_ledger_type, '')));
begin
  if p_branch_id is null then raise exception 'Branch is required'; end if;
  if v_type not in ('revenue', 'capital') then
    raise exception 'Ledger type must be revenue or capital';
  end if;
  if v_name is null then raise exception 'Ledger description is required'; end if;
  if coalesce(p_opening_balance, 0) <> 0 or p_opening_balance_date is not null then
    raise exception 'Opening balances are maintained separately for branch Capital ledgers';
  end if;

  insert into public.ledger_accounts(
    branch_id, account_name, account_type, description, ledger_type,
    account_kind, opening_balance, opening_balance_date, opening_balance_side,
    is_system, is_active
  ) values (
    p_branch_id,
    v_name,
    case when v_type = 'capital' then 'equity' else 'income' end,
    v_name,
    v_type,
    'ledger',
    0,
    null,
    'cr',
    false,
    true
  ) returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.create_manual_ledger(uuid, text, text, numeric, date, text)
to anon, authenticated;

commit;
