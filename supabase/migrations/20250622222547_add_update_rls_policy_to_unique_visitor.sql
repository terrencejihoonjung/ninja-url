-- Create policy if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE policyname = 'Update for all users' 
        AND tablename = 'unique_visitor'
    ) THEN
        create policy "Update for all users"
        on "public"."unique_visitor"
        as permissive
        for update
        to public
        using (true);
    END IF;
END
$$;



