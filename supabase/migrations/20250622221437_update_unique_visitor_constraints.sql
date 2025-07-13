-- Drop constraint if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'unique_visitor_fingerprint_key' 
        AND table_name = 'unique_visitor' 
        AND table_schema = 'public'
    ) THEN
        alter table "public"."unique_visitor" drop constraint "unique_visitor_fingerprint_key";
    END IF;
END
$$;

drop index if exists "public"."unique_visitor_fingerprint_key";

alter table "public"."unique_visitor" alter column "url_id" set not null;

CREATE UNIQUE INDEX IF NOT EXISTS unique_visitor_fingerprint_url_id_key ON public.unique_visitor USING btree (fingerprint, url_id);

-- Add unique constraint if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'unique_visitor_fingerprint_url_id_key' 
        AND table_name = 'unique_visitor' 
        AND constraint_type = 'UNIQUE'
    ) THEN
        alter table "public"."unique_visitor" add constraint "unique_visitor_fingerprint_url_id_key" UNIQUE using index "unique_visitor_fingerprint_url_id_key";
    END IF;
END
$$;


