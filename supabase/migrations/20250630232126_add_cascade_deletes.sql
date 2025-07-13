-- Drop and recreate unique_visitor foreign key with cascade delete
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'unique_visitor_url_id_fkey' 
        AND table_name = 'unique_visitor' 
        AND constraint_type = 'FOREIGN KEY'
    ) THEN
        alter table "public"."unique_visitor" drop constraint "unique_visitor_url_id_fkey";
    END IF;
    
    alter table "public"."unique_visitor" add constraint "unique_visitor_url_id_fkey" FOREIGN KEY (url_id) REFERENCES url(id) ON DELETE CASCADE not valid;
    alter table "public"."unique_visitor" validate constraint "unique_visitor_url_id_fkey";
END
$$;

-- Drop and recreate url_metric foreign key with cascade delete
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'url_metric_url_id_fkey' 
        AND table_name = 'url_metric' 
        AND constraint_type = 'FOREIGN KEY'
    ) THEN
        alter table "public"."url_metric" drop constraint "url_metric_url_id_fkey";
    END IF;
    
    alter table "public"."url_metric" add constraint "url_metric_url_id_fkey" FOREIGN KEY (url_id) REFERENCES url(id) ON DELETE CASCADE not valid;
    alter table "public"."url_metric" validate constraint "url_metric_url_id_fkey";
END
$$;


