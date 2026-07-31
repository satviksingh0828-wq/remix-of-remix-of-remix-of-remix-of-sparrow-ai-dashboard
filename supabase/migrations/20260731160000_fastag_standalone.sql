-- Create standalone table for Fastag transactions
CREATE TABLE IF NOT EXISTS public.fastag_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  transaction_type text NOT NULL CHECK (transaction_type IN ('recharge', 'deduction')),
  amount numeric NOT NULL DEFAULT 0,
  transaction_date text NOT NULL,
  note text DEFAULT '',
  trip_code text DEFAULT '', -- For deductions, link to the trip
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_fastag_vehicle_id ON public.fastag_transactions(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_fastag_type ON public.fastag_transactions(transaction_type);

-- Enable RLS
ALTER TABLE public.fastag_transactions ENABLE ROW LEVEL SECURITY;

-- Add policies
CREATE POLICY "Allow all access to fastag_transactions" 
ON public.fastag_transactions FOR ALL 
TO anon, authenticated 
USING (true) 
WITH CHECK (true);
