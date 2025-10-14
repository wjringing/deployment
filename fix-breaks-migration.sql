-- Migration to fix break_minutes for existing deployments
-- This script recalculates break times based on work hours

-- Function to convert time string (either 24-hour or 12-hour with AM/PM) to decimal hours
CREATE OR REPLACE FUNCTION time_string_to_decimal(time_str TEXT)
RETURNS NUMERIC AS $$
DECLARE
  hours INTEGER;
  minutes INTEGER;
  period TEXT;
BEGIN
  -- Check if time has AM/PM
  IF time_str ~* 'AM|PM' THEN
    -- Parse 12-hour format with AM/PM
    SELECT
      CAST(SPLIT_PART(REGEXP_REPLACE(time_str, '\s*(AM|PM)', '', 'i'), ':', 1) AS INTEGER),
      CAST(SPLIT_PART(REGEXP_REPLACE(time_str, '\s*(AM|PM)', '', 'i'), ':', 2) AS INTEGER),
      UPPER(REGEXP_REPLACE(time_str, '.*\s*([AP]M).*', '\1', 'i'))
    INTO hours, minutes, period;

    -- Convert to 24-hour
    IF period = 'PM' AND hours != 12 THEN
      hours := hours + 12;
    ELSIF period = 'AM' AND hours = 12 THEN
      hours := 0;
    END IF;
  ELSE
    -- Parse 24-hour format
    SELECT
      CAST(SPLIT_PART(time_str, ':', 1) AS INTEGER),
      CAST(SPLIT_PART(time_str, ':', 2) AS INTEGER)
    INTO hours, minutes;
  END IF;

  RETURN hours + (minutes::NUMERIC / 60);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to calculate work hours
CREATE OR REPLACE FUNCTION calculate_work_hours(start_time TEXT, end_time TEXT)
RETURNS NUMERIC AS $$
DECLARE
  start_decimal NUMERIC;
  end_decimal NUMERIC;
BEGIN
  start_decimal := time_string_to_decimal(start_time);
  end_decimal := time_string_to_decimal(end_time);

  -- Handle overnight shifts
  IF end_decimal < start_decimal THEN
    end_decimal := end_decimal + 24;
  END IF;

  RETURN end_decimal - start_decimal;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to calculate break minutes based on work hours and staff age
CREATE OR REPLACE FUNCTION calculate_break_minutes(work_hours NUMERIC, is_under_18 BOOLEAN DEFAULT FALSE)
RETURNS INTEGER AS $$
BEGIN
  IF is_under_18 THEN
    RETURN CASE WHEN work_hours >= 4.5 THEN 30 ELSE 0 END;
  END IF;

  IF work_hours >= 6 THEN
    RETURN 30;
  ELSIF work_hours >= 4.5 THEN
    RETURN 15;
  ELSE
    RETURN 0;
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Update all deployments with correct break times
UPDATE deployments d
SET break_minutes = calculate_break_minutes(
  calculate_work_hours(d.start_time, d.end_time),
  COALESCE(s.is_under_18, FALSE)
)
FROM staff s
WHERE d.staff_id = s.id
  AND (d.break_minutes = 0 OR d.break_minutes IS NULL);

-- Report on changes
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Updated % deployments with recalculated break times', updated_count;
END $$;

-- Show sample of updated records
SELECT
  d.id,
  s.name,
  d.start_time,
  d.end_time,
  calculate_work_hours(d.start_time, d.end_time) as work_hours,
  d.break_minutes,
  d.date
FROM deployments d
JOIN staff s ON d.staff_id = s.id
ORDER BY d.date DESC
LIMIT 10;
