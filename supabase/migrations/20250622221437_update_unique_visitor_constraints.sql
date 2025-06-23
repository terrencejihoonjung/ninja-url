alter table "public"."unique_visitor" drop constraint "unique_visitor_fingerprint_key";

drop index if exists "public"."unique_visitor_fingerprint_key";

alter table "public"."unique_visitor" alter column "url_id" set not null;

CREATE UNIQUE INDEX unique_visitor_fingerprint_url_id_key ON public.unique_visitor USING btree (fingerprint, url_id);

alter table "public"."unique_visitor" add constraint "unique_visitor_fingerprint_url_id_key" UNIQUE using index "unique_visitor_fingerprint_url_id_key";


