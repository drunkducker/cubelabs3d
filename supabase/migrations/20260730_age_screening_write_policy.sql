create unique index if not exists age_screenings_user_source_unique
  on public.age_screenings (user_id, source);

grant insert on public.age_screenings to authenticated;

drop policy if exists age_screenings_owner_insert on public.age_screenings;
create policy age_screenings_owner_insert
on public.age_screenings for insert to authenticated
with check (
  (select auth.uid()) = user_id
  and source = 'signup'
  and age_band in ('13_17','18_plus')
);
