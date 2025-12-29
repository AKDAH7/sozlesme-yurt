-- Add new tracking_status enum values for residence file flow.

DO $$ BEGIN
  ALTER TYPE tracking_status ADD VALUE 'residence_file_delivered';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TYPE tracking_status ADD VALUE 'residence_file_received';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
