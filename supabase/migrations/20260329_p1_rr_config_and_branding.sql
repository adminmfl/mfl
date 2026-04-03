-- P1 Migration: RR Config + League Branding
-- Run this in Supabase SQL Editor

-- Phase 6: Add RR configuration to leagues
ALTER TABLE leagues ADD COLUMN IF NOT EXISTS rr_config JSONB DEFAULT '{"formula":"standard"}'::jsonb;

-- Phase 7: Add branding configuration to leagues
ALTER TABLE leagues ADD COLUMN IF NOT EXISTS branding JSONB DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN leagues.rr_config IS 'RR calculation config: formula (standard|simple|points_only), base_duration, distance_divisor, steps_min, steps_max, age_adjustments';
COMMENT ON COLUMN leagues.branding IS 'White-label branding: display_name, tagline, primary_color, logo_url, powered_by_visible';
