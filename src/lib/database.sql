-- Run this script in the Supabase SQL Editor

-- 1. Create the user_credits table
CREATE TABLE IF NOT EXISTS user_credits (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  credits INT NOT NULL DEFAULT 3,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS but we don't need policies because we use SECURITY DEFINER functions
ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;

-- 2. Function to safely get credits
CREATE OR REPLACE FUNCTION get_my_credit()
RETURNS int AS $$
DECLARE
  current_credits int;
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN RETURN 0; END IF;
  
  SELECT credits INTO current_credits FROM user_credits WHERE user_id = uid;
  IF NOT FOUND THEN
    RETURN 3; -- Default free credits
  END IF;
  
  RETURN current_credits;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Function to safely decrement credits
CREATE OR REPLACE FUNCTION decrement_my_credit()
RETURNS int AS $$
DECLARE
  current_credits int;
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT credits INTO current_credits FROM user_credits WHERE user_id = uid;
  
  IF NOT FOUND THEN
    -- If user doesn't exist in table yet, give them 3, but deduct 1 immediately = 2
    INSERT INTO user_credits (user_id, credits) VALUES (uid, 2) RETURNING credits INTO current_credits;
  ELSE
    IF current_credits > 0 THEN
      UPDATE user_credits SET credits = credits - 1, updated_at = NOW() WHERE user_id = uid RETURNING credits INTO current_credits;
    ELSE
      RAISE EXCEPTION 'Insufficient credits';
    END IF;
  END IF;
  
  RETURN current_credits;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
