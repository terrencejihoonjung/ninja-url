create policy "Update for all users"
on "public"."unique_visitor"
as permissive
for update
to public
using (true);



