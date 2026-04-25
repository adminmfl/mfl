-- Add photo_url column to messages table for team chat photo sharing
-- Issue #163: Team chat photo sharing

ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS photo_url text;

-- Allow messages with only photo (no text content)
ALTER TABLE public.messages 
DROP CONSTRAINT IF EXISTS messages_content_not_empty;

ALTER TABLE public.messages 
ADD CONSTRAINT messages_content_or_photo_required 
CHECK (char_length(content) > 0 OR photo_url IS NOT NULL);

COMMENT ON COLUMN public.messages.photo_url IS 'URL to photo attachment in Supabase storage (optional)';
