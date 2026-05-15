-- wallet_transactions table (if not yet created)
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id          bigserial PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount      int  NOT NULL,
  type        text NOT NULL CHECK (type IN ('topup', 'spend', 'admin_grant', 'bonus')),
  description text,
  omise_charge_id text,
  status      text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed')),
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS wallet_transactions_user_id_idx ON wallet_transactions(user_id);
CREATE INDEX IF NOT EXISTS wallet_transactions_omise_charge_id_idx ON wallet_transactions(omise_charge_id);

-- RLS
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;

-- Users can only see their own transactions
DROP POLICY IF EXISTS "Users can view own wallet transactions" ON wallet_transactions;
CREATE POLICY "Users can view own wallet transactions"
  ON wallet_transactions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Only service role (admin client) can insert/update
-- (no policies for insert/update = only service_role can do it)

-- increment_wallet_balance function (SECURITY DEFINER to bypass RLS)
CREATE OR REPLACE FUNCTION increment_wallet_balance(p_user_id uuid, p_amount int)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE profiles
  SET wallet_balance = COALESCE(wallet_balance, 0) + p_amount
  WHERE id = p_user_id;
END;
$$;

REVOKE ALL ON FUNCTION increment_wallet_balance(uuid, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION increment_wallet_balance(uuid, int) TO service_role;
