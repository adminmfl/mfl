-- =====================================================================================
-- Migration: Message Reactions
-- Description: Adds emoji reactions to messages
-- =====================================================================================

CREATE TABLE IF NOT EXISTS public.message_reactions (
  reaction_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.messages(message_id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
  emoji varchar(10) NOT NULL,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT unique_reaction_per_user UNIQUE (message_id, user_id, emoji)
);

CREATE INDEX idx_reactions_message ON public.message_reactions(message_id);
CREATE INDEX idx_reactions_user ON public.message_reactions(user_id);

COMMENT ON TABLE public.message_reactions IS 'Emoji reactions on messages';

-- RLS
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

-- Anyone in the league can see reactions on messages they can see
CREATE POLICY reactions_select ON public.message_reactions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM messages m
      WHERE m.message_id = message_reactions.message_id
        AND is_member_of_league(auth.uid(), m.league_id)
    )
  );

-- Users can add their own reactions
CREATE POLICY reactions_insert ON public.message_reactions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can remove their own reactions
CREATE POLICY reactions_delete ON public.message_reactions
  FOR DELETE
  USING (auth.uid() = user_id);

-- Grants
GRANT SELECT, INSERT, DELETE ON public.message_reactions TO authenticated;

-- Realtime for live reaction updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions;
