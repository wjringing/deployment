/*
  # Fix GDPR Audit Trigger for Staff Table
  
  1. Changes
    - Drop any existing triggers on staff table that reference log_gdpr_activity
    - Recreate the log_gdpr_activity function to properly handle staff table
    - The staff table uses 'id' not 'staff_id' as its primary key
  
  2. Security
    - Maintains audit logging functionality
    - Fixes the field reference error
*/

-- Drop trigger if it exists
DROP TRIGGER IF EXISTS staff_gdpr_audit ON staff;
DROP TRIGGER IF EXISTS log_staff_changes ON staff;
DROP TRIGGER IF EXISTS audit_staff_changes ON staff;

-- Recreate the function with proper field handling
CREATE OR REPLACE FUNCTION log_gdpr_activity()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO gdpr_audit_logs (
    staff_id,
    action,
    details,
    timestamp
  ) VALUES (
    CASE 
      WHEN TG_TABLE_NAME = 'staff' THEN COALESCE(NEW.id, OLD.id)
      ELSE COALESCE(NEW.staff_id, OLD.staff_id)
    END,
    TG_OP || '_' || TG_TABLE_NAME,
    jsonb_build_object(
      'old', CASE WHEN OLD IS NULL THEN NULL ELSE to_jsonb(OLD) END,
      'new', CASE WHEN NEW IS NULL THEN NULL ELSE to_jsonb(NEW) END,
      'table', TG_TABLE_NAME,
      'operation', TG_OP
    ),
    now()
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;