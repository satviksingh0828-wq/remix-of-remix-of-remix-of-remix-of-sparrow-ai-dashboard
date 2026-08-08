-- Assign each source/contract to a controlling branch. Existing sources remain
-- unassigned until an administrator updates them in the Sources form.
ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS branch_id uuid
  REFERENCES public.branches(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS contracts_branch_id_idx
  ON public.contracts(branch_id);
