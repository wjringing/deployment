-- Examples for inserting staffing rules into production database
--
-- VALID rule_type values:
--   - 'require_position'
--   - 'exclude_position'
--   - 'adjust_count'
--   - 'custom'

-- Example 1: Require a Manager on Night Shift for DT1
INSERT INTO conditional_staffing_rules (
  location_id,
  rule_name,
  rule_type,
  condition,
  action,
  is_active,
  priority
) VALUES (
  'd9f2a15e-1465-4ab6-bffc-9bdb3d461978'::uuid,  -- Oswestry location
  'Require Manager on Night Shift DT1',
  'require_position',  -- Must be one of the 4 valid values
  '{"and": [{"dt_type": "DT1"}, {"shift_type": "Night Shift"}]}'::jsonb,
  '{"position": "Manager", "count": 1}'::jsonb,
  true,
  10
);

-- Example 2: Exclude under-18s from certain positions
INSERT INTO conditional_staffing_rules (
  location_id,
  rule_name,
  rule_type,
  condition,
  action,
  is_active,
  priority
) VALUES (
  'd9f2a15e-1465-4ab6-bffc-9bdb3d461978'::uuid,
  'No under-18s on Fryer after 10pm',
  'exclude_position',
  '{"and": [{"time": {"gte": "22:00"}}, {"position": "Fryer"}]}'::jsonb,
  '{"exclude_staff_with": {"is_under_18": true}}'::jsonb,
  true,
  5
);

-- Example 3: Adjust Cook count based on forecast
INSERT INTO conditional_staffing_rules (
  location_id,
  rule_name,
  rule_type,
  condition,
  action,
  is_active,
  priority
) VALUES (
  'd9f2a15e-1465-4ab6-bffc-9bdb3d461978'::uuid,
  'Extra Cook on high-forecast days',
  'adjust_count',
  '{"forecast": {"gte": 5000}}'::jsonb,
  '{"position": "Cook", "adjustment": 1}'::jsonb,
  true,
  8
);

-- Example 4: Custom rule with complex logic
INSERT INTO conditional_staffing_rules (
  location_id,
  rule_name,
  rule_type,
  condition,
  action,
  is_active,
  priority
) VALUES (
  'd9f2a15e-1465-4ab6-bffc-9bdb3d461978'::uuid,
  'Saturday Night Minimum Staffing',
  'custom',
  '{"and": [{"day_of_week": "Saturday"}, {"shift_type": "Night Shift"}]}'::jsonb,
  '{"min_positions": {"Manager": 1, "Cook": 2, "Runner": 1}}'::jsonb,
  true,
  15
);

-- Verify your rules
SELECT
  rule_name,
  rule_type,
  is_active,
  priority,
  condition,
  action
FROM conditional_staffing_rules
WHERE location_id = 'd9f2a15e-1465-4ab6-bffc-9bdb3d461978'
ORDER BY priority DESC;
