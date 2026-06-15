CREATE TABLE IF NOT EXISTS payment_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text UNIQUE NOT NULL,
  approve_token uuid UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  listing_id uuid REFERENCES listings(id),
  order_type text NOT NULL CHECK (order_type IN ('boost_premium', 'boost_facebook', 'quota')),
  package_key text NOT NULL,
  amount_baht integer NOT NULL,
  slip_storage_path text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'slip_submitted', 'approved', 'rejected')),
  notes text,
  created_at timestamptz DEFAULT now(),
  processed_at timestamptz
);

ALTER TABLE payment_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_orders" ON payment_orders FOR ALL USING (auth.uid() = user_id);
