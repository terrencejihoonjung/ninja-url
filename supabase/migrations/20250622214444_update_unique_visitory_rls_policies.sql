create policy "Enable insert for all users"
on "public"."unique_visitor"
as permissive
for insert
to public
with check (true);


create policy "Enable read access for all authenticated users only"
on "public"."unique_visitor"
as permissive
for select
to authenticated
using (true);



