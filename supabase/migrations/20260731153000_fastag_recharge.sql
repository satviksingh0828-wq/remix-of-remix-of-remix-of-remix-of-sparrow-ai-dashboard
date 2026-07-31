-- Add is_fastag_recharge column to expenditures table
ALTER TABLE public.expenditures ADD COLUMN IF NOT EXISTS is_fastag_recharge boolean NOT NULL DEFAULT false;

-- Add index for faster filtering
CREATE INDEX IF NOT EXISTS idx_expenditures_fastag_recharge ON public.expenditures(is_fastag_recharge) WHERE is_fastag_recharge = true;
