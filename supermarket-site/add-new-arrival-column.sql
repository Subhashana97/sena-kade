-- Supabase SQL Editor eke New query ekak eken run karanna (kalin run karala nathnam witharak)
alter table products add column if not exists new_arrival boolean not null default false;
notify pgrst, 'reload schema';
