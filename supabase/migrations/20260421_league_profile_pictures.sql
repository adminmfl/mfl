-- Add league-specific profile picture support to users table
-- This migration adds columns for standard MFL profile pictures and league-specific overrides

-- Add standard profile picture column to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS standard_profile_picture_url TEXT;

-- Add league-specific profile picture column to leaguemembers table
ALTER TABLE leaguemembers 
ADD COLUMN IF NOT EXISTS league_profile_picture_url TEXT;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_standard_profile_picture 
ON users(standard_profile_picture_url) 
WHERE standard_profile_picture_url IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_leaguemembers_league_profile_picture 
ON leaguemembers(league_profile_picture_url) 
WHERE league_profile_picture_url IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN users.standard_profile_picture_url IS 'Standard MFL profile picture that carries across all leagues';
COMMENT ON COLUMN leaguemembers.league_profile_picture_url IS 'League-specific profile picture override (takes precedence over standard pic for that league)';