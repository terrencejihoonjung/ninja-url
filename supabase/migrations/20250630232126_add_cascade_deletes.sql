alter table "public"."unique_visitor" drop constraint "unique_visitor_url_id_fkey";

alter table "public"."url_metric" drop constraint "url_metric_url_id_fkey";

alter table "public"."unique_visitor" add constraint "unique_visitor_url_id_fkey" FOREIGN KEY (url_id) REFERENCES url(id) ON DELETE CASCADE not valid;

alter table "public"."unique_visitor" validate constraint "unique_visitor_url_id_fkey";

alter table "public"."url_metric" add constraint "url_metric_url_id_fkey" FOREIGN KEY (url_id) REFERENCES url(id) ON DELETE CASCADE not valid;

alter table "public"."url_metric" validate constraint "url_metric_url_id_fkey";


