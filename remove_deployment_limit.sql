/*
  Manual Migration: Remove deployment limit constraint

  Purpose:
    Remove the database trigger and function that enforces a maximum
    of 2 deployments per shift type per day.

  When to run:
    Run this migration if you have an existing database with the
    deployment_limit_trigger and need to remove it.

  How to run:
    1. Open your Supabase SQL Editor
    2. Copy and paste this entire script
    3. Execute the script
*/

-- Drop the trigger that enforces deployment limits
DROP TRIGGER IF EXISTS deployment_limit_trigger ON deployments;

-- Drop the function that checks deployment limits
DROP FUNCTION IF EXISTS check_deployment_limit();

-- Confirmation message
DO $$
BEGIN
  RAISE NOTICE 'Deployment limit constraint successfully removed.';
  RAISE NOTICE 'The system now allows unlimited deployments per shift type per day.';
END $$;
