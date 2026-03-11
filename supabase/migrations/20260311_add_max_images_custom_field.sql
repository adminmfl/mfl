-- Add max_images and custom_field_label to leagueactivities
ALTER TABLE leagueactivities ADD COLUMN IF NOT EXISTS max_images integer DEFAULT 1;
ALTER TABLE leagueactivities ADD COLUMN IF NOT EXISTS custom_field_label text DEFAULT NULL;

-- Add proof_url_2 and custom_field_value to effortentry
ALTER TABLE effortentry ADD COLUMN IF NOT EXISTS proof_url_2 varchar DEFAULT NULL;
ALTER TABLE effortentry ADD COLUMN IF NOT EXISTS custom_field_value text DEFAULT NULL;
