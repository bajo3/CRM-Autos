-- Tasks upgrade (fields + indexes + RLS) — safe
-- Creates/extends public.tasks and adds useful indexes + policies.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- updated_at helper
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'set_updated_at'
  ) THEN
    CREATE FUNCTION public.set_updated_at()
    RETURNS trigger
    LANGUAGE plpgsql
    AS $fn$
    BEGIN
      NEW.updated_at := now();
      RETURN NEW;
    END
    $fn$;
  END IF;
END $$;

-- Ensure tasks table exists
CREATE TABLE IF NOT EXISTS public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dealership_id uuid NOT NULL DEFAULT public.current_dealership_id(),
  created_by uuid NULL DEFAULT auth.uid(),
  assigned_to uuid NULL,
  audience text NOT NULL DEFAULT 'private', -- private | team

  title text NOT NULL,
  description text NULL,

  priority text NOT NULL DEFAULT 'medium', -- low | medium | high
  status text NOT NULL DEFAULT 'open',     -- open | done | canceled

  due_at timestamptz NULL,
  done_at timestamptz NULL,
  canceled_at timestamptz NULL,

  entity_type text NULL, -- lead | vehicle | credit | client
  entity_id uuid NULL,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add missing columns safely
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='tasks' AND column_name='canceled_at') THEN
    ALTER TABLE public.tasks ADD COLUMN canceled_at timestamptz NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='tasks' AND column_name='entity_type') THEN
    ALTER TABLE public.tasks ADD COLUMN entity_type text NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='tasks' AND column_name='entity_id') THEN
    ALTER TABLE public.tasks ADD COLUMN entity_id uuid NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='tasks' AND column_name='description') THEN
    ALTER TABLE public.tasks ADD COLUMN description text NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='tasks' AND column_name='priority') THEN
    ALTER TABLE public.tasks ADD COLUMN priority text NOT NULL DEFAULT 'medium';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='tasks' AND column_name='status') THEN
    ALTER TABLE public.tasks ADD COLUMN status text NOT NULL DEFAULT 'open';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='tasks' AND column_name='audience') THEN
    ALTER TABLE public.tasks ADD COLUMN audience text NOT NULL DEFAULT 'private';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='tasks' AND column_name='due_at') THEN
    ALTER TABLE public.tasks ADD COLUMN due_at timestamptz NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='tasks' AND column_name='done_at') THEN
    ALTER TABLE public.tasks ADD COLUMN done_at timestamptz NULL;
  END IF;
END $$;

-- Basic constraints (idempotent-ish)
DO $$
BEGIN
  -- audience
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tasks_audience_check'
  ) THEN
    ALTER TABLE public.tasks ADD CONSTRAINT tasks_audience_check CHECK (audience IN ('private','team'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tasks_priority_check'
  ) THEN
    ALTER TABLE public.tasks ADD CONSTRAINT tasks_priority_check CHECK (priority IN ('low','medium','high'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tasks_status_check'
  ) THEN
    ALTER TABLE public.tasks ADD CONSTRAINT tasks_status_check CHECK (status IN ('open','done','canceled'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tasks_entity_type_check'
  ) THEN
    ALTER TABLE public.tasks ADD CONSTRAINT tasks_entity_type_check CHECK (entity_type IS NULL OR entity_type IN ('lead','vehicle','credit','client'));
  END IF;
END $$;

-- Trigger updated_at
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'tasks_set_updated_at') THEN
    CREATE TRIGGER tasks_set_updated_at
    BEFORE UPDATE ON public.tasks
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tasks_dealership_status_due ON public.tasks (dealership_id, status, due_at);
CREATE INDEX IF NOT EXISTS idx_tasks_dealership_assignee_due ON public.tasks (dealership_id, assigned_to, status, due_at);
CREATE INDEX IF NOT EXISTS idx_tasks_dealership_created_by ON public.tasks (dealership_id, created_by);

-- RLS
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Policies: safest defaults for multi-tenant.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='tasks' AND policyname='tasks_select') THEN
    CREATE POLICY tasks_select ON public.tasks
      FOR SELECT
      USING (
        dealership_id = public.current_dealership_id()
        AND (
          audience = 'team'
          OR created_by = auth.uid()
          OR assigned_to = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='tasks' AND policyname='tasks_insert') THEN
    CREATE POLICY tasks_insert ON public.tasks
      FOR INSERT
      WITH CHECK (
        dealership_id = public.current_dealership_id()
        AND created_by = auth.uid()
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='tasks' AND policyname='tasks_update') THEN
    CREATE POLICY tasks_update ON public.tasks
      FOR UPDATE
      USING (
        dealership_id = public.current_dealership_id()
        AND (
          created_by = auth.uid()
          OR assigned_to = auth.uid()
          OR audience = 'team'
        )
      )
      WITH CHECK (
        dealership_id = public.current_dealership_id()
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='tasks' AND policyname='tasks_delete') THEN
    CREATE POLICY tasks_delete ON public.tasks
      FOR DELETE
      USING (
        dealership_id = public.current_dealership_id()
        AND created_by = auth.uid()
      );
  END IF;
END $$;
