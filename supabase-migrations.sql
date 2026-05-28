-- Run this in your Supabase SQL editor (Dashboard → SQL Editor → New query)

-- 1. Add share_id column to songs table
ALTER TABLE songs ADD COLUMN IF NOT EXISTS share_id TEXT UNIQUE;

-- 2. Allow anyone to read songs that have been shared (share_id is not null)
CREATE POLICY IF NOT EXISTS "Public can read shared songs"
  ON songs FOR SELECT
  USING (share_id IS NOT NULL);

-- 3. Create subscriptions table for Stripe
CREATE TABLE IF NOT EXISTS subscriptions (
  id                     UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id                UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  stripe_customer_id     TEXT,
  stripe_subscription_id TEXT,
  status                 TEXT NOT NULL DEFAULT 'free',
  created_at             TIMESTAMPTZ DEFAULT NOW(),
  updated_at             TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Users can read own subscription"
  ON subscriptions FOR SELECT
  USING (auth.uid() = user_id);
