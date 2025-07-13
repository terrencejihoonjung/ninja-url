-- Drop column if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'url_metric' 
        AND column_name = 'unique_visitors'
        AND table_schema = 'public'
    ) THEN
        alter table "public"."url_metric" drop column "unique_visitors";
    END IF;
END
$$;


