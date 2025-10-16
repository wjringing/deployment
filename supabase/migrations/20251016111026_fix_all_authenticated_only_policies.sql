/*
  # Fix All Authenticated-Only Policies to Public Access

  ## Problem
  Multiple tables have RLS policies for authenticated users only, but the application
  uses public access (consistent with the majority of tables in the system).
  
  ## Tables Fixed
  - labor_sales_snapshots
  - labor_sales_targets
  - performance_kpis
  - performance_metrics
  - shift_performance_scorecards
  - station_position_mappings
  - stations
  
  ## Solution
  Replace authenticated-only policies with public access policies for consistency.
  
  ## Security Note
  This maintains consistency with the existing system architecture where all tables
  use public access. Consider implementing role-based access control in future.
*/

-- ============================================================================
-- labor_sales_snapshots
-- ============================================================================

DROP POLICY IF EXISTS "Users can view labor sales snapshots" ON labor_sales_snapshots;
DROP POLICY IF EXISTS "Users can insert labor sales snapshots" ON labor_sales_snapshots;
DROP POLICY IF EXISTS "Users can update labor sales snapshots" ON labor_sales_snapshots;
DROP POLICY IF EXISTS "Users can delete labor sales snapshots" ON labor_sales_snapshots;

CREATE POLICY "Public can view labor sales snapshots"
  ON labor_sales_snapshots FOR SELECT TO public USING (true);

CREATE POLICY "Public can manage labor sales snapshots"
  ON labor_sales_snapshots FOR ALL TO public USING (true) WITH CHECK (true);

-- ============================================================================
-- labor_sales_targets
-- ============================================================================

DROP POLICY IF EXISTS "Users can view labor sales targets" ON labor_sales_targets;
DROP POLICY IF EXISTS "Users can insert labor sales targets" ON labor_sales_targets;
DROP POLICY IF EXISTS "Users can update labor sales targets" ON labor_sales_targets;
DROP POLICY IF EXISTS "Users can delete labor sales targets" ON labor_sales_targets;

CREATE POLICY "Public can view labor sales targets"
  ON labor_sales_targets FOR SELECT TO public USING (true);

CREATE POLICY "Public can manage labor sales targets"
  ON labor_sales_targets FOR ALL TO public USING (true) WITH CHECK (true);

-- ============================================================================
-- performance_kpis
-- ============================================================================

DROP POLICY IF EXISTS "Users can view performance kpis" ON performance_kpis;
DROP POLICY IF EXISTS "Users can insert performance kpis" ON performance_kpis;
DROP POLICY IF EXISTS "Users can update performance kpis" ON performance_kpis;
DROP POLICY IF EXISTS "Users can delete performance kpis" ON performance_kpis;

CREATE POLICY "Public can view performance kpis"
  ON performance_kpis FOR SELECT TO public USING (true);

CREATE POLICY "Public can manage performance kpis"
  ON performance_kpis FOR ALL TO public USING (true) WITH CHECK (true);

-- ============================================================================
-- performance_metrics
-- ============================================================================

DROP POLICY IF EXISTS "Users can view performance metrics" ON performance_metrics;
DROP POLICY IF EXISTS "Users can insert performance metrics" ON performance_metrics;
DROP POLICY IF EXISTS "Users can update performance metrics" ON performance_metrics;
DROP POLICY IF EXISTS "Users can delete performance metrics" ON performance_metrics;

CREATE POLICY "Public can view performance metrics"
  ON performance_metrics FOR SELECT TO public USING (true);

CREATE POLICY "Public can manage performance metrics"
  ON performance_metrics FOR ALL TO public USING (true) WITH CHECK (true);

-- ============================================================================
-- shift_performance_scorecards
-- ============================================================================

DROP POLICY IF EXISTS "Users can view shift performance scorecards" ON shift_performance_scorecards;
DROP POLICY IF EXISTS "Users can insert shift performance scorecards" ON shift_performance_scorecards;
DROP POLICY IF EXISTS "Users can update shift performance scorecards" ON shift_performance_scorecards;
DROP POLICY IF EXISTS "Users can delete shift performance scorecards" ON shift_performance_scorecards;

CREATE POLICY "Public can view shift performance scorecards"
  ON shift_performance_scorecards FOR SELECT TO public USING (true);

CREATE POLICY "Public can manage shift performance scorecards"
  ON shift_performance_scorecards FOR ALL TO public USING (true) WITH CHECK (true);

-- ============================================================================
-- station_position_mappings
-- ============================================================================

DROP POLICY IF EXISTS "Users can view station position mappings" ON station_position_mappings;
DROP POLICY IF EXISTS "Users can insert station position mappings" ON station_position_mappings;
DROP POLICY IF EXISTS "Users can update station position mappings" ON station_position_mappings;
DROP POLICY IF EXISTS "Users can delete station position mappings" ON station_position_mappings;

CREATE POLICY "Public can view station position mappings"
  ON station_position_mappings FOR SELECT TO public USING (true);

CREATE POLICY "Public can manage station position mappings"
  ON station_position_mappings FOR ALL TO public USING (true) WITH CHECK (true);

-- ============================================================================
-- stations
-- ============================================================================

DROP POLICY IF EXISTS "Users can view stations" ON stations;
DROP POLICY IF EXISTS "Users can insert stations" ON stations;
DROP POLICY IF EXISTS "Users can update stations" ON stations;
DROP POLICY IF EXISTS "Users can delete stations" ON stations;

CREATE POLICY "Public can view stations"
  ON stations FOR SELECT TO public USING (true);

CREATE POLICY "Public can manage stations"
  ON stations FOR ALL TO public USING (true) WITH CHECK (true);
