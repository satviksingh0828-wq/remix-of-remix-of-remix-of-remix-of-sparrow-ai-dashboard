-- Allow users to remove manually posted journal entries from the Accounts Journal list.
-- Automatic opening and transfer entries must remain tied to their source workflows.
begin;

create or replace function public.delete_manual_journal_entry(p_entry_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_source_module text;
begin
  if p_entry_id is null then
    raise exception 'Journal entry is required';
  end if;

  select source_module
    into v_source_module
    from public.journal_entries
   where id = p_entry_id
   for update;

  if v_source_module is null then
    raise exception 'Journal entry was not found';
  end if;
  if v_source_module <> 'manual' then
    raise exception 'Only manual journal entries can be deleted here';
  end if;

  -- journal_lines.journal_entry_id is ON DELETE CASCADE.
  delete from public.journal_entries where id = p_entry_id;
end;
$$;

grant execute on function public.delete_manual_journal_entry(uuid)
to anon, authenticated;

commit;
