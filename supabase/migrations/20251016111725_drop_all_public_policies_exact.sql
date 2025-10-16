/*
  # Drop All Public Policies - Exact List

  ## Security Fix
  Removes all 57 public policies to ensure only authenticated users can access data.
*/

-- assignment_history
DROP POLICY IF EXISTS "Public can delete assignment history" ON assignment_history;
DROP POLICY IF EXISTS "Public can insert assignment history" ON assignment_history;
DROP POLICY IF EXISTS "Public can update assignment history" ON assignment_history;
DROP POLICY IF EXISTS "Public can view assignment history" ON assignment_history;

-- auto_assignment_rules
DROP POLICY IF EXISTS "Public can delete auto assignment rules" ON auto_assignment_rules;
DROP POLICY IF EXISTS "Public can insert auto assignment rules" ON auto_assignment_rules;
DROP POLICY IF EXISTS "Public can update auto assignment rules" ON auto_assignment_rules;
DROP POLICY IF EXISTS "Public can view auto assignment rules" ON auto_assignment_rules;

-- break_schedules
DROP POLICY IF EXISTS "Allow all operations on break_schedules" ON break_schedules;

-- checklist_completions
DROP POLICY IF EXISTS "Allow all operations on checklist_completions" ON checklist_completions;

-- checklist_item_completions
DROP POLICY IF EXISTS "Allow all operations on checklist_item_completions" ON checklist_item_completions;

-- checklist_items
DROP POLICY IF EXISTS "Allow all operations on checklist_items" ON checklist_items;

-- checklists
DROP POLICY IF EXISTS "Allow all operations on checklists" ON checklists;

-- cross_training_opportunities
DROP POLICY IF EXISTS "Public can manage cross-training opportunities" ON cross_training_opportunities;
DROP POLICY IF EXISTS "Public can view cross-training opportunities" ON cross_training_opportunities;

-- deployment_auto_assignment_config
DROP POLICY IF EXISTS "Allow all operations on deployment_auto_assignment_config" ON deployment_auto_assignment_config;

-- deployments
DROP POLICY IF EXISTS "Allow all operations on deployments" ON deployments;

-- handover_notes
DROP POLICY IF EXISTS "Allow all operations on handover_notes" ON handover_notes;

-- labor_sales_snapshots
DROP POLICY IF EXISTS "Public can manage labor sales snapshots" ON labor_sales_snapshots;
DROP POLICY IF EXISTS "Public can view labor sales snapshots" ON labor_sales_snapshots;

-- labor_sales_targets
DROP POLICY IF EXISTS "Public can manage labor sales targets" ON labor_sales_targets;
DROP POLICY IF EXISTS "Public can view labor sales targets" ON labor_sales_targets;

-- mandatory_training_assignments
DROP POLICY IF EXISTS "Public can manage mandatory training" ON mandatory_training_assignments;
DROP POLICY IF EXISTS "Public can view mandatory training" ON mandatory_training_assignments;

-- performance_kpis
DROP POLICY IF EXISTS "Public can manage performance kpis" ON performance_kpis;
DROP POLICY IF EXISTS "Public can view performance kpis" ON performance_kpis;

-- performance_metrics
DROP POLICY IF EXISTS "Public can manage performance metrics" ON performance_metrics;
DROP POLICY IF EXISTS "Public can view performance metrics" ON performance_metrics;

-- position_capacity
DROP POLICY IF EXISTS "Allow all operations on position_capacity" ON position_capacity;

-- positions
DROP POLICY IF EXISTS "Allow all operations on positions" ON positions;

-- sales_data
DROP POLICY IF EXISTS "Allow all operations on sales_data" ON sales_data;

-- schedule_employees
DROP POLICY IF EXISTS "Allow all operations on schedule_employees" ON schedule_employees;

-- schedule_shifts
DROP POLICY IF EXISTS "Allow all operations on schedule_shifts" ON schedule_shifts;

-- shift_info
DROP POLICY IF EXISTS "Allow all operations on shift_info" ON shift_info;

-- shift_performance_scorecards
DROP POLICY IF EXISTS "Public can manage shift performance scorecards" ON shift_performance_scorecards;
DROP POLICY IF EXISTS "Public can view shift performance scorecards" ON shift_performance_scorecards;

-- shift_schedules
DROP POLICY IF EXISTS "Allow all operations on shift_schedules" ON shift_schedules;

-- staff
DROP POLICY IF EXISTS "Allow all operations on staff" ON staff;

-- staff_default_positions
DROP POLICY IF EXISTS "Allow all operations on staff_default_positions" ON staff_default_positions;

-- staff_fixed_closing_positions
DROP POLICY IF EXISTS "Public can manage fixed closing positions" ON staff_fixed_closing_positions;
DROP POLICY IF EXISTS "Public can view fixed closing positions" ON staff_fixed_closing_positions;

-- staff_locations
DROP POLICY IF EXISTS "Allow all operations on staff_locations" ON staff_locations;

-- staff_rankings
DROP POLICY IF EXISTS "Allow all operations on staff_rankings" ON staff_rankings;

-- staff_roles
DROP POLICY IF EXISTS "Allow all operations on staff_roles" ON staff_roles;

-- staff_sign_offs
DROP POLICY IF EXISTS "Allow all operations on staff_sign_offs" ON staff_sign_offs;

-- staff_training_stations
DROP POLICY IF EXISTS "Allow all operations on staff_training_stations" ON staff_training_stations;

-- staff_work_status
DROP POLICY IF EXISTS "Allow all operations on staff_work_status" ON staff_work_status;

-- station_position_mappings
DROP POLICY IF EXISTS "Public can manage station position mappings" ON station_position_mappings;
DROP POLICY IF EXISTS "Public can view station position mappings" ON station_position_mappings;

-- stations
DROP POLICY IF EXISTS "Public can manage stations" ON stations;
DROP POLICY IF EXISTS "Public can view stations" ON stations;

-- training_effectiveness_metrics
DROP POLICY IF EXISTS "Public can manage training effectiveness" ON training_effectiveness_metrics;
DROP POLICY IF EXISTS "Public can view training effectiveness" ON training_effectiveness_metrics;

-- training_plan_items
DROP POLICY IF EXISTS "Public can manage training plan items" ON training_plan_items;
DROP POLICY IF EXISTS "Public can view training plan items" ON training_plan_items;

-- training_plans
DROP POLICY IF EXISTS "Public can manage training plans" ON training_plans;
DROP POLICY IF EXISTS "Public can view training plans" ON training_plans;
