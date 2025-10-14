/*
  # Fix GDPR Audit Trigger for Staff Table

  1. Problem
    - The `log_gdpr_activity()` trigger function tries to access `NEW.staff_id` for all tables
    - The `staff` table doesn't have a `staff_id` column, it has an `id` column
    - This causes "record 'new' has no field 'staff_id'" error when inserting staff

  2. Solution
    - Update the trigger function to use `NEW.id` when the trigger is on the `staff` table
    - Use `NEW.staff_id` for other tables that reference staff
*/

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
      'old', to_jsonb(OLD),
      'new', to_jsonb(NEW),
      'table', TG_TABLE_NAME,
      'operation', TG_OP
    ),
    now()
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;