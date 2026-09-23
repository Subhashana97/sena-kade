-- Supabase > SQL Editor ekata paste karala Run karanna
create table categories(id bigserial primary key,name text not null unique);
create table products(id bigserial primary key,name text not null,price int not null check(price>=0),
 tax numeric not null default 10,discount numeric not null default 0,available boolean not null default true,
 stock int not null default 0,category_id bigint references categories(id) on delete set null,
 image_url text,description text,sku text,created_at timestamptz default now());
create table orders(id bigserial primary key,customer_name text not null,phone text not null,address text,
 items jsonb not null,subtotal int not null,tax int not null,total int not null,
 status text not null default 'Pending',created_at timestamptz default now());
alter table categories enable row level security;
alter table products enable row level security;
alter table orders enable row level security;
create policy "public read cats" on categories for select using(true);
create policy "public read prods" on products for select using(true);
create policy "admin cats" on categories for all to authenticated using(true) with check(true);
create policy "admin prods" on products for all to authenticated using(true) with check(true);
create policy "anyone place order" on orders for insert to anon,authenticated with check(true);
create policy "admin orders" on orders for all to authenticated using(true) with check(true);
insert into storage.buckets(id,name,public) values('products','products',true);
create policy "public img read" on storage.objects for select using(bucket_id='products');
create policy "admin img write" on storage.objects for insert to authenticated with check(bucket_id='products');
