-- Wallet support: Add columns to transactions and customers
-- Run this in Supabase SQL Editor

-- 1. transactions: is_wallet, wallet_added, wallet_used
ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS is_wallet boolean NOT NULL DEFAULT false;

ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS wallet_added boolean;

ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS wallet_used boolean;

-- 2. customers: wallet_balance
ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS wallet_balance numeric NOT NULL DEFAULT 0;

-- 3. Allow club_id to be null for wallet top-up transactions
-- (Skip this line if club_id is already nullable; it may error if already nullable)
ALTER TABLE public.transactions ALTER COLUMN club_id DROP NOT NULL;

COMMENT ON COLUMN public.transactions.is_wallet IS 'True when this is a wallet top-up or wallet-related transaction';
COMMENT ON COLUMN public.transactions.wallet_added IS 'True when money was added to wallet (credit)';
COMMENT ON COLUMN public.transactions.wallet_used IS 'True when wallet balance was used for payment (debit)';
COMMENT ON COLUMN public.customers.wallet_balance IS 'Current wallet balance in INR';
