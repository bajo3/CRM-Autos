-- CRM Autos — Events + Vehicle statuses + Audit
-- Safe migration: tries not to break existing schemas.

-- 1) Extend vehicle status enum, if it exists.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'vehicle_status') THEN
    BEGIN
      ALTER TYPE vehicle_status ADD VALUE IF NOT EXISTS 'incoming';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER TYPE vehicle_status ADD VALUE IF NOT EXISTS 'preparing';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;

-- 2) Generic events table
CREATE TABLE IF NOT EXISTS public.crm_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dealership_id uuid NULL,
  entity_type text NOT NULL CHECK (entity_type IN ('lead','vehicle','credit','client')),
  entity_id uuid NOT NULL,
  type text NOT NULL,
  payload jsonb NULL,
  created_by uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS crm_events_entity_idx ON public.crm_events (entity_type, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS crm_events_dealership_idx ON public.crm_events (dealership_id, created_at DESC);

-- Ensure RLS
ALTER TABLE public.crm_events ENABLE ROW LEVEL SECURITY;

-- helper: get current user's dealership
CREATE OR REPLACE FUNCTION public.current_dealership_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT p.dealership_id
  FROM public.profiles p
  WHERE p.user_id = auth.uid()
  LIMIT 1;
$$;

-- set defaults on insert
CREATE OR REPLACE FUNCTION public.crm_events_set_defaults()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.created_by IS NULL THEN
    NEW.created_by := auth.uid();
  END IF;
  IF NEW.dealership_id IS NULL THEN
    NEW.dealership_id := public.current_dealership_id();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_crm_events_set_defaults ON public.crm_events;
CREATE TRIGGER trg_crm_events_set_defaults
BEFORE INSERT ON public.crm_events
FOR EACH ROW EXECUTE FUNCTION public.crm_events_set_defaults();

-- Policies
DROP POLICY IF EXISTS "crm_events_select" ON public.crm_events;
CREATE POLICY "crm_events_select"
ON public.crm_events
FOR SELECT
USING (dealership_id = public.current_dealership_id());

DROP POLICY IF EXISTS "crm_events_insert" ON public.crm_events;
CREATE POLICY "crm_events_insert"
ON public.crm_events
FOR INSERT
WITH CHECK (dealership_id = public.current_dealership_id());

-- No UPDATE/DELETE by default.

-- 3) Audit logs (admin only view)
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dealership_id uuid NULL,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  action text NOT NULL,
  old_data jsonb NULL,
  new_data jsonb NULL,
  created_by uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS audit_logs_entity_idx ON public.audit_logs (entity_type, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_dealership_idx ON public.audit_logs (dealership_id, created_at DESC);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- admin/manager check
CREATE OR REPLACE FUNCTION public.is_admin_or_manager()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE((SELECT (p.role IN ('admin','manager')) FROM public.profiles p WHERE p.user_id = auth.uid() LIMIT 1), false);
$$;

DROP POLICY IF EXISTS "audit_logs_select_admin" ON public.audit_logs;
CREATE POLICY "audit_logs_select_admin"
ON public.audit_logs
FOR SELECT
USING (
  dealership_id = public.current_dealership_id()
  AND public.is_admin_or_manager()
);

DROP POLICY IF EXISTS "audit_logs_insert" ON public.audit_logs;
CREATE POLICY "audit_logs_insert"
ON public.audit_logs
FOR INSERT
WITH CHECK (dealership_id = public.current_dealership_id());

CREATE OR REPLACE FUNCTION public.audit_set_defaults()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.created_by IS NULL THEN
    NEW.created_by := auth.uid();
  END IF;
  IF NEW.dealership_id IS NULL THEN
    NEW.dealership_id := public.current_dealership_id();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_set_defaults ON public.audit_logs;
CREATE TRIGGER trg_audit_set_defaults
BEFORE INSERT ON public.audit_logs
FOR EACH ROW EXECUTE FUNCTION public.audit_set_defaults();

-- 4) Audit triggers (safe: only if tables exist)
CREATE OR REPLACE FUNCTION public.audit_vehicle_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF (NEW.status IS DISTINCT FROM OLD.status) OR (NEW.price_ars IS DISTINCT FROM OLD.price_ars) THEN
      INSERT INTO public.audit_logs(entity_type, entity_id, action, old_data, new_data)
      VALUES(
        'vehicle',
        NEW.id,
        'vehicle_update',
        jsonb_build_object('status', OLD.status, 'price_ars', OLD.price_ars),
        jsonb_build_object('status', NEW.status, 'price_ars', NEW.price_ars)
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='vehicles') THEN
    DROP TRIGGER IF EXISTS trg_audit_vehicle_changes ON public.vehicles;
    CREATE TRIGGER trg_audit_vehicle_changes
    AFTER UPDATE ON public.vehicles
    FOR EACH ROW EXECUTE FUNCTION public.audit_vehicle_changes();
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.audit_credit_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF (NEW.status IS DISTINCT FROM OLD.status) OR (NEW.closed_at IS DISTINCT FROM OLD.closed_at) THEN
      INSERT INTO public.audit_logs(entity_type, entity_id, action, old_data, new_data)
      VALUES(
        'credit',
        NEW.id,
        'credit_update',
        jsonb_build_object('status', OLD.status, 'closed_at', OLD.closed_at),
        jsonb_build_object('status', NEW.status, 'closed_at', NEW.closed_at)
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='credits') THEN
    DROP TRIGGER IF EXISTS trg_audit_credit_changes ON public.credits;
    CREATE TRIGGER trg_audit_credit_changes
    AFTER UPDATE ON public.credits
    FOR EACH ROW EXECUTE FUNCTION public.audit_credit_changes();
  END IF;
END $$;


CREATE OR REPLACE FUNCTION public.audit_lead_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF (NEW.stage IS DISTINCT FROM OLD.stage) OR (NEW.assigned_to IS DISTINCT FROM OLD.assigned_to) THEN
      INSERT INTO public.audit_logs(entity_type, entity_id, action, old_data, new_data)
      VALUES(
        'lead',
        NEW.id,
        'lead_update',
        jsonb_build_object('stage', OLD.stage, 'assigned_to', OLD.assigned_to),
        jsonb_build_object('stage', NEW.stage, 'assigned_to', NEW.assigned_to)
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='leads') THEN
    DROP TRIGGER IF EXISTS trg_audit_lead_changes ON public.leads;
    CREATE TRIGGER trg_audit_lead_changes
    AFTER UPDATE ON public.leads
    FOR EACH ROW EXECUTE FUNCTION public.audit_lead_changes();
  END IF;
END $$;
