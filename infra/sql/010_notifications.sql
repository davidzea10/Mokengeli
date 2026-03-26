-- =============================================================================
-- MOKENGELI — notifications client (virements, etc.)
-- Exécuter sur la base Supabase / PostgreSQL après les tables clients / comptes.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.notifications_client (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients (id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('transfer_sent', 'transfer_received')),
  lu boolean NOT NULL DEFAULT false,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_client_created
  ON public.notifications_client (client_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_client_unread
  ON public.notifications_client (client_id)
  WHERE lu = false;

COMMENT ON TABLE public.notifications_client IS 'Centre de notifications par client (messagerie métier).';
