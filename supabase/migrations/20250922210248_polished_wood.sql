/*
  # GDPR Compliance Database Schema

  1. New Tables
    - `gdpr_consent_records` - Track user consent for different data processing purposes
    - `gdpr_audit_logs` - Comprehensive audit trail for all data processing activities
    - `gdpr_breach_reports` - Data breach detection and reporting
    - `gdpr_data_retention` - Automated data retention and deletion tracking

  2. Security
    - Enable RLS on all GDPR tables
    - Add policies for data access control
    - Implement audit triggers

  3. Modifications to Existing Tables
    - Add GDPR compliance fields to staff table
    - Add anonymization support to deployments table
*/

-- GDPR Consent Records Table
CREATE TABLE IF NOT EXISTS gdpr_consent_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid REFERENCES staff(id) ON DELETE CASCADE,
  consent_type text NOT NULL,
  consent_granted boolean NOT NULL DEFAULT false,
  consent_timestamp timestamptz DEFAULT now(),
  consent_version text DEFAULT '1.0',
  ip_address text,
  user_agent text,
  withdrawn_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- GDPR Audit Logs Table
CREATE TABLE IF NOT EXISTS gdpr_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid REFERENCES staff(id) ON DELETE SET NULL,
  action text NOT NULL,
  details jsonb,
  timestamp timestamptz DEFAULT now(),
  ip_address text,
  user_agent text,
  session_id text,
  created_at timestamptz DEFAULT now()
);

-- GDPR Breach Reports Table
CREATE TABLE IF NOT EXISTS gdpr_breach_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  breach_id text UNIQUE NOT NULL,
  detected_at timestamptz DEFAULT now(),
  activity_type text NOT NULL,
  severity text CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  affected_records integer DEFAULT 0,
  status text DEFAULT 'INVESTIGATING' CHECK (status IN ('INVESTIGATING', 'CONFIRMED', 'RESOLVED', 'FALSE_POSITIVE')),
  description text,
  mitigation_steps text,
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- GDPR Data Retention Tracking Table
CREATE TABLE IF NOT EXISTS gdpr_data_retention (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  record_id uuid NOT NULL,
  retention_period_days integer NOT NULL,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL,
  deleted_at timestamptz,
  deletion_reason text
);

-- Add GDPR fields to existing staff table
DO $$
BEGIN
  -- Add GDPR consent tracking
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'staff' AND column_name = 'gdpr_consent_given'
  ) THEN
    ALTER TABLE staff ADD COLUMN gdpr_consent_given boolean DEFAULT false;
  END IF;

  -- Add consent timestamp
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'staff' AND column_name = 'gdpr_consent_timestamp'
  ) THEN
    ALTER TABLE staff ADD COLUMN gdpr_consent_timestamp timestamptz;
  END IF;

  -- Add data retention date
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'staff' AND column_name = 'data_retention_until'
  ) THEN
    ALTER TABLE staff ADD COLUMN data_retention_until timestamptz;
  END IF;

  -- Add privacy settings
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'staff' AND column_name = 'privacy_settings'
  ) THEN
    ALTER TABLE staff ADD COLUMN privacy_settings jsonb DEFAULT '{}';
  END IF;
END $$;

-- Add anonymization support to deployments table
DO $$
BEGIN
  -- Add anonymization flag
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'deployments' AND column_name = 'anonymized'
  ) THEN
    ALTER TABLE deployments ADD COLUMN anonymized boolean DEFAULT false;
  END IF;

  -- Add anonymization timestamp
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'deployments' AND column_name = 'anonymized_at'
  ) THEN
    ALTER TABLE deployments ADD COLUMN anonymized_at timestamptz;
  END IF;
END $$;

-- Enable Row Level Security
ALTER TABLE gdpr_consent_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE gdpr_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE gdpr_breach_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE gdpr_data_retention ENABLE ROW LEVEL SECURITY;

-- RLS Policies for GDPR Consent Records
CREATE POLICY "Users can view their own consent records"
  ON gdpr_consent_records
  FOR SELECT
  TO authenticated
  USING (staff_id = auth.uid());

CREATE POLICY "Users can insert their own consent records"
  ON gdpr_consent_records
  FOR INSERT
  TO authenticated
  WITH CHECK (staff_id = auth.uid());

CREATE POLICY "Users can update their own consent records"
  ON gdpr_consent_records
  FOR UPDATE
  TO authenticated
  USING (staff_id = auth.uid());

-- RLS Policies for GDPR Audit Logs
CREATE POLICY "Users can view their own audit logs"
  ON gdpr_audit_logs
  FOR SELECT
  TO authenticated
  USING (staff_id = auth.uid());

CREATE POLICY "System can insert audit logs"
  ON gdpr_audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policies for GDPR Breach Reports (Admin only)
CREATE POLICY "Admins can manage breach reports"
  ON gdpr_breach_reports
  FOR ALL
  TO authenticated
  USING (true); -- In production, add proper admin role check

-- RLS Policies for GDPR Data Retention
CREATE POLICY "System can manage data retention"
  ON gdpr_data_retention
  FOR ALL
  TO authenticated
  USING (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_gdpr_consent_staff_id ON gdpr_consent_records(staff_id);
CREATE INDEX IF NOT EXISTS idx_gdpr_consent_type ON gdpr_consent_records(consent_type);
CREATE INDEX IF NOT EXISTS idx_gdpr_consent_timestamp ON gdpr_consent_records(consent_timestamp);

CREATE INDEX IF NOT EXISTS idx_gdpr_audit_staff_id ON gdpr_audit_logs(staff_id);
CREATE INDEX IF NOT EXISTS idx_gdpr_audit_action ON gdpr_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_gdpr_audit_timestamp ON gdpr_audit_logs(timestamp);

CREATE INDEX IF NOT EXISTS idx_gdpr_breach_severity ON gdpr_breach_reports(severity);
CREATE INDEX IF NOT EXISTS idx_gdpr_breach_status ON gdpr_breach_reports(status);
CREATE INDEX IF NOT EXISTS idx_gdpr_breach_detected ON gdpr_breach_reports(detected_at);

CREATE INDEX IF NOT EXISTS idx_gdpr_retention_expires ON gdpr_data_retention(expires_at);
CREATE INDEX IF NOT EXISTS idx_gdpr_retention_table ON gdpr_data_retention(table_name);

-- Create function for automatic audit logging
CREATE OR REPLACE FUNCTION log_gdpr_activity()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO gdpr_audit_logs (
    staff_id,
    action,
    details,
    timestamp
  ) VALUES (
    COALESCE(NEW.staff_id, OLD.staff_id),
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

-- Create triggers for audit logging on sensitive tables
DROP TRIGGER IF EXISTS staff_audit_trigger ON staff;
CREATE TRIGGER staff_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON staff
  FOR EACH ROW EXECUTE FUNCTION log_gdpr_activity();

DROP TRIGGER IF EXISTS deployments_audit_trigger ON deployments;
CREATE TRIGGER deployments_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON deployments
  FOR EACH ROW EXECUTE FUNCTION log_gdpr_activity();

-- Create function for automated data retention cleanup
CREATE OR REPLACE FUNCTION cleanup_expired_data()
RETURNS void AS $$
DECLARE
  retention_record RECORD;
BEGIN
  -- Process expired records
  FOR retention_record IN 
    SELECT * FROM gdpr_data_retention 
    WHERE expires_at < now() AND deleted_at IS NULL
  LOOP
    -- Execute deletion based on table name
    CASE retention_record.table_name
      WHEN 'staff' THEN
        UPDATE staff SET 
          name = 'DELETED_USER_' || retention_record.record_id::text,
          gdpr_consent_given = false,
          privacy_settings = '{}'
        WHERE id = retention_record.record_id;
        
      WHEN 'deployments' THEN
        UPDATE deployments SET 
          anonymized = true,
          anonymized_at = now()
        WHERE id = retention_record.record_id;
        
      ELSE
        -- Generic deletion for other tables
        EXECUTE format('DELETE FROM %I WHERE id = $1', retention_record.table_name)
        USING retention_record.record_id;
    END CASE;
    
    -- Mark as deleted
    UPDATE gdpr_data_retention 
    SET deleted_at = now(), deletion_reason = 'Automated retention cleanup'
    WHERE id = retention_record.id;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create scheduled job for data retention (requires pg_cron extension)
-- SELECT cron.schedule('gdpr-cleanup', '0 2 * * *', 'SELECT cleanup_expired_data();');