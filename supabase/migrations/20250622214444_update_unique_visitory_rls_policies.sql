-- Create policy if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE policyname = 'Enable insert for all users' 
        AND tablename = 'unique_visitor'
    ) THEN
        create policy "Enable insert for all users"
        on "public"."unique_visitor"
        as permissive
        for insert
        to public
        with check (true);
    END IF;
END
$$;


-- Create policy if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE policyname = 'Enable read access for all authenticated users only' 
        AND tablename = 'unique_visitor'
    ) THEN
        create policy "Enable read access for all authenticated users only"
        on "public"."unique_visitor"
        as permissive
        for select
        to authenticated
        using (true);
    END IF;
END
$$;



