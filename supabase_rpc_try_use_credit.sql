-- Atomic RPC: try to use 1 credit
-- Returns true if credit was deducted, false if not enough credits
-- This prevents race conditions by doing the check + deduction in a single atomic operation

CREATE OR REPLACE FUNCTION try_use_credit(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  rows_affected integer;
BEGIN
  UPDATE public.profiles
  SET credits = credits - 1
  WHERE id = p_user_id AND credits > 0;
  
  GET DIAGNOSTICS rows_affected = ROW_COUNT;
  RETURN rows_affected > 0;
END;
$$;

-- Also ensure the old decrement_credits RPC exists as a safe fallback
CREATE OR REPLACE FUNCTION decrement_credits(user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.profiles
  SET credits = credits - 1
  WHERE id = user_id AND credits > 0;
END;
$$;
