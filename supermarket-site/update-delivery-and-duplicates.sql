-- Supabase SQL Editor eke New query ekak eken me ekama RUN karanna.
-- 1) orders table ekata delivery date/time columns add karanawa
alter table orders add column if not exists delivery_date date;
alter table orders add column if not exists delivery_time text;

-- 2) place_order function eka delivery date/time ekath ekka aluthin hadanawa
create or replace function place_order(
  p_name text, p_phone text, p_address text, p_items jsonb,
  p_sub int, p_tax int, p_total int,
  p_delivery_date date default null, p_delivery_time text default null
)
returns orders
language sql
security definer
set search_path=public
as $$
  insert into orders(customer_name,phone,address,items,subtotal,tax,total,delivery_date,delivery_time)
  values(p_name,p_phone,p_address,p_items,p_sub,p_tax,p_total,p_delivery_date,p_delivery_time)
  returning *;
$$;
grant execute on function place_order(text,text,text,jsonb,int,int,int,date,text) to anon,authenticated;

-- 3) Dedicated product nama eka (eg. "Araliya Rice" dedak) add karanna ba kiyana eka fix karanawa.
--    Oyage products table eke 'name' column ekata accidentally UNIQUE constraint ekak daala thibenawanam, eka ain karanawa.
--    Constraint ekak nathnam, me step eka harmless widiyata "does not exist, skipping" kiyala pennai.
alter table products drop constraint if exists products_name_key;
alter table products drop constraint if exists products_name_unique;
drop index if exists products_name_key;
drop index if exists products_name_idx;

notify pgrst, 'reload schema';
