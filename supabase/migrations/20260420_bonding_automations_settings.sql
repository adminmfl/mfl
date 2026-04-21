-- Add bonding automation settings to leagues table
-- Allows hosts to enable/disable automated team bonding messages

ALTER TABLE leagues ADD COLUMN IF NOT EXISTS bonding_automations_enabled BOOLEAN DEFAULT true;

COMMENT ON COLUMN leagues.bonding_automations_enabled IS 'When true, automated team bonding messages are sent at key lifecycle moments (team reveal, captain intro, first day)';
