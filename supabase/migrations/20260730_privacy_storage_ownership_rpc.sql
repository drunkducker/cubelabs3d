-- Service-role-only helper used before hard-deleting an Auth user.
-- Storage objects must be removed through the Storage API, not by deleting rows.
create or replace function public.privacy_owned_storage_objects(target_user uuid)
returns table(bucket_id text, name text)
language sql
security definer
set search_path = pg_catalog, storage, public
as $$
  select o.bucket_id, o.name
  from storage.objects o
  where o.owner_id = target_user::text
  order by o.bucket_id, o.name;
$$;

revoke all on function public.privacy_owned_storage_objects(uuid) from public;
revoke all on function public.privacy_owned_storage_objects(uuid) from anon;
revoke all on function public.privacy_owned_storage_objects(uuid) from authenticated;
grant execute on function public.privacy_owned_storage_objects(uuid) to service_role;
