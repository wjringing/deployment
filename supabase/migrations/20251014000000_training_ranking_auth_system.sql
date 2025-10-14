/*
  # Training & Ranking System with Authentication

  1. Complete Database Schema
    - Staff table (employee records with Gem ID)
    - Training stations master (station definitions)
    - Staff training stations (training records)
    - Staff rankings (performance ratings 1-5 stars)
    - Staff sign-offs (manager certifications)

  2. Security
    - Row Level Security enabled on all tables
    - Authenticated users only policies
    - Proper indexes for performance

  3. Functions
    - get_trained_staff_for_station: Query trained staff with ratings

  4. Features
    - CSV import support
    - Manager sign-offs
    - Performance rankings (1-5 scale)
    - Station-based training tracking
*/

-- ================================================
-- 1. STAFF TABLE (Employee Records)
-- ================================================

-- Drop existing staff table if exists (clean slate)
DROP TABLE IF EXISTS public.staff_sign_offs CASCADE;
DROP TABLE IF EXISTS public.staff_rankings CASCADE;
DROP TABLE IF EXISTS public.staff_training_stations CASCADE;
DROP TABLE IF EXISTS public.training_stations_master CASCADE;
DROP TABLE IF EXISTS public.staff CASCADE;

CREATE TABLE public.staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gem_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  position TEXT NOT NULL DEFAULT 'Team Member',
  is_under_18 BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on staff table
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;

-- RLS Policies for staff (authenticated users only)
CREATE POLICY "Authenticated users can view staff"
  ON public.staff FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert staff"
  ON public.staff FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update staff"
  ON public.staff FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete staff"
  ON public.staff FOR DELETE
  TO authenticated
  USING (true);

-- Index for faster lookups
CREATE INDEX idx_staff_gem_id ON public.staff(gem_id);
CREATE INDEX idx_staff_position ON public.staff(position);

-- ================================================
-- 2. TRAINING STATIONS MASTER (Station Definitions)
-- ================================================
CREATE TABLE public.training_stations_master (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  station_name TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  station_category TEXT NOT NULL CHECK (station_category IN ('BOH', 'FOH', 'MOH')),
  description TEXT DEFAULT '',
  requires_age_18_plus BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.training_stations_master ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on training_stations_master"
  ON public.training_stations_master FOR ALL
  TO authenticated
  USING (true);

-- Seed data for stations
INSERT INTO public.training_stations_master (station_name, display_name, station_category, sort_order) VALUES
  ('BOH Cook', 'BOH Cook', 'BOH', 1),
  ('FOH Cashier', 'FOH Cashier', 'FOH', 2),
  ('FOH Guest Host', 'FOH Guest Host', 'FOH', 3),
  ('FOH Pack', 'FOH Pack', 'FOH', 4),
  ('FOH Present', 'FOH Present', 'FOH', 5),
  ('MOH Burgers', 'MOH Burgers', 'MOH', 6),
  ('MOH Chicken Pack', 'MOH Chicken Pack', 'MOH', 7),
  ('Freezer to Fryer', 'Freezer to Fryer', 'MOH', 8),
  ('MOH Sides', 'MOH Sides', 'MOH', 9);

-- ================================================
-- 3. STAFF TRAINING STATIONS (Training Records)
-- ================================================
CREATE TABLE public.staff_training_stations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  station_name TEXT NOT NULL,
  is_trained BOOLEAN DEFAULT false,
  is_primary_station BOOLEAN DEFAULT false,
  trained_date TIMESTAMPTZ,
  job_code TEXT DEFAULT 'Team Member',
  training_notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(staff_id, station_name)
);

ALTER TABLE public.staff_training_stations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on staff_training_stations"
  ON public.staff_training_stations FOR ALL
  TO authenticated
  USING (true);

CREATE INDEX idx_training_staff_id ON public.staff_training_stations(staff_id);
CREATE INDEX idx_training_station ON public.staff_training_stations(station_name);

-- ================================================
-- 4. STAFF RANKINGS (Performance Ratings 1-5)
-- ================================================
CREATE TABLE public.staff_rankings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  rater_staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  station_name TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  rating_notes TEXT DEFAULT '',
  rating_date TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.staff_rankings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on staff_rankings"
  ON public.staff_rankings FOR ALL
  TO authenticated
  USING (true);

CREATE INDEX idx_rankings_staff_id ON public.staff_rankings(staff_id);
CREATE INDEX idx_rankings_rater_id ON public.staff_rankings(rater_staff_id);
CREATE INDEX idx_rankings_station ON public.staff_rankings(station_name);

-- ================================================
-- 5. STAFF SIGN-OFFS (Manager Certifications)
-- ================================================
CREATE TABLE public.staff_sign_offs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  station_name TEXT NOT NULL,
  manager_staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  sign_off_notes TEXT DEFAULT '',
  sign_off_date TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.staff_sign_offs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on staff_sign_offs"
  ON public.staff_sign_offs FOR ALL
  TO authenticated
  USING (true);

CREATE INDEX idx_signoffs_staff_id ON public.staff_sign_offs(staff_id);
CREATE INDEX idx_signoffs_station ON public.staff_sign_offs(station_name);

-- ================================================
-- 6. DATABASE FUNCTIONS
-- ================================================

-- Function: Get trained staff for a station
CREATE OR REPLACE FUNCTION public.get_trained_staff_for_station(
  target_station text,
  minimum_rating integer DEFAULT 1,
  exclude_under_18 boolean DEFAULT false
)
RETURNS TABLE(
  staff_id uuid,
  staff_name text,
  is_under_18 boolean,
  job_code text,
  is_primary_station boolean,
  trained_date timestamptz,
  average_rating numeric,
  total_ratings bigint,
  has_sign_off boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
    SELECT
      s.id as staff_id,
      s.name as staff_name,
      s.is_under_18,
      sts.job_code,
      sts.is_primary_station,
      sts.trained_date,
      COALESCE(AVG(sr.rating), 0) as average_rating,
      COUNT(sr.id) as total_rankings,
      EXISTS(
        SELECT 1 FROM staff_sign_offs sso
        WHERE sso.staff_id = s.id
          AND sso.station_name = target_station
      ) as has_sign_off
    FROM staff s
    INNER JOIN staff_training_stations sts ON s.id = sts.staff_id
    LEFT JOIN staff_rankings sr ON s.id = sr.staff_id AND sr.station_name = target_station
    WHERE sts.station_name = target_station
      AND sts.is_trained = true
      AND (NOT exclude_under_18 OR s.is_under_18 = false)
    GROUP BY s.id, s.name, s.is_under_18, sts.job_code, sts.is_primary_station, sts.trained_date
    HAVING COALESCE(AVG(sr.rating), 0) >= minimum_rating
    ORDER BY average_rating DESC, sts.is_primary_station DESC, sts.trained_date ASC;
END;
$$;
