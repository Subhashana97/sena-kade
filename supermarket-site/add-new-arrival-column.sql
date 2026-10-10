-- Supabase SQL Editor eke New query ekak eken run karanna.
-- Me ekak witharai aluthin karanna one eka — "New Arrival" tag eka database ekata add karanawa.
alter table products add column if not exists new_arrival boolean not null default false;
notify pgrst, 'reload schema';
