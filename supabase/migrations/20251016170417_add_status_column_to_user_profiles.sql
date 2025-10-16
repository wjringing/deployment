/*
  # Add status column to user_profiles table

  1. Changes
    - Add `status` column to user_profiles table with default value 'active'
    - Add check constraint to ensure status is one of: 'active', 'inactive', 'suspended'

  2. Notes
    - This column is required for user account management
    - All existing users will default to 'active' status
*/

-- Add status column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'status'
  ) THEN
    ALTER TABLE user_profiles 
    ADD COLUMN status text DEFAULT 'active';
    
    -- Add check constraint
    ALTER TABLE user_profiles 
    ADD CONSTRAINT user_profiles_status_check 
    CHECK (status IN ('active', 'inactive', 'suspended'));
  END IF;
END $$;
